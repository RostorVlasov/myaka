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
class SetupError extends Error {}

async function configure() {
  const base = process.env.MYAKA_CHAT_BASE_URL.trim().replace(/\/+$/, '');
  const key = process.env.MYAKA_CHAT_API_KEY.trim().replace(/^Bearer\s+/i, '');
  let url;
  try { url = new URL(base); } catch { throw new SetupError('Неверный Base URL агента.'); }
  const match = url.pathname.match(/^\/api\/v1\/cloud-ai\/agents\/([a-zA-Z0-9-]+)\/v1$/);
  if (url.protocol !== 'https:' || url.hostname !== 'agent.timeweb.cloud' || !match ||
      url.username || url.password || url.port || url.search || url.hash) {
    throw new SetupError('Нужен Base URL OpenAI-совместимого API агента Timeweb.');
  }
  if (!key) {
    throw new SetupError('Токен не введён. Скопируй значение ключа из раздела "Доступ по API" агента Timeweb.');
  }
  if (!/^[a-zA-Z0-9._~+\/-]+=*$/.test(key)) {
    throw new SetupError('Скопируй только значение API-токена, без кавычек, пробелов и текста заголовка Authorization.');
  }

  console.log('Проверяю ответ агента Timeweb (до 60 секунд)...');
  try {
    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Ответь одним словом: готово.' }], stream: false }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new SetupError(`Timeweb не принял API-токен (HTTP ${response.status}). Создай ключ в разделе "Доступ по API" этого агента и скопируй его значение.`);
      }
      if (response.status === 429) {
        throw new SetupError('Timeweb ограничил запросы (HTTP 429). Проверь лимиты агента и попробуй позже.');
      }
      if (response.status >= 500) {
        throw new SetupError(`Timeweb сейчас не смог ответить (HTTP ${response.status}). Попробуй позже.`);
      }
      throw new SetupError(`Timeweb отклонил запрос (HTTP ${response.status}). Проверь Base URL и доступность агента.`);
    }
    const result = await response.json().catch(error => {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') throw error;
      throw new SetupError('Timeweb вернул ответ в неподдерживаемом формате. Проверь настройки агента.');
    });
    const reply = result?.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) {
      throw new SetupError('Timeweb не вернул текстовый ответ. Проверь модель и настройки агента.');
    }
  } catch (error) {
    if (error instanceof SetupError) throw error;
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new SetupError('Timeweb не ответил за 60 секунд. Попробуй позже.');
    }
    throw new SetupError('Не удалось подключиться к Timeweb. Проверь доступ сервера к agent.timeweb.cloud.');
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
}

configure().catch(error => {
  const message = error instanceof SetupError ? error.message : 'Не удалось сохранить файл настроек. Проверь путь и права доступа.';
  console.error(`Не удалось настроить чат: ${message}`);
  console.error('Существующие настройки не изменены.');
  process.exitCode = 1;
});
JS

unset MYAKA_CHAT_API_KEY
pm2 restart myaka --update-env
