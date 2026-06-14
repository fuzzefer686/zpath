"""Smoke test for the crawl pipeline's external connections.

Verifies two things before any real crawling work begins:
  1. Vertex AI (Gemini via the google-genai SDK) — sends a tiny prompt.
  2. Supabase — counts rows in the `universities` and `majors` tables.

Run from the pipeline root:  python scripts/test_connection.py
"""

from __future__ import annotations

import base64
import os
import sys
import tempfile
from pathlib import Path

from dotenv import load_dotenv

# Load .env located at the pipeline root (one level above /scripts).
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(ENV_PATH)


def _fail(msg: str) -> None:
    """Print an error and exit so a broken config fails loudly."""
    print(f"  ❌ {msg}")
    sys.exit(1)


def _require(var: str) -> str:
    value = os.getenv(var)
    if not value:
        _fail(f"Missing required env var: {var} (check {ENV_PATH})")
    return value


def setup_google_auth() -> None:
    """Make service account credentials discoverable by the google-genai SDK.

    Supports either a base64-encoded key (decoded to a temp file) or a plain
    file path. The SDK reads GOOGLE_APPLICATION_CREDENTIALS automatically.
    """
    b64 = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_BASE64")
    if b64:
        tmp = tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False, encoding="utf-8"
        )
        tmp.write(base64.b64decode(b64).decode("utf-8"))
        tmp.close()
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = tmp.name
        return

    key_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not key_path or not Path(key_path).is_file():
        _fail(
            "No usable credentials. Set GOOGLE_APPLICATION_CREDENTIALS to a valid "
            "key file path, or GOOGLE_APPLICATION_CREDENTIALS_BASE64 to the encoded key."
        )


def test_vertex_ai() -> None:
    print("→ Testing Vertex AI (Gemini)...")
    from google import genai  # imported lazily so Supabase test can run independently

    setup_google_auth()

    project = _require("GCP_PROJECT_ID")
    location = os.getenv("GCP_REGION", "global")
    primary = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
    fallback = os.getenv("GEMINI_MODEL_FALLBACK", "gemini-3.1-flash-lite")

    client = genai.Client(vertexai=True, project=project, location=location)
    prompt = "Xin chào, trả lời bằng 1 câu."

    # Try the configured model; fall back if it is unknown/unavailable.
    models_to_try = [primary] + ([fallback] if fallback != primary else [])
    for model in models_to_try:
        try:
            resp = client.models.generate_content(model=model, contents=prompt)
            print(f"  ✅ Model used: {model}")
            print(f"  ✅ Reply: {resp.text.strip()}")
            return
        except Exception as e:  # noqa: BLE001 — report any model/API failure clearly
            print(f"  ⚠️  Model '{model}' failed: {e}")

    _fail("All Gemini models failed. Check model name, region, and Vertex AI access.")


def test_supabase() -> None:
    print("→ Testing Supabase...")
    from supabase import create_client

    url = _require("SUPABASE_URL")
    key = _require("SUPABASE_SERVICE_ROLE_KEY")
    client = create_client(url, key)

    for table in ("universities", "majors"):
        try:
            # count="exact" returns the total without fetching rows.
            resp = client.table(table).select("*", count="exact").limit(1).execute()
            print(f"  ✅ {table}: {resp.count} rows")
        except Exception as e:  # noqa: BLE001
            _fail(f"Failed to query '{table}': {e}")


def main() -> None:
    print(f"Loading config from: {ENV_PATH}\n")
    test_vertex_ai()
    print()
    test_supabase()
    print("\n✅ All connections OK.")


if __name__ == "__main__":
    main()
