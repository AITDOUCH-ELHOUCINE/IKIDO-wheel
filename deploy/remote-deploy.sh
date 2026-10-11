#!/usr/bin/env bash
# Runs on the VPS (piped over SSH by .github/workflows/deploy.yml).
# Expects: SHA, PORT, APP_NAME. The release tarball is at /tmp/$APP_NAME-$SHA.tgz.
set -euo pipefail

APP_NAME="${APP_NAME:-ikido-wheel}"
PORT="${PORT:-3000}"
BASE="$HOME/apps/$APP_NAME"
RELEASE="$BASE/releases/$SHA"
TARBALL="/tmp/$APP_NAME-$SHA.tgz"

# Non-interactive SSH shells don't load nvm/fnm; try the usual places.
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"
command -v fnm >/dev/null 2>&1 && eval "$(fnm env)"
export PATH="$HOME/.local/bin:/usr/local/bin:$PATH"

if ! command -v node >/dev/null 2>&1; then
  echo "::error::Node.js is not installed on the VPS (Next.js 16 needs Node >= 20.9)."
  exit 1
fi
echo "Node $(node -v)"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "Installing pm2…"
  npm install -g pm2
fi

echo "Unpacking release $SHA"
mkdir -p "$RELEASE"
tar -xzf "$TARBALL" -C "$RELEASE"
rm -f "$TARBALL"
ln -sfn "$RELEASE" "$BASE/current"

echo "Starting $APP_NAME on port $PORT"
pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
cd "$RELEASE"
PORT="$PORT" HOSTNAME="0.0.0.0" NODE_ENV=production \
  pm2 start server.js --name "$APP_NAME" --update-env
pm2 save

# Health check
for i in $(seq 1 20); do
  if curl -fsS -o /dev/null "http://127.0.0.1:$PORT/"; then
    echo "App is up on port $PORT"
    break
  fi
  if [ "$i" = 20 ]; then
    echo "::error::App did not respond on port $PORT"
    pm2 logs "$APP_NAME" --lines 50 --nostream || true
    exit 1
  fi
  sleep 1
done

# Keep the 5 most recent releases
ls -1dt "$BASE"/releases/* | tail -n +6 | xargs -r rm -rf
