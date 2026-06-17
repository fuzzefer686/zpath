"""Source a logo for every (non-curated) school and upload it to Supabase Storage.

Hybrid strategy (user-approved), per school:
  1. Scrape the official homepage (schools.website) for logo candidates:
     apple-touch-icon / <img> with "logo" / <link rel=icon> / og:image / twitter:image.
  2. If none, ask Gemini (Google Search grounding) for the official logo image URL.
  3. Download + validate each candidate (real image, >=64px via Pillow; SVG accepted).
  4. If >1 raster candidate, Gemini multimodal picks the real logo (quality gate).
  5. Last resort: Google favicon (sz=128), marked confidence=low for review.
Then upload the chosen bytes to the public `school-logos` bucket as <CODE>.<ext> and
record the public URL in a summary CSV (DB write is a separate step: seed_school_logos.py).

Run from the pipeline root:
  .venv/bin/python scripts/crawl_logos.py --limit 5      # sample
  .venv/bin/python scripts/crawl_logos.py                # all non-curated
  .venv/bin/python scripts/crawl_logos.py --codes OU,VLU --force
"""

from __future__ import annotations

import argparse
import csv
import io
import re
import time
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

import requests

import config
import fetcher

CURATED_SKIP = {"HUST", "FTU", "NEU", "UET", "VINUNI"}
BUCKET = "school-logos"
RESULTS_DIR = config.PIPELINE_ROOT / "data" / "output" / "logo_files"
SUMMARY_CSV = config.PIPELINE_ROOT / "data" / "output" / "logo_summary.csv"
ERROR_LOG = config.PIPELINE_ROOT / "data" / "output" / "logo_errors.log"
SUMMARY_FIELDS = ["code", "name", "source", "confidence", "logo_url", "origin_url", "note"]

MAX_CANDIDATES = 6
MIN_PX = 64
REQUEST_DELAY_SEC = 1.5
HTTP_TIMEOUT = 20
_HEADERS = {"User-Agent": fetcher.USER_AGENT, "Accept-Language": "vi,en;q=0.8"}
EXT_BY_MIME = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp",
               "image/svg+xml": "svg", "image/x-icon": "png", "image/vnd.microsoft.icon": "png"}

# Site-chrome images that are never a school logo (Wikipedia/MediaWiki branding,
# favicon services). The Wikipedia ARTICLE logo lives under upload.wikimedia.org
# /wikipedia/.. — only the /static/ chrome and wordmarks are junk.
JUNK_IMG_RE = re.compile(
    r"(wikipedia\.org/static/|wikipedia-wordmark|/icons/wikipedia|poweredby_?mediawiki"
    r"|commons-logo|wikimedia-button|/static/images/(?:mobile/)?(?:copyright|icons)/"
    r"|logocarreer|tshn-ico)",  # aggregator self-logos (not school logos)
    re.I,
)


def log_error(msg: str) -> None:
    with ERROR_LOG.open("a", encoding="utf-8") as f:
        f.write(f"[{datetime.now(timezone.utc).isoformat()}] {msg}\n")


def get_supabase():
    from supabase import create_client
    return create_client(
        config.require("SUPABASE_URL"), config.require("SUPABASE_SERVICE_ROLE_KEY")
    )


# --------------------------------------------------------------------------- #
# Candidate discovery
# --------------------------------------------------------------------------- #
def extract_logo_candidates(html: str, base_url: str) -> list[str]:
    """Logo image URLs from a homepage, best-first. Heuristic, deduped."""
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "lxml")
    out: list[str] = []

    def add(u: str | None):
        if not u:
            return
        absu = urljoin(base_url, u.strip())
        if absu.startswith("http") and absu not in out and not JUNK_IMG_RE.search(absu):
            out.append(absu)

    # 1. apple-touch-icon (usually a clean square brand mark)
    for ln in soup.find_all("link", rel=lambda v: v and "apple-touch-icon" in " ".join(v).lower()):
        add(ln.get("href"))
    # 2. <img> whose src/alt/class mentions "logo"
    for img in soup.find_all("img"):
        blob = " ".join(filter(None, [img.get("src", ""), img.get("alt", ""),
                                       " ".join(img.get("class", []) or [])])).lower()
        if "logo" in blob:
            add(img.get("src"))
    # 3. large <link rel=icon>
    for ln in soup.find_all("link", rel=lambda v: v and "icon" in " ".join(v).lower()):
        add(ln.get("href"))
    # 4. social cards (often the logo or a banner)
    for prop in ("og:image", "twitter:image", "twitter:image:src"):
        for m in soup.find_all("meta", attrs={"property": prop}) + soup.find_all("meta", attrs={"name": prop}):
            add(m.get("content"))
    return out[:MAX_CANDIDATES]


def grounding_pages(client, name: str) -> list[str]:
    """Ask Gemini (grounded) for the school's official site + Wikipedia PAGE; return
    the grounded source URLs (redirects resolve to the real page when fetched).
    A direct image URL (.png/.svg) is returned as-is so it can be downloaded too."""
    from google.genai import types
    from find_admission_urls import gather_text

    prompt = (
        f"Trang chính thức và trang Wikipedia của {name} (để lấy logo trường). "
        f"Nêu URL website chính thức (.edu.vn) và URL Wikipedia tiếng Việt của trường."
    )
    cfg = types.GenerateContentConfig(
        tools=[types.Tool(google_search=types.GoogleSearch())], temperature=0.1)
    resp = client.models.generate_content(model=config.GEMINI_MODEL, contents=prompt, config=cfg)
    urls: list[str] = []
    cand = resp.candidates[0] if resp.candidates else None
    gm = getattr(cand, "grounding_metadata", None) if cand else None
    for ch in (getattr(gm, "grounding_chunks", None) or []):
        web = getattr(ch, "web", None)
        uri = getattr(web, "uri", None) if web else None
        if uri and uri not in urls:
            urls.append(uri)
    for u in re.findall(r"https?://[^\s)\]\"']+", gather_text(resp)):
        if u not in urls:
            urls.append(u)
    return urls[:MAX_CANDIDATES]


# --------------------------------------------------------------------------- #
# Download + validate
# --------------------------------------------------------------------------- #
def download_image(url: str) -> tuple[bytes, str] | None:
    """Return (bytes, mime) if url is a valid image >= MIN_PX (SVG accepted), else None."""
    try:
        r = requests.get(url, headers=_HEADERS, timeout=HTTP_TIMEOUT, verify=True)
    except requests.exceptions.SSLError:
        try:
            r = requests.get(url, headers=_HEADERS, timeout=HTTP_TIMEOUT, verify=False)
        except Exception:
            return None
    except Exception:
        return None
    if r.status_code != 200 or not r.content:
        return None
    ctype = (r.headers.get("content-type") or "").split(";")[0].strip().lower()
    if ctype == "image/svg+xml" or (url.lower().split("?")[0].endswith(".svg")):
        if b"<svg" in r.content[:2000].lower():
            return r.content, "image/svg+xml"
        return None
    if not ctype.startswith("image/") and not re.search(r"\.(png|jpe?g|webp|ico)(\?|$)", url, re.I):
        return None
    try:
        from PIL import Image
        im = Image.open(io.BytesIO(r.content))
        im.verify()
        im = Image.open(io.BytesIO(r.content))
        w, h = im.size
        if w < MIN_PX or h < MIN_PX:
            return None
        mime = Image.MIME.get(im.format, "image/png")
        return r.content, mime
    except Exception:
        return None


def pick_best_logo(client, name: str, rasters: list[tuple[str, bytes, str]]) -> int:
    """Gemini multimodal: index of the best official logo among raster candidates,
    or -1. rasters = [(url, bytes, mime)]. Falls back to 0 on any error."""
    if len(rasters) == 1:
        return 0
    from google.genai import types
    parts = [types.Part.from_text(text=(
        f"Đây là các ảnh ứng viên LOGO của {name}, đánh số từ 0. Chọn ảnh là LOGO "
        f"CHÍNH THỨC rõ ràng, nền sạch nhất. Trả về DUY NHẤT số thứ tự (vd '0'). "
        f"Nếu không ảnh nào là logo, trả '-1'."))]
    for i, (_u, b, m) in enumerate(rasters):
        parts.append(types.Part.from_text(text=f"[{i}]"))
        parts.append(types.Part.from_bytes(data=b, mime_type=m))
    try:
        from find_admission_urls import gather_text
        resp = client.models.generate_content(
            model=config.GEMINI_MODEL,
            contents=[types.Content(role="user", parts=parts)],
            config=types.GenerateContentConfig(temperature=0))
        m = re.search(r"-?\d+", gather_text(resp))
        idx = int(m.group()) if m else 0
        return idx if -1 <= idx < len(rasters) else 0
    except Exception as e:  # noqa: BLE001
        log_error(f"pick_best_logo {name}: {e}")
        return 0


# --------------------------------------------------------------------------- #
def favicon_url(website: str) -> str | None:
    host = urlparse(website if website.startswith("http") else f"https://{website}").netloc
    return f"https://www.google.com/s2/favicons?domain={host}&sz=128" if host else None


def _gather_from_page(page_url: str, source: str, candidates: list, domains: list) -> None:
    """Fetch a page (or accept a direct image URL) and append logo candidates."""
    if re.search(r"\.(png|svg|jpe?g|webp)(\?|$)", page_url, re.I):
        if not JUNK_IMG_RE.search(page_url):
            candidates.append((page_url, source))
        return
    resp = fetcher.fetch(page_url)
    final = str(resp.url)
    host = urlparse(final).netloc
    if host and host not in domains and "google.com" not in host:
        domains.append(host)
    for u in extract_logo_candidates(resp.text, final):
        candidates.append((u, source))


def resolve_logo(client, code: str, name: str, website: str | None) -> dict:
    """Return {source, confidence, bytes, mime, origin_url} or source='none'."""
    candidates: list[tuple[str, str]] = []  # (image_url, source)
    domains: list[str] = []
    if website:
        try:
            _gather_from_page(website, "homepage", candidates, domains)
        except Exception as e:  # noqa: BLE001
            log_error(f"{code} homepage {website}: {e}")
    if not candidates:
        try:
            pages = grounding_pages(client, name)
        except Exception as e:  # noqa: BLE001
            log_error(f"{code} grounding: {e}")
            pages = []
        for pg in pages[:3]:
            try:
                _gather_from_page(pg, "grounding", candidates, domains)
            except Exception as e:  # noqa: BLE001
                log_error(f"{code} page {pg[:70]}: {e}")
            if len(candidates) >= MAX_CANDIDATES:
                break

    # download + validate (keep order, dedupe)
    seen, valid = set(), []  # valid = [(url, source, bytes, mime)]
    for url, src in candidates:
        if url in seen:
            continue
        seen.add(url)
        got = download_image(url)
        if got:
            valid.append((url, src, got[0], got[1]))
        if len(valid) >= MAX_CANDIDATES:
            break

    if valid:
        rasters = [(u, b, m) for (u, _s, b, m) in valid if m != "image/svg+xml"]
        if rasters:
            idx = pick_best_logo(client, name, rasters)
            if idx == -1 and any(m == "image/svg+xml" for *_x, m in valid):
                u, s, b, m = next(v for v in valid if v[3] == "image/svg+xml")
            elif idx == -1:
                u, s, b, m = valid[0]
            else:
                chosen_url = rasters[idx][0]
                u, s, b, m = next(v for v in valid if v[0] == chosen_url)
        else:  # only SVG(s)
            u, s, b, m = valid[0]
        return {"source": s, "confidence": "high", "bytes": b, "mime": m, "origin_url": u}

    # favicon fallback — use the school's own website or a discovered domain
    fav = favicon_url(website) if website else (favicon_url(domains[0]) if domains else None)
    if fav:
        got = download_image(fav)
        if got:
            return {"source": "favicon", "confidence": "low", "bytes": got[0],
                    "mime": got[1], "origin_url": fav}
    return {"source": "none", "confidence": "", "bytes": None, "mime": None, "origin_url": ""}


def upload(sb, code: str, data: bytes, mime: str) -> str:
    ext = EXT_BY_MIME.get(mime, "png")
    path = f"{code}.{ext}"
    sb.storage.from_(BUCKET).upload(
        path, data, {"content-type": mime, "upsert": "true", "cache-control": "604800"})
    return sb.storage.from_(BUCKET).get_public_url(path)


def load_done() -> set[str]:
    done = set()
    if SUMMARY_CSV.is_file() and SUMMARY_CSV.stat().st_size > 0:
        with SUMMARY_CSV.open(encoding="utf-8-sig", newline="") as f:
            for r in csv.DictReader(f):
                if (r.get("logo_url") or "").strip():
                    done.add((r.get("code") or "").strip())
    return done


def main() -> None:
    ap = argparse.ArgumentParser(description="Crawl + upload school logos.")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--codes", type=str, default=None)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    sb = get_supabase()
    schools = sb.table("schools").select("code,name,website").execute().data
    wanted = ({c.strip() for c in args.codes.split(",") if c.strip()} if args.codes else None)
    scope = [s for s in schools if (s.get("code") or "").strip() not in CURATED_SKIP
             and (not wanted or (s.get("code") or "").strip() in wanted)]
    scope.sort(key=lambda s: s["code"])
    if args.limit is not None:
        scope = scope[: args.limit]
    done = set() if args.force else load_done()
    todo = [s for s in scope if (s.get("code") or "").strip() not in done]
    print(f"Phạm vi: {len(scope)} | đã có logo: {len(scope) - len(todo)} | sẽ crawl: {len(todo)}\n")
    if not todo:
        print("Không có trường nào cần crawl."); return

    client = config.get_genai_client()
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    write_header = not (SUMMARY_CSV.is_file() and SUMMARY_CSV.stat().st_size > 0)
    with SUMMARY_CSV.open("a", encoding="utf-8", newline="") as sf:
        w = csv.DictWriter(sf, fieldnames=SUMMARY_FIELDS)
        if write_header:
            w.writeheader()
        for i, s in enumerate(todo, start=1):
            code = (s.get("code") or "").strip()
            name = (s.get("name") or code).strip()
            website = (s.get("website") or "").strip() or None
            print(f"[{i}/{len(todo)}] {code} {name}...", flush=True)
            fetcher.clear_cache()
            try:
                r = resolve_logo(client, code, name, website)
            except Exception as e:  # noqa: BLE001
                log_error(f"{code} resolve: {e}")
                r = {"source": "error", "confidence": "", "bytes": None, "mime": None, "origin_url": ""}
            logo_url = ""
            if r.get("bytes"):
                try:
                    logo_url = upload(sb, code, r["bytes"], r["mime"])
                    (RESULTS_DIR / f"{code}.{EXT_BY_MIME.get(r['mime'],'png')}").write_bytes(r["bytes"])
                except Exception as e:  # noqa: BLE001
                    log_error(f"{code} upload: {e}")
            print(f"    -> {r['source']} ({r['confidence'] or '-'}) {logo_url[:70]}")
            w.writerow({"code": code, "name": name, "source": r["source"],
                        "confidence": r["confidence"], "logo_url": logo_url,
                        "origin_url": r.get("origin_url", ""), "note": ""})
            sf.flush()
            time.sleep(REQUEST_DELAY_SEC)
    print(f"\n✅ Xong {len(todo)} trường.\n   Summary: {SUMMARY_CSV}\n   Files: {RESULTS_DIR}/")


if __name__ == "__main__":
    main()
