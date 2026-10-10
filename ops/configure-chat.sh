#!/usr/bin/env bash
# Run as the user that owns the Myaka PM2 process. The key never enters shell history.
set -euo pipefail

MYAKA_ENV_FILE=${MYAKA_ENV_FILE:-/var/www/myaka/shared/.env}
MYAKA_CHAT_BASE_URL=${1:-}
if [[ -z "$MYAKA_CHAT_BASE_URL" ]]; then
  read -r -p 'Base URL агента Timeweb: ' MYAKA_CHAT_BASE_URL
fi
read -r -s -p 'API-токен из раздела "Доступ по API" (ввод скрыт): ' MYAKA_CHAT_API_KEY
printf '\n'

MYAKA_CHAT_BASE_URL="$MYAKA_CHAT_BASE_URL" MYAKA_CHAT_API_KEY="$MYAKA_CHAT_API_KEY" \
MYAKA_ENV_FILE="$MYAKA_ENV_FILE" node --input-type=commonjs <<'JS'
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const base = process.env.MYAKA_CHAT_BASE_URL.trim().replace(/\/+$/, '');
const key = process.env.MYAKA_CHAT_API_KEY.trim();
let url;
try { url = new URL(base); } catch { throw new Error('Неверный Base URL агента'); }
const match = url.pathname.match(/^\/api\/v1\/cloud-ai\/agents\/([a-zA-Z0-9-]+)\/v1$/);
if (url.protocol !== 'https:' || url.hostname !== 'agent.timeweb.cloud' || !match ||
    url.username || url.password || url.port || url.search || url.hash) {
  throw new Error('Нужен Base URL OpenAI-совместимого API агента Timeweb');
}
if (!key || /[\s"'\\#]/.test(key) || key === match[1]) {
  throw new Error('Нужен API-токен агента. ID из ссылки не является токеном.');
}
const filename = process.env.MYAKA_ENV_FILE;
const original = fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : '';
const preserved = original.split(/\r?\n/).filter(line =>
  !/^\s*(?:export\s+)?AI_AGENT_(?:BASE_URL|API_KEY)\s*=/.test(line));
while (preserved.at(-1) === '') preserved.pop();
const updated = [...preserved, `AI_AGENT_BASE_URL=${base}`, `AI_AGENT_API_KEY=${key}`, ''].join('\n');
fs.mkdirSync(path.dirname(filename), { recursive: true });
const temporary = `${filename}.${randomUUID()}.tmp`;
try {
  fs.writeFileSync(temporary, updated, { mode: 0o600, flag: 'wx' });
  fs.renameSync(temporary, filename);
} finally {
  if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
}
console.log('Настройки чата сохранены.');
JS

unset MYAKA_CHAT_API_KEY
pm2 restart myaka --update-env
