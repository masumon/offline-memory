#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required to run the Expo project." >&2
  exit 1
fi

case "${1:-}" in
  --android)
    exec npx expo start --android
    ;;
  --dev-client)
    exec npx expo start --dev-client
    ;;
  --web)
    exec npx expo start --web
    ;;
  --tunnel)
    exec npx expo start --tunnel
    ;;
  --help|-h)
    cat <<'EOF'
Usage: ./script/build_and_run.sh [mode]

Modes:
  (none)        Start Expo development server
  --android     Start Expo and open Android
  --dev-client  Start Expo in development-client mode
  --web         Start Expo for web
  --tunnel      Start Expo with a tunnel
  --help        Show this help
EOF
    ;;
  *)
    echo "Unknown option: $1" >&2
    exit 2
    ;;
esac

if [[ -z "${1:-}" ]]; then
  exec npx expo start
fi
