"""Find the official admission-plan URL for each university using Gemini.

For every row in data/input/universities_list.csv, this calls Gemini (via
Vertex AI) with Google Search Grounding enabled and asks for the latest
admission-plan / announcement URL. Results are written to
data/output/admission_urls.csv.

IMPORTANT — lessons baked into this script (see also config.get_genai_client):
  1. Google Search grounding CANNOT be combined with response_mime_type=
     "application/json".
  2. Asking the model for strict JSON triggers very heavy "thinking"
     (100k+ thought tokens) and splits the answer across multiple parts, so
     response.text comes back None. We instead ask for a simple 3-line answer
     (URL / type / confidence), which returns a single clean part fast.
  3. We gather text from ALL parts defensively, and cap each request with a
     timeout so a slow grounding call fails fast instead of hanging.

Run from the pipeline root:  python scripts/find_admission_urls.py
"""

from __future__ import annotations

import argparse
import csv
import time
from datetime import datetime, timezone

import config  # shared .env loading + auth + client (scripts/config.py)

INPUT_CSV = config.PIPELINE_ROOT / "data" / "input" / "universities_list.csv"
OUTPUT_CSV = config.PIPELINE_ROOT / "data" / "output" / "admission_urls.csv"
ERROR_LOG = config.PIPELINE_ROOT / "data" / "output" / "find_urls_errors.log"

OUTPUT_FIELDS = [
    "university_code",
    "university_name",
    "found_url",
    "url_type",
    "confidence",
    "note",
    "search_timestamp",
]

# Tuning knobs. Each grounding call already takes ~15-90s, which naturally
# paces requests, so the inter-school delay is small.
REQUEST_DELAY_SEC = 2.0   # delay between schools
MAX_RETRIES = 2           # retries per school on failure (timeouts / 5xx)
RETRY_BACKOFF_SEC = 5.0   # base backoff, multiplied by attempt number
CHECKPOINT_EVERY = 10     # print progress + cost estimate every N schools


VALID_URL_TYPES = {"pdf", "html"}
VALID_CONFIDENCE = {"high", "medium", "low"}


def build_prompt(university_name: str) -> str:
    """Prompt asking Gemini to search and return a simple 3-line answer.

    A line-format answer (not JSON) keeps the model from over-thinking and
    returns a single clean text part — see the module docstring.
    """
    return (
        f"Hãy tìm URL trang đề án tuyển sinh hoặc thông báo tuyển sinh năm 2025 "
        f"hoặc 2026 mới nhất của {university_name}. "
        f"Ưu tiên file PDF đề án tuyển sinh, hoặc trang web chính thức của trường "
        f"(tên miền .edu.vn).\n\n"
        f"Trả lời ĐÚNG 3 dòng, KHÔNG giải thích, KHÔNG markdown:\n"
        f"Dòng 1: URL tìm được (ghi 'none' nếu không tìm được)\n"
        f"Dòng 2: pdf hoặc html\n"
        f"Dòng 3: high, medium hoặc low (mức độ tin cậy)"
    )


def gather_text(resp) -> str:
    """Join text from all parts of the first candidate.

    response.text is None when the answer spans multiple parts, so we read
    the parts directly instead.
    """
    cand = resp.candidates[0] if resp.candidates else None
    if not cand or not cand.content or not cand.content.parts:
        return ""
    return "\n".join(p.text for p in cand.content.parts if p.text).strip()


def parse_three_lines(text: str) -> dict:
    """Parse the 3-line answer into found_url / url_type / confidence / note."""
    if not text:
        raise ValueError("empty response text")
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if not lines:
        raise ValueError(f"no usable lines in: {text[:200]!r}")

    raw_url = lines[0]
    found_url = "" if raw_url.lower() in {"none", "null", ""} else raw_url

    url_type = lines[1].lower() if len(lines) > 1 else ""
    if url_type not in VALID_URL_TYPES:
        # Infer from the URL extension as a fallback.
        url_type = "pdf" if found_url.lower().endswith(".pdf") else ("html" if found_url else "")

    confidence = lines[2].lower() if len(lines) > 2 else ""
    if confidence not in VALID_CONFIDENCE:
        confidence = ""

    return {
        "found_url": found_url,
        "url_type": url_type,
        "confidence": confidence,
        "note": "",
    }


def query_one(client, university_name: str) -> dict:
    """Call Gemini with Search Grounding and return the parsed result dict.

    Uses a single model (config.GEMINI_MODEL). We intentionally do NOT fall
    back to a reasoning model like gemini-3.1-pro here: for URL lookup it adds
    minutes of latency without benefit. Slow calls are bounded by the client
    timeout; transient failures are retried by the caller.
    """
    from google.genai import types

    prompt = build_prompt(university_name)
    grounding_tool = types.Tool(google_search=types.GoogleSearch())
    # NOTE: no response_mime_type / thinking_config here — both hurt grounding.
    gen_config = types.GenerateContentConfig(
        tools=[grounding_tool],
        temperature=0.1,
    )
    resp = client.models.generate_content(
        model=config.GEMINI_MODEL, contents=prompt, config=gen_config
    )
    return parse_three_lines(gather_text(resp))


def log_error(message: str) -> None:
    ts = datetime.now(timezone.utc).isoformat()
    with ERROR_LOG.open("a", encoding="utf-8") as f:
        f.write(f"[{ts}] {message}\n")


def read_universities() -> list[dict]:
    if not INPUT_CSV.is_file():
        config.fail(f"Input file not found: {INPUT_CSV}")
    with INPUT_CSV.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def load_done_codes() -> set[str]:
    """Return university_codes already present in the output CSV.

    Lets a re-run resume: schools already written are skipped. Codes written
    with an ERROR note are NOT counted as done, so failures get retried.
    """
    done: set[str] = set()
    if not (OUTPUT_CSV.is_file() and OUTPUT_CSV.stat().st_size > 0):
        return done
    with OUTPUT_CSV.open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            code = (row.get("university_code") or "").strip()
            note = row.get("note") or ""
            if code and not note.startswith("ERROR:"):
                done.add(code)
    return done


def main() -> None:
    parser = argparse.ArgumentParser(description="Find admission-plan URLs.")
    parser.add_argument("--limit", type=int, default=None,
                        help="chỉ xử lý N trường đầu tiên trong input (để test)")
    args = parser.parse_args()

    all_rows = read_universities()
    if args.limit is not None:
        all_rows = all_rows[: args.limit]
    in_scope = len(all_rows)

    # Resume: skip schools already in the output CSV.
    done = load_done_codes()
    todo = [r for r in all_rows
            if (r.get("university_code") or "").strip() not in done]
    skipped = in_scope - len(todo)

    print(f"Phạm vi: {in_scope} trường"
          + (f" (--limit {args.limit})" if args.limit is not None else "")
          + f" | đã có sẵn: {skipped} | sẽ xử lý: {len(todo)}\n")
    if not todo:
        print("Không có trường nào cần xử lý (đã xong hết).")
        return

    client = config.get_genai_client()
    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)

    # Append mode so checkpoints accumulate across re-runs; header only if new.
    write_header = not (OUTPUT_CSV.is_file() and OUTPUT_CSV.stat().st_size > 0)
    api_calls = 0
    started = time.time()

    with OUTPUT_CSV.open("a", encoding="utf-8", newline="") as out_f:
        writer = csv.DictWriter(out_f, fieldnames=OUTPUT_FIELDS)
        if write_header:
            writer.writeheader()

        for i, row in enumerate(todo, start=1):
            code = (row.get("university_code") or "").strip()
            name = (row.get("university_name") or "").strip()
            print(f"[{i}/{len(todo)}] Đang xử lý: {name}...", end=" ", flush=True)

            result: dict | None = None
            for attempt in range(1, MAX_RETRIES + 2):  # 1 initial + MAX_RETRIES
                try:
                    api_calls += 1  # each generate_content is one grounding call
                    result = query_one(client, name)
                    break
                except Exception as e:  # noqa: BLE001
                    if attempt <= MAX_RETRIES:
                        time.sleep(RETRY_BACKOFF_SEC * attempt)
                        continue
                    log_error(f"{code} | {name} | attempt {attempt} failed: {e}")

            if result is None:
                print("-> ❌ lỗi (đã ghi log)")
                writer.writerow({
                    "university_code": code,
                    "university_name": name,
                    "found_url": "",
                    "url_type": "",
                    "confidence": "",
                    "note": "ERROR: see find_urls_errors.log",
                    "search_timestamp": datetime.now(timezone.utc).isoformat(),
                })
            else:
                found = result.get("found_url") or ""
                writer.writerow({
                    "university_code": code,
                    "university_name": name,
                    "found_url": found,
                    "url_type": result.get("url_type") or "",
                    "confidence": result.get("confidence") or "",
                    "note": result.get("note") or "",
                    "search_timestamp": datetime.now(timezone.utc).isoformat(),
                })
                print(f"-> {found or 'không tìm được'} "
                      f"({result.get('confidence') or '?'})")

            out_f.flush()  # persist each row immediately (checkpoint per row)
            if i % CHECKPOINT_EVERY == 0:
                print(f"  ⏱  Đã xử lý {i}/{len(todo)} "
                      f"(phạm vi {in_scope}), ước tính {api_calls} search grounding calls")
            if i < len(todo):
                time.sleep(REQUEST_DELAY_SEC)

    elapsed = time.time() - started
    print(f"\n✅ Xong {len(todo)} trường trong {elapsed:.0f}s "
          f"(~{elapsed / max(len(todo), 1):.1f}s/trường). "
          f"Ước tính {api_calls} search grounding calls.")
    print(f"   Kết quả: {OUTPUT_CSV}")
    if ERROR_LOG.is_file():
        print(f"⚠️  Có lỗi được ghi tại: {ERROR_LOG}")


if __name__ == "__main__":
    main()
