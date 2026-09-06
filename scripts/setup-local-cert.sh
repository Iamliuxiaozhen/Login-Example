#!/usr/bin/env bash
# Generate and install a locally-trusted HTTPS certificate for Wrangler Pages dev.
#
# This script:
#   1. Requires mkcert (https://github.com/FiloSottile/mkcert).
#   2. Installs mkcert's local CA into the system trust store (mkcert -install).
#   3. Generates a certificate covering localhost, 127.0.0.1 and ::1.
#   4. Saves it to .wrangler/certs/localhost.pem and .wrangler/certs/localhost-key.pem
#      so wrangler pages dev can use --https-cert-path / --https-key-path.

set -euo pipefail

# Move to the repository root (one level above scripts/).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CERT_DIR=".wrangler/certs"
CERT_FILE="$CERT_DIR/localhost.pem"
KEY_FILE="$CERT_DIR/localhost-key.pem"

if ! command -v mkcert >/dev/null 2>&1; then
  echo "error: mkcert is not installed." >&2
  echo "" >&2
  echo "Install it first, for example:" >&2
  echo "  Ubuntu/Debian: sudo apt install mkcert" >&2
  echo "  macOS:         brew install mkcert" >&2
  echo "  Windows:       choco install mkcert" >&2
  echo "Then re-run this script." >&2
  exit 1
fi

mkdir -p "$CERT_DIR"

if ! mkcert -install; then
  echo "" >&2
  echo "warning: failed to install mkcert's local CA into the system trust store." >&2
  echo "The certificate will still be generated, but browsers may show a trust warning." >&2
fi

# mkcert -install can print a CAROOT line; suppress noise unless it fails.
if mkcert -cert-file "$CERT_FILE" -key-file "$KEY_FILE" localhost 127.0.0.1 ::1; then
  echo ""
  echo "Done. Local HTTPS certificate created at:"
  echo "  cert: $CERT_FILE"
  echo "  key:  $KEY_FILE"
  echo ""
  echo "The project is now configured to run with:"
  echo "  npm run dev"
  echo ""
  echo "If you still see a browser certificate warning, close and reopen the browser"
  echo "after running 'mkcert -install' (Firefox may need a full browser restart)."
else
  echo "error: mkcert failed to generate the certificate." >&2
  exit 1
fi
