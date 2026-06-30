#!/usr/bin/env bash
# Download NotoSans + NotoSerif TTF fonts (both fully Vietnamese-capable) to
# public/fonts/. Both families are selectable via cv_templates.layout_config, so
# both must be present for the renderer to switch fonts without losing diacritics.
# Run once: bash scripts/download-fonts.sh
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)/public/fonts"
mkdir -p "$DIR"
REPO="https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf"
FILES="
NotoSans/NotoSans-Regular.ttf
NotoSans/NotoSans-Bold.ttf
NotoSans/NotoSans-Italic.ttf
NotoSans/NotoSans-BoldItalic.ttf
NotoSerif/NotoSerif-Regular.ttf
NotoSerif/NotoSerif-Bold.ttf
NotoSerif/NotoSerif-Italic.ttf
NotoSerif/NotoSerif-BoldItalic.ttf
"
for REL in $FILES; do
  FILE="$(basename "$REL")"
  if [ ! -f "$DIR/$FILE" ]; then
    echo "Downloading $FILE…"
    curl -fsSL "$REPO/$REL" -o "$DIR/$FILE"
  else
    echo "$FILE already present, skip."
  fi
done
echo "Done. Fonts in $DIR"
