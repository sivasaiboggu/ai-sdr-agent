#!/usr/bin/env bash
# Setup script — free tools only. Run: bash scripts/setup.sh
set -e
cd "$(dirname "$0")/.."
python3 -m venv .venv || true
.venv/bin/pip install -q -r backend/requirements.txt
cp -n .env.example .env || true
echo "Setup done. Edit .env if you have free API keys, then:"
echo "  .venv/bin/python -m backend.app.main 'Research iion and draft mails'"
echo "  .venv/bin/uvicorn backend.app.api:app --reload --port 8000"
