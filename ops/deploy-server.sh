#!/usr/bin/env bash
# Run by GitHub Actions on the target Linux server after unpacking deploy.zip.
set -euo pipefail

BUNDLE_DIR=${1:?Usage: deploy-server.sh /path/to/unpacked/deploy}
APP_DIR=${APP_DIR:-/var/www/myaka}
APP_PORT=${APP_PORT:-2027}
RELEASE_ID=${RELEASE_ID:?RELEASE_ID is required}

[[ "$APP_DIR" =~ ^/[a-zA-Z0-9/_-]+$ && "$APP_DIR" != / ]] || {
  echo "APP_DIR must be an absolute application path (letters, digits, /, _, -)." >&2
  exit 1
}
[[ "$RELEASE_ID" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$ ]] || exit 1
[[ "$APP_PORT" =~ ^[0-9]{1,5}$ ]] && ((10#$APP_PORT >= 1 && 10#$APP_PORT <= 65535)) || exit 1

for executable in bun pm2 curl; do
  command -v "$executable" >/dev/null || {
    echo "Install $executable for the SSH user before the first deployment." >&2
    exit 1
  }
done
test -s "$BUNDLE_DIR/dist/client/index.html"
test -s "$BUNDLE_DIR/server.ts"
test -s "$BUNDLE_DIR/ecosystem.config.cjs"
test -s "$BUNDLE_DIR/.env.example"

APP_DIR=${APP_DIR%/}
RELEASE_DIR="$APP_DIR/releases/$RELEASE_ID"
SHARED_DIR="$APP_DIR/shared"
OLD_RELEASE=""
ACTIVATED=0

if [ -e "$APP_DIR/current" ] && [ ! -L "$APP_DIR/current" ]; then
  echo "$APP_DIR/current must be a symlink, not a directory." >&2
  exit 1
fi
if [ -L "$APP_DIR/current" ]; then
  OLD_RELEASE=$(readlink -f "$APP_DIR/current")
  [[ "$OLD_RELEASE" == "$APP_DIR/releases/"* ]] || exit 1
  test -s "$OLD_RELEASE/ecosystem.config.cjs"
fi
if [ -e "$RELEASE_DIR" ]; then
  echo "Release already exists: $RELEASE_ID. Use a new run or release ID." >&2
  exit 1
fi

switch_release() {
  ln -sfn "$1" "$APP_DIR/.current-next-$RELEASE_ID"
  mv -Tf "$APP_DIR/.current-next-$RELEASE_ID" "$APP_DIR/current"
}

check_http() {
  local expected=$1 port=$2 response successful=0
  for attempt in {1..15}; do
    if response=$(curl --noproxy 127.0.0.1 --fail --silent --max-time 3 "http://127.0.0.1:$port/healthz") &&
       [[ "$response" == *"\"release\":\"$expected\""* ]] &&
       curl --noproxy 127.0.0.1 --fail --silent --max-time 3 "http://127.0.0.1:$port/" >/dev/null; then
      successful=$((successful + 1))
      if (( successful >= 3 )); then return 0; fi
    else
      successful=0
    fi
    sleep 1
  done
  return 1
}

start_release() {
  # Recreate this one process so PM2 applies the new release path and arguments.
  pm2 delete myaka >/dev/null 2>&1 || true
  pm2 start "$1/ecosystem.config.cjs" --only myaka --update-env
}

finish() {
  local status=$?
  trap - EXIT
  if (( status != 0 && ACTIVATED == 1 )); then
    echo "Deployment failed. Restoring the previous release." >&2
    pm2 logs myaka --nostream --lines 20 || true
    if [ -n "$OLD_RELEASE" ]; then
      switch_release "$OLD_RELEASE"
      export MYAKA_RELEASE_ID="$(basename "$OLD_RELEASE")"
      export APP_PORT="$(cat "$OLD_RELEASE/.deployment-port")"
      if start_release "$OLD_RELEASE" &&
         check_http "$MYAKA_RELEASE_ID" "$APP_PORT"; then
        pm2 save
        echo "Previous release is running."
      else
        echo "Rollback needs attention. See the PM2 logs." >&2
      fi
    else
      pm2 delete myaka || true
      rm -f "$APP_DIR/current"
    fi
  fi
  exit "$status"
}
trap finish EXIT

mkdir -p "$APP_DIR/releases" "$SHARED_DIR/logs" "$RELEASE_DIR"
if [ ! -f "$SHARED_DIR/.env" ]; then
  if [ -f "$APP_DIR/.env" ]; then
    cp "$APP_DIR/.env" "$SHARED_DIR/.env"
  else
    cp "$BUNDLE_DIR/.env.example" "$SHARED_DIR/.env"
  fi
  chmod 600 "$SHARED_DIR/.env"
fi

cp -a "$BUNDLE_DIR"/. "$RELEASE_DIR"/
ln -sfn "$SHARED_DIR/.env" "$RELEASE_DIR/.env"
printf '%s\n' "$APP_PORT" > "$RELEASE_DIR/.deployment-port"

export BUN_EXECUTABLE="$(command -v bun)"
export MYAKA_APP_DIR="$APP_DIR"
export MYAKA_RELEASE_ID="$RELEASE_ID"
export APP_PORT

ACTIVATED=1
start_release "$RELEASE_DIR"
check_http "$RELEASE_ID" "$APP_PORT"
pm2 save
switch_release "$RELEASE_DIR"

echo "Myaka release $RELEASE_ID is running on port $APP_PORT."
