<p align="center">
  <img src="public/images/myaka.svg" width="164" alt="Мяка" />
</p>

<h1 align="center">Мяка</h1>
<p align="center"><strong>Кот, который просто есть.</strong><br />Просто быть собой.</p>
<p align="center">
  <a href="https://myaka.rumiscola.ru">Сайт</a> ·
  <a href="https://t.me/RostorVLasov">Telegram</a> ·
  <a href="https://github.com/RostorVlasov/myaka/releases">Релизы</a>
</p>
<p align="center">
  <a href="https://github.com/RostorVlasov/myaka/actions/workflows/deploy.yml"><img src="https://github.com/RostorVlasov/myaka/actions/workflows/deploy.yml/badge.svg" alt="Сборка и деплой" /></a>
</p>

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
| `SSH_PORT` | SSH-порт; по умолчанию 22 |
| `SSH_PASSWORD` | Пароль пользователя для настройки Nginx и сертификата через sudo |
| `SSH_FINGERPRINT` | SHA256 fingerprint SSH-ключа сервера |

Если ключ защищён паролем, добавь `SSH_PASSPHRASE`. Эти значения вводятся в GitHub Secrets, а не в файлы проекта или сообщения.

Во вкладке **Variables** можно задать:

| Variable | По умолчанию | Назначение |
| --- | --- | --- |
| `APP_DIR` | `/var/www/myaka` | Папка приложения на сервере |
| `APP_PORT` | `2027` | Порт Bun; тот же порт должен быть в Nginx |
| `SITE_URL` | `https://myaka.rumiscola.ru` | Канонический адрес для SEO и sitemap |

`APP_DIR` должен быть абсолютным путём, содержащим буквы, цифры, `/`, `_` или `-`.

Workflow `.github/workflows/deploy.yml` запускается после push в `main` и вручную через **Actions → Deploy Myaka to Server → Run workflow**. Если SSH secrets ещё не заполнены, он проверяет и собирает сайт, сохраняет `deploy.zip` в Artifacts, а серверный этап пропускает. После заполнения secrets запусти workflow вручную.

## Сервер и HTTPS

Workflow **Check server access** проверяет SSH-доступ, создаёт папку `/var/www/myaka` и устанавливает отдельный Bun 1.4.2 в `~/.local/share/myaka/bun`. На сервере нужны Node.js, PM2, Nginx, Certbot, unzip и curl. Пользователь деплоя должен иметь право выполнять команды через sudo.

Сайт работает через Nginx на **https://myaka.rumiscola.ru**. Bun слушает `127.0.0.1:2027`. Workflow деплоя запускает `ops/configure-nginx.sh`: создаёт отдельную конфигурацию домена, выпускает сертификат Let's Encrypt, включает перенаправление HTTP → HTTPS и автоматическое продление сертификата. Конфигурация Nginx проверяется перед перезагрузкой; её предыдущая версия сохраняется для отката.

Для сертификата DNS домена должен указывать на сервер, а порты 80 и 443 должны принимать входящие подключения. Порт приложения 2027 используется внутри сервера.

Конфигурация домена: `/etc/nginx/sites-available/myaka.rumiscola.ru.conf`. Сертификат: `/etc/letsencrypt/live/myaka.rumiscola.ru/`.

## Доступ к репозиторию

Репозиторий приватный. Приглашённых участников нет; право изменять исходники остаётся у владельца. Приватный SSH-ключ и пароль хранятся в GitHub Secrets. В исходниках и релизах их нет.

## Что делает деплой

1. Устанавливает зависимости из `bun.lock`, проверяет TypeScript и собирает сайт.
2. Упаковывает статический фронтенд, Bun-сервер и настройки PM2 в `deploy.zip`.
3. Загружает архив через SCP в отдельную папку текущего запуска.
4. Создаёт релиз в `releases/` и сохраняет `.env` в `shared/`.
5. Перезапускает только процесс `myaka`, проверяет `/healthz` с ID нового релиза и главную страницу три раза подряд, сохраняет PM2 и переключает `current` на успешный релиз.
6. Настраивает Nginx и SSL, проверяет главную страницу, robots.txt и sitemap.xml по HTTPS.
7. При ошибке запуска приложения возвращает предыдущий релиз и восстанавливает его порт. При неудачном самом первом запуске удаляет нерабочий процесс и завершает workflow с ошибкой.

Логи: `/var/www/myaka/shared/logs/`. Настройки сервера: `/var/www/myaka/shared/.env`. Старые релизы сохраняются для восстановления; удаляй ненужные вручную, оставляя текущий и предыдущий. Порт Мяки 2027 выбран отдельно от порта 2026 из примера «Кота Моне».

Диагностика под пользователем деплоя:

```bash
pm2 status
pm2 logs myaka --lines 50
curl -fsS http://127.0.0.1:2027/healthz
```

Для ручной упаковки после сборки: `bun run package:deploy`.
