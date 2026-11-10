#!/usr/bin/env bash
# Local Home Assistant for development: Python 3.14 venv, demo devices, Ambidash loaded from this checkout.
#   scripts/dev-ha.sh          start (first run: install, onboard a test user, seed floors/areas, add Ambidash)
#   scripts/dev-ha.sh reset    wipe the local state first
# Open http://localhost:8123 (no login on localhost); stop with Ctrl+C. Never points at a real instance.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEV="$ROOT/.dev"
HA_VERSION="${HA_VERSION:-2026.11.0}"

[ "${1:-}" = reset ] && rm -rf "$DEV/config"
mkdir -p "$DEV/config"

if [ ! -x "$DEV/venv/bin/hass" ]; then
  uv venv --python 3.14 "$DEV/venv"
  uv pip install --python "$DEV/venv/bin/python" "homeassistant==$HA_VERSION"
fi

ln -sfn "$ROOT/custom_components" "$DEV/config/custom_components"
cp "$ROOT/scripts/dev-configuration.yaml" "$DEV/config/configuration.yaml"
FIRST=0
[ -f "$DEV/config/.storage/onboarding" ] || FIRST=1

"$DEV/venv/bin/hass" -c "$DEV/config" &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT

until curl -sf http://localhost:8123/api/onboarding >/dev/null; do sleep 2; done
if [ "$FIRST" = 1 ]; then
  "$DEV/venv/bin/python" -I "$ROOT/scripts/dev_setup.py" "$DEV"
fi
wait $PID
