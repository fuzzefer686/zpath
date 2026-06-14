"""Shared configuration and client helpers for the crawl pipeline.

Centralizes .env loading, Google service account auth, and the google-genai
client so every script (test_connection, find_admission_urls, ...) behaves
the same way.
"""

from __future__ import annotations

import base64
import os
import sys
import tempfile
from pathlib import Path

from dotenv import load_dotenv

# Pipeline root = one level above /scripts. The .env lives there.
PIPELINE_ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = PIPELINE_ROOT / ".env"
load_dotenv(ENV_PATH)

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
GEMINI_MODEL_FALLBACK = os.getenv("GEMINI_MODEL_FALLBACK", "gemini-3.1-flash-lite")


def fail(msg: str) -> None:
    """Print an error and exit so a broken config fails loudly."""
    print(f"  ❌ {msg}")
    sys.exit(1)


def require(var: str) -> str:
    value = os.getenv(var)
    if not value:
        fail(f"Missing required env var: {var} (check {ENV_PATH})")
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
        fail(
            "No usable credentials. Set GOOGLE_APPLICATION_CREDENTIALS to a valid "
            "key file path, or GOOGLE_APPLICATION_CREDENTIALS_BASE64 to the encoded key."
        )


def get_genai_client(timeout_ms: int = 120_000):
    """Return a google-genai client configured for Vertex AI.

    timeout_ms caps each request so a slow grounding call fails with a 504
    instead of hanging the whole run indefinitely.
    """
    from google import genai
    from google.genai import types

    setup_google_auth()
    return genai.Client(
        vertexai=True,
        project=require("GCP_PROJECT_ID"),
        location=os.getenv("GCP_REGION", "global"),
        http_options=types.HttpOptions(timeout=timeout_ms),
    )
