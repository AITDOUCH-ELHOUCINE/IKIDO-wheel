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

# Start pm2 (and the app) again after a reboot
if [ "$(id -u)" = 0 ] && [ ! -f /etc/systemd/system/pm2-root.service ]; then
  pm2 startup systemd -u root --hp /root >/dev/null && pm2 save
  echo "pm2 will start on boot"
fi

# Nginx reverse proxy for $DOMAIN (only our own site file is touched)
if [ -n "${DOMAIN:-}" ] && [ "$(id -u)" = 0 ] && command -v nginx >/dev/null 2>&1; then
  SITE=/etc/nginx/sites-available/$APP_NAME
  if [ ! -f "$SITE" ]; then
    echo "Configuring nginx for $DOMAIN"
    cat > "$SITE" <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    ln -sf "$SITE" "/etc/nginx/sites-enabled/$APP_NAME"
    if nginx -t 2>/dev/null; then
      systemctl reload nginx
      echo "nginx: http://$DOMAIN -> 127.0.0.1:$PORT"
    else
      echo "::warning::nginx config test failed, removing $SITE"
      nginx -t || true
      rm -f "$SITE" "/etc/nginx/sites-enabled/$APP_NAME"
    fi
  fi
fi

# Keep the 5 most recent releases
ls -1dt "$BASE"/releases/* | tail -n +6 | xargs -r rm -rf
