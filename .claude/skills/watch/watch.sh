#!/usr/bin/env bash
# Usage: watch.sh <url-or-file> [out_dir]   |   watch.sh --check
set -euo pipefail

have() { command -v "$1" >/dev/null 2>&1; }
transcriber() {
  if [ -n "${OPENAI_API_KEY:-}" ]; then echo api
  elif python3 -c 'import faster_whisper' 2>/dev/null; then echo faster
  elif have whisper; then echo local
  else echo none; fi
}

if [ "${1:-}" = "--check" ]; then
  for t in ffmpeg ffprobe yt-dlp; do have "$t" && echo "ok      $t" || echo "MISSING $t"; done
  echo "transcriber: $(transcriber)"
  exit 0
fi

src="${1:?usage: watch.sh <url-or-file> [out_dir]}"
out="${2:-${TMPDIR:-/tmp}/watch-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$out/frames"

if [ -f "$src" ]; then
  cp "$src" "$out/video.mp4"
  echo "source: $src" > "$out/meta.txt"
else
  have yt-dlp || { echo "yt-dlp missing: pip install -U yt-dlp" >&2; exit 1; }
  yt-dlp -q --no-playlist -f 'mp4/bv*+ba/b' --merge-output-format mp4 -o "$out/video.mp4" \
    --print-to-file '%(title)s | %(uploader)s | %(duration)ss | %(webpage_url)s' "$out/meta.txt" "$src"
fi

dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out/video.mp4" | cut -d. -f1)
echo "duration: ${dur}s" >> "$out/meta.txt"
# 1 frame / 2 s, capped at ~60 frames
step=$(( dur / 60 > 2 ? dur / 60 : 2 ))
ffmpeg -v error -i "$out/video.mp4" -vf "fps=1/$step,scale=512:-1" "$out/frames/frame_%04d.jpg"
n=$(ls "$out/frames" | wc -l)
cols=6; rows=$(( (n + cols - 1) / cols ))
ffmpeg -v error -y -pattern_type glob -i "$out/frames/*.jpg" -vf "scale=256:-1,tile=${cols}x${rows}" -frames:v 1 "$out/contact.jpg"
echo "frames: $n (every ${step}s)" >> "$out/meta.txt"

ffmpeg -v error -y -i "$out/video.mp4" -vn -ac 1 -ar 16000 -b:a 32k "$out/audio.mp3" || true
case "$(transcriber)" in
  api)
    curl -sS https://api.openai.com/v1/audio/transcriptions -H "Authorization: Bearer $OPENAI_API_KEY" \
      -F model=whisper-1 -F response_format=verbose_json -F file=@"$out/audio.mp3" \
    | python3 -c 'import json,sys
for s in json.load(sys.stdin).get("segments",[]): t=int(s["start"]); print(f"[{t//60:02d}:{t%60:02d}] {s[\"text\"].strip()}")' > "$out/transcript.txt" ;;
  faster)
    python3 - "$out/audio.mp3" > "$out/transcript.txt" <<'PY'
import sys
from faster_whisper import WhisperModel
segs, _ = WhisperModel("base", compute_type="int8").transcribe(sys.argv[1])
for s in segs:
    t = int(s.start); print(f"[{t//60:02d}:{t%60:02d}] {s.text.strip()}")
PY
    ;;
  local)
    whisper "$out/audio.mp3" --model base --output_format txt --output_dir "$out" >/dev/null 2>&1
    mv "$out/audio.txt" "$out/transcript.txt" ;;
  none) echo "(no transcriber available — frames only)" > "$out/transcript.txt" ;;
esac

echo "$out"
