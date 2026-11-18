#!/usr/bin/env bash
# Classify the queued jobs on your own Mac (Apple silicon, 16 GB is plenty).
#
#   ./scripts/classify_local.sh            # everything queued
#   ./scripts/classify_local.sh --limit 50 # a quick test
#
# Extra arguments go to `jobdiscovery process`. Safe to stop with Ctrl-C and
# rerun: finished jobs are saved as it goes and are skipped next time.
# Needs DATABASE_URL (the same Session pooler string as the GitHub secret);
# if it isn't set, the script asks for it without echoing it.
set -euo pipefail
cd "$(dirname "$0")/.."

MODEL="${MODEL:-bartowski/Qwen_Qwen3.5-4B-GGUF:Q4_K_M}"
PORT="${PORT:-8080}"
SLOTS="${SLOTS:-4}"   # jobs the model works on at once

command -v brew >/dev/null || { echo "Install Homebrew first: https://brew.sh"; exit 1; }
command -v llama-server >/dev/null || brew install llama.cpp
command -v python3 >/dev/null || brew install python

if [ ! -d .venv ]; then python3 -m venv .venv; fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -e ".[postgres,process]"

if [ -z "${DATABASE_URL:-}" ]; then
  read -r -s -p "Paste your DATABASE_URL (hidden): " DATABASE_URL; echo
  export DATABASE_URL
fi

echo "Starting the model server (the first start downloads about 3 GB)..."
llama-server -hf "$MODEL" --no-mmproj --jinja --reasoning-budget 0 -c $((SLOTS * 4096)) -np "$SLOTS" \
  --host 127.0.0.1 --port "$PORT" > /tmp/jobdiscovery-llama.log 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT

until curl -sf "http://127.0.0.1:$PORT/health" >/dev/null; do
  if ! kill -0 $SERVER 2>/dev/null; then echo "Model server stopped:"; tail -30 /tmp/jobdiscovery-llama.log; exit 1; fi
  sleep 3
done
echo "Model ready."

jobdiscovery process --backend local --llm-url "http://127.0.0.1:$PORT" \
  --concurrency "$SLOTS" --chunk 32 --redo "$@"
jobdiscovery report
