# Мяка — просто быть собой

Сайт рисованного кота Мяки: истории, фотографии, смена настроений и улыбка при поглаживании. Художник и создатель — Сора. Разработка сайта и основной владелец персонажа — Студия Велром [RumIsCola.ru](https://RumIsCola.ru/). Связь: [Telegram](https://t.me/RostorVLasov).

Сайт собирается в готовый HTML с интерактивным React и работает на собственном Linux-сервере через Bun, PM2 и Nginx. Яндекс Метрика: **110822437**.

## Локальный запуск

Для разработки нужны **Node.js 24** и **Bun 1.4.2**.

```bash
bun install --frozen-lockfile
bun run dev
```

Проверка и production-запуск:

```bash
bun run typecheck
bun run build
bun run start
```

Сайт: `http://127.0.0.1:2027`, проверка запуска: `http://127.0.0.1:2027/healthz`. Для локального запуска на другом порту: `PORT=3030 bun run start`.

`dist/client` содержит готовый сайт, включая HTML, стили, JavaScript, изображения, шрифт Caveat Bold, robots.txt и sitemap.xml. `server.ts` раздаёт только эту папку. На production-сервере не нужны node_modules или установка frontend-зависимостей.

## Репозиторий

Исходный код: [RostorVlasov/myaka](https://github.com/RostorVlasov/myaka).

```bash
git clone https://github.com/RostorVlasov/myaka.git
cd myaka
```

`.gitignore` исключает зависимости, сборку, архивы, логи, локальные настройки и приватные ключи; `bun.lock` и `.env.example` входят в репозиторий. Изменения публикуются через `git push origin main`.

## Настройка GitHub Actions

В репозитории открой **Settings → Secrets and variables → Actions → Secrets → New repository secret**.

| Secret | Значение |
| --- | --- |
| `SSH_HOST` | IP или адрес своего сервера |
| `SSH_USER` | Пользователь сервера, который владеет папкой приложения и запускает PM2 |
| `SSH_KEY` | Приватный SSH-ключ этого пользователя, целиком |
| `SSH_PORT` | SSH-порт; можно не задавать, если используется 22 |

Если ключ защищён паролем, добавь `SSH_PASSPHRASE`. При настроенной проверке ключа сервера добавь `SSH_FINGERPRINT` — SHA256 fingerprint SSH host key. Эти значения вводятся в GitHub Secrets, а не в файлы проекта или сообщения.

Во вкладке **Variables** можно задать:

| Variable | По умолчанию | Назначение |
| --- | --- | --- |
| `APP_DIR` | `/var/www/myaka` | Папка приложения на сервере |
| `APP_PORT` | `2027` | Порт Bun; тот же порт должен быть в Nginx |
| `SITE_URL` | `https://myaka.rumiscola.ru` | Канонический адрес для SEO и sitemap |

`APP_DIR` должен быть абсолютным путём, содержащим буквы, цифры, `/`, `_` или `-`.

Workflow `.github/workflows/deploy.yml` запускается после push в `main` и вручную через **Actions → Deploy Myaka to Server → Run workflow**. Если SSH secrets ещё не заполнены, он проверяет и собирает сайт, сохраняет `deploy.zip` в Artifacts, а серверный этап пропускает. После заполнения secrets запусти workflow вручную.

## Однократная подготовка сервера

На сервере нужны **Bun 1.4.2**, **PM2**, **unzip**, **curl** и **Nginx**. PM2 устанавливается через Node.js:

```bash
npm install -g pm2@7.0.4
```

Bun установи по [официальной инструкции](https://bun.sh/docs/installation) под тем же пользователем, что указан в `SSH_USER`. Убедись, что `bun --version` возвращает 1.4.2. Workflow добавляет `$HOME/.bun/bin` в PATH.

Через администратора создай папку и передай её пользователю деплоя (замени `deployuser` на реальный `SSH_USER`):

```bash
sudo mkdir -p /var/www/myaka
sudo chown deployuser:deployuser /var/www/myaka
```

Один раз настрой автозапуск PM2 **под пользователем деплоя**:

```bash
pm2 startup
```

Выполни команду с `sudo`, которую выдаст PM2. После каждого успешного деплоя workflow выполняет `pm2 save`.

## Домен и Nginx

Образец конфигурации: `ops/nginx.conf`. Он направляет домен `myaka.rumiscola.ru` на `127.0.0.1:2027`. Если выбран другой домен или порт, измени образец и соответствующую GitHub Variable.

Для Debian/Ubuntu:

```bash
sudo cp ops/nginx.conf /etc/nginx/sites-available/myaka
sudo ln -s /etc/nginx/sites-available/myaka /etc/nginx/sites-enabled/myaka
sudo nginx -t
sudo systemctl reload nginx
```

Не создавай второй Nginx server block для домена, если он уже настроен: обнови существующую конфигурацию. Чтобы перенести домен на собственный сервер, его DNS должен указывать на IP этого сервера. Для HTTPS подключи сертификат в панели хостинга или Certbot. В конфигурации выше показан HTTP reverse proxy; сертификат в репозиторий не включён.

## Что делает деплой

1. Устанавливает зависимости из `bun.lock`, проверяет TypeScript и собирает сайт.
2. Упаковывает статический фронтенд, Bun-сервер и настройки PM2 в `deploy.zip`.
3. Загружает архив через SCP в отдельную папку текущего запуска.
4. Создаёт релиз в `releases/` и сохраняет `.env` в `shared/`.
5. Перезапускает только процесс `myaka`, проверяет `/healthz` с ID нового релиза и главную страницу три раза подряд, сохраняет PM2 и переключает `current` на успешный релиз.
6. При ошибке возвращает предыдущий релиз и восстанавливает его порт. При неудачном самом первом запуске удаляет нерабочий процесс и завершает workflow с ошибкой.

Логи: `/var/www/myaka/shared/logs/`. Настройки сервера: `/var/www/myaka/shared/.env`. Старые релизы сохраняются для восстановления; удаляй ненужные вручную, оставляя текущий и предыдущий. Порт Мяки 2027 выбран отдельно от порта 2026 из примера «Кота Моне».

Диагностика под пользователем деплоя:

```bash
pm2 status
pm2 logs myaka --lines 50
curl -fsS http://127.0.0.1:2027/healthz
```

Для ручной упаковки после сборки: `bun run package:deploy`.
