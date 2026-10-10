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

`dist/client` содержит готовый сайт, включая HTML, стили, JavaScript, изображения, шрифт Caveat Bold, robots.txt и sitemap.xml. `server.ts` раздаёт эту папку и обрабатывает `POST /api/chat`. На production-сервере не нужны node_modules или установка frontend-зависимостей.

## Чат с Мякой

Чат обращается к OpenAI-совместимому API агента Timeweb только с Bun-сервера. Модель и параметры генерации берутся из настроек агента; характер Мяки задаётся системным сообщением. Ключ не попадает в браузер, сборку или репозиторий.

После деплоя выполни от пользователя, который запускает PM2:

```bash
bash /var/www/myaka/current/ops/configure-chat.sh
```

Скрипт спросит Base URL со вкладки «Дашборд» агента, затем API-токен (ввод скрыт). Сначала он проверит ответ агента через API (до 60 секунд). После успешной проверки он сохранит `AI_AGENT_BASE_URL` и `AI_AGENT_API_KEY` в `/var/www/myaka/shared/.env` с правами 600, оставит остальные настройки и перезапустит Мяку. При ошибке он покажет причину без токена и сохранит прежние настройки. Base URL имеет вид `https://agent.timeweb.cloud/api/v1/cloud-ai/agents/ACCESS_ID/v1`. Можно передать его первым аргументом скрипта. Если папка приложения другая, укажи её в пути к скрипту и передай `MYAKA_ENV_FILE=/путь/shared/.env`.

**Access ID из URL не является API-токеном.** Создай токен в панели Timeweb: «ИИ-сервисы» → «Агенты» → нужный агент → «Управление» → «Доступ по API» → «Добавить новый ключ». Ключ AI Gateway относится к другому API. Не используй префикс `NEXT_PUBLIC_` и не клади ключ в GitHub Actions Variables. Документация: [OpenAI-совместимый API](https://timeweb.cloud/docs/ai-agents/api-usage/openai-compatible-api), [ключи доступа](https://timeweb.cloud/docs/ai-agents/manage-agents/api-access-key).

Существующее подключение к Qwen 3.5 Plus через `AI_GATEWAY_API_KEY` продолжает работать, пока `AI_AGENT_BASE_URL` пустой. Когда задан URL агента, требуется именно его `AI_AGENT_API_KEY`, без подстановки старого ключа Gateway. Деплой сохраняет настройки из `shared/.env`.

Локально создай `.env` из `.env.example`, добавь настройки, собери сайт и запусти `bun run start`. Режим `bun run dev` запускает фронтенд отдельно и не поднимает Bun API. Без настройки интерфейс виден, но сервер возвращает 503. Лимиты в памяти процесса: 6 запросов в минуту и 80 в сутки на IP, не более 3 одновременных запросов, до 800 символов в сообщении и 60 секунд на ответ. Таймаут Bun и Nginx - 75 секунд. После перезапуска счётчики сбрасываются. При ошибке сообщение возвращается в поле ввода для повторной отправки.

Чтобы ответы дольше 30 секунд доходили до браузера, нужен обновлённый конфиг Nginx. Workflow применяет его отдельным этапом. Если `sudo` отклоняет `SSH_PASSWORD`, в Actions будет предупреждение: приложение уже обновлено, но настройка Nginx требует внимания. Исправь secret или выполни на сервере `sudo bash /var/www/myaka/current/ops/configure-nginx.sh` (для нестандартного порта укажи `APP_PORT`). При этом публичная проверка всё равно должна подтвердить, что Nginx отдаёт HTML новой сборки.

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

Репозиторий публичный: любой может посмотреть исходники, создать форк и предложить изменения через pull request. Приглашённых участников нет; изменять файлы в этом репозитории и принимать предложения может только владелец. Приватный SSH-ключ и пароль хранятся в GitHub Secrets. В исходниках и релизах их нет.

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

## Релизы

После публикации релиза workflow `Package Myaka release` собирает версию из его тега и прикрепляет `deploy.zip` и `SHA256SUMS`. Архив содержит готовый сайт и файлы Bun/PM2 для сервера. Исходники также доступны в стандартных Source code архивах GitHub.

Для предпросмотра ссылки сайт отдаёт название, описание и JPEG-обложку 1200 × 630. Изображение: `/images/myaka-preview.jpg`.
