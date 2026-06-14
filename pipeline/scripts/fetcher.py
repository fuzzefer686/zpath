"""Shared HTTP fetch helper with SSL and headless-browser fallbacks.

Two fallbacks, both used only when needed (never by default):
  1. SSL: many Vietnamese .edu.vn sites ship bad certificate chains. We verify
     by default and only retry with verification off on a cert error.
  2. JS rendering: some sites return an empty shell / anti-bot cookie wall to
     plain requests (e.g. daotao.neu.edu.vn). When the requests result is
     empty/too short, we re-fetch once with Playwright (Chromium) so JS runs.

Callers use resp.text / resp.content / resp.url / resp.headers / resp.via.
"""

from __future__ import annotations

import warnings
from urllib.parse import urlparse

import requests
import urllib3

HTTP_TIMEOUT = 30  # seconds
# Below either threshold, the requests result looks empty -> try Playwright.
MIN_BYTES = 500
MIN_TEXT_CHARS = 100
PLAYWRIGHT_WAIT_MS = 5000

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
_HEADERS = {"User-Agent": USER_AGENT, "Accept-Language": "vi,en;q=0.8"}

# In-memory fetch cache (one run). Avoids re-fetching the same URL across tiers
# (e.g. landing page used by both extraction and landing-PDF scanning), which
# matters most when a fetch needs the slow Playwright path. Cleared per school.
_CACHE: dict[str, object] = {}


def clear_cache() -> None:
    _CACHE.clear()


class PlaywrightResponse:
    """Minimal requests.Response-compatible wrapper around rendered HTML."""

    def __init__(self, html: str, url: str):
        self.text = html
        self.content = html.encode("utf-8", "replace")
        self.url = url
        self.status_code = 200
        self.headers = {"content-type": "text/html; charset=utf-8"}
        self.via = "playwright"

    def raise_for_status(self):  # already validated by Playwright navigation
        return None


def text_length(html: str) -> int:
    """Length of visible text after stripping scripts/styles (lazy bs4 import)."""
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    return len(soup.get_text(" ", strip=True))


def _get(url: str, timeout: int, verify: bool) -> requests.Response:
    return requests.get(
        url, headers=_HEADERS, timeout=timeout, allow_redirects=True, verify=verify
    )


def fetch_with_playwright(url: str, wait_ms: int = PLAYWRIGHT_WAIT_MS) -> PlaywrightResponse:
    """Render a URL in headless Chromium and return the post-JS HTML."""
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page(user_agent=USER_AGENT)
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            try:
                page.wait_for_load_state("networkidle", timeout=wait_ms)
            except Exception:  # noqa: BLE001 — networkidle may never settle
                page.wait_for_timeout(2000)
            html = page.content()
            final_url = page.url
        finally:
            browser.close()
    return PlaywrightResponse(html, final_url)


def fetch(url: str, timeout: int = HTTP_TIMEOUT, allow_playwright: bool = True):
    """Fetch a URL via requests, with SSL and Playwright fallbacks.

    - Retries with verify=False only on SSL cert errors.
    - If the requests body is empty/too short (JS/anti-bot page), re-fetches
      once with Playwright. Returns a requests.Response or a PlaywrightResponse;
      either way `.via` is 'requests' or 'playwright'.
    - Successful results are cached in-memory (per run) keyed by URL.
    """
    cached = _CACHE.get(url)
    if cached is not None:
        return cached

    try:
        resp = _get(url, timeout, verify=True)
    except requests.exceptions.SSLError as e:
        domain = urlparse(url).netloc
        print(
            f"  ⚠️  SSL verify FAILED cho {domain} -> retry với verify=False. "
            f"Dữ liệu vẫn lấy được, nhưng domain này có vấn đề chứng chỉ SSL "
            f"(cần lưu ý). Chi tiết: {e}"
        )
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", urllib3.exceptions.InsecureRequestWarning)
            resp = _get(url, timeout, verify=False)

    resp.raise_for_status()
    resp.encoding = resp.apparent_encoding or resp.encoding
    resp.via = "requests"

    # JS/anti-bot fallback: empty or near-empty body -> render with a browser.
    if allow_playwright and ("pdf" not in resp.headers.get("content-type", "").lower()):
        if len(resp.content) < MIN_BYTES or text_length(resp.text) < MIN_TEXT_CHARS:
            domain = urlparse(url).netloc
            print(f"  ↪ Playwright fallback cho {domain} (requests trả nội dung rỗng/ngắn)")
            try:
                rendered = fetch_with_playwright(url)
                _CACHE[url] = rendered
                return rendered
            except Exception as e:  # noqa: BLE001 — fall back to the short requests body
                print(f"  ⚠️  Playwright lỗi cho {domain}: {e}")

    _CACHE[url] = resp
    return resp
