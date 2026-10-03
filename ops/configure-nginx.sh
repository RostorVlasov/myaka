#!/usr/bin/env bash
set -euo pipefail

[[ $(id -u) -eq 0 ]] || { echo 'Nginx setup requires root.' >&2; exit 1; }
MYAKA_DOMAIN=myaka.rumiscola.ru
APP_PORT=${APP_PORT:-2027}
[[ "$APP_PORT" =~ ^[0-9]{1,5}$ ]] && ((10#$APP_PORT >= 1 && 10#$APP_PORT <= 65535))

CONFIG=/etc/nginx/sites-available/myaka.rumiscola.ru.conf
ENABLED=/etc/nginx/sites-enabled/myaka.rumiscola.ru.conf
ACME_ROOT=/var/www/myaka/shared/acme
CERT_DIR=/etc/letsencrypt/live/$MYAKA_DOMAIN
BACKUP_DIR=/etc/nginx/myaka-backups/$(date +%Y%m%d-%H%M%S)-$$
mkdir -p "$ACME_ROOT/.well-known/acme-challenge" "$BACKUP_DIR"
chmod 755 "$ACME_ROOT" "$ACME_ROOT/.well-known" "$ACME_ROOT/.well-known/acme-challenge"
chmod 700 "$BACKUP_DIR"

shopt -s nullglob
for candidate in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf; do
  [[ "$(readlink -f "$candidate")" == "$CONFIG" ]] && continue
  if grep -Eq 'server_name[^;]*myaka[.]rumiscola[.]ru([[:space:];]|$)' "$candidate"; then
    echo "The domain is already configured in $candidate; refusing to create a duplicate." >&2
    exit 1
  fi
done

HAD_CONFIG=false
HAD_ENABLED=false
if [[ -f "$CONFIG" ]]; then
  cp -a "$CONFIG" "$BACKUP_DIR/site.conf"
  HAD_CONFIG=true
fi
if [[ -e "$ENABLED" || -L "$ENABLED" ]]; then
  cp -a "$ENABLED" "$BACKUP_DIR/enabled"
  HAD_ENABLED=true
fi

rollback_nginx() {
  local status=$?
  [[ $status -eq 0 ]] && return
  trap - EXIT
  if $HAD_CONFIG; then
    cp -a "$BACKUP_DIR/site.conf" "$CONFIG"
  else
    rm -f "$CONFIG"
  fi
  rm -f "$ENABLED"
  if $HAD_ENABLED; then
    cp -a "$BACKUP_DIR/enabled" "$ENABLED"
  fi
  if nginx -t; then
    systemctl reload nginx || true
  fi
  exit "$status"
}
trap rollback_nginx EXIT

write_config() {
  local with_tls=$1
  local temporary
  temporary=$(mktemp /etc/nginx/sites-available/myaka.XXXXXX)
  cat > "$temporary" <<EOF
# Myaka website
server {
    listen 80;
    server_name $MYAKA_DOMAIN;

    location ^~ /.well-known/acme-challenge/ {
        root $ACME_ROOT;
        try_files \$uri =404;
    }
EOF
  if [[ "$with_tls" == true ]]; then
    cat >> "$temporary" <<'EOF'
    location / {
        return 301 https://$host$request_uri;
    }
}
EOF
    cat >> "$temporary" <<EOF
server {
    listen 443 ssl;
    server_name $MYAKA_DOMAIN;
    ssl_certificate $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:MyakaSSL:10m;
    ssl_session_timeout 1d;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
EOF
  fi
  cat >> "$temporary" <<EOF
    location = /healthz {
        return 404;
    }
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }
}
EOF
  chmod 644 "$temporary"
  mv -f "$temporary" "$CONFIG"
  ln -sfn "$CONFIG" "$ENABLED"
  nginx -t
  systemctl reload nginx
}

if [[ -s "$CERT_DIR/fullchain.pem" && -s "$CERT_DIR/privkey.pem" ]]; then
  write_config true
else
  write_config false
fi

certbot certonly --webroot -w "$ACME_ROOT" \
  --cert-name "$MYAKA_DOMAIN" -d "$MYAKA_DOMAIN" \
  --non-interactive --agree-tos --register-unsafely-without-email \
  --keep-until-expiring

write_config true

mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/myaka-reload-nginx <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
[[ ${RENEWED_LINEAGE:-} == /etc/letsencrypt/live/myaka.rumiscola.ru ]] || exit 0
nginx -t
systemctl reload nginx
EOF
chmod 750 /etc/letsencrypt/renewal-hooks/deploy/myaka-reload-nginx

if systemctl list-unit-files certbot.timer --no-legend | grep -q '^certbot.timer'; then
  systemctl enable --now certbot.timer
elif [[ ! -f /etc/cron.d/certbot ]]; then
  cat > /etc/cron.d/myaka-cert-renew <<'EOF'
17 3,15 * * * root /usr/bin/certbot renew --cert-name myaka.rumiscola.ru --quiet
EOF
  chmod 644 /etc/cron.d/myaka-cert-renew
fi

openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -dates -issuer -subject
echo "Nginx and HTTPS are configured for $MYAKA_DOMAIN."
