#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)/models/face-api"
mkdir -p "$DIR"
cd "$DIR"

BASE="https://raw.githubusercontent.com/vladmandic/face-api/master/model"

FILES=(
  "ssd_mobilenetv1_model-weights_manifest.json"
  "ssd_mobilenetv1_model.bin"
  "face_landmark_68_model-weights_manifest.json"
  "face_landmark_68_model.bin"
  "face_recognition_model-weights_manifest.json"
  "face_recognition_model.bin"
)

for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then
    echo "✓ $f (skip)"
  else
    echo "↓ $f"
    curl -fsSL "$BASE/$f" -o "$f"
  fi
done

echo "모델 준비 완료: $DIR"
