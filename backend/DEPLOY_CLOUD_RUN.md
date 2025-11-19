## Деплой backend в Google Cloud Run

Эти шаги выполняются из корня проекта (или из папки `backend/`). Предполагается, что у вас уже есть проект в Google Cloud и установлен `gcloud`.

### 1. Аутентификация и выбор проекта

```bash
gcloud auth login
gcloud config set project <ВАШ_PROJECT_ID>  # например, videobot-478618
```

### 2. Деплой из исходников

```bash
cd backend
gcloud run deploy whitecoding-backend \
  --source . \
  --region=europe-central2 \
  --platform=managed \
  --allow-unauthenticated
```

- `whitecoding-backend` — имя сервиса (можно изменить при необходимости).
- `--region` укажите тот, где уже включён Cloud Run.
- После выполнения команда выведет публичный URL вида `https://whitecoding-backend-xxxxx-uc.a.run.app` — сохраните его, он понадобится фронтенду и curl-проверкам.

### 3. Переменные окружения (Secrets)

Все чувствительные данные задаём через Cloud Run → **whitecoding-backend** → **Variables & Secrets**:

```
OPENAI_API_KEY
TELEGRAM_API_ID
TELEGRAM_API_HASH
TELEGRAM_STRING_SESSION
SYNTX_BOT_USERNAME
TELEGRAM_PHONE_NUMBER
TELEGRAM_2FA_PASSWORD
GDRIVE_CLIENT_ID
GDRIVE_CLIENT_SECRET
GDRIVE_FOLDER_ID
GDRIVE_SERVICE_ACCOUNT_EMAIL
GDRIVE_PRIVATE_KEY
GDRIVE_REFRESH_TOKEN
DOWNLOAD_DIR=/tmp
```

> `DOWNLOAD_DIR` на Cloud Run должен указывать на временную директорию (`/tmp`), т.к. файловая система только для короткого хранения.

`PORT` задавать не нужно — Cloud Run автоматически устанавливает `PORT=8080`, а сервер читает его из `process.env.PORT`.

### 4. Проверка

После деплоя:

```bash
curl https://whitecoding-backend-xxxxx-uc.a.run.app/health
curl https://whitecoding-backend-xxxxx-uc.a.run.app/api/channels
```

Если ответы 200 OK, сервис доступен.

Локальная проверка перед деплоем:

```bash
cd backend
npm install
npm run dev           # слушает http://localhost:4000
curl http://localhost:4000/api/channels
```

### 5. Связка с фронтендом (Netlify)

1. В Netlify → Site settings → Environment variables добавьте:

   ```
   VITE_API_URL=https://whitecoding-backend-xxxxx-uc.a.run.app
   ```

2. Запустите повторный деплой фронтенда (через кнопку **Deploy site** или новый `git push`).
3. После обновления переменной окружения фронт в production будет слать запросы на указанный URL. В dev-режиме `npm run dev` продолжит использовать proxy `/api → http://localhost:4000`.

### 6. Напоминания

- Файл `backend/.env` храните только локально (он уже в `.gitignore`).
- Все реальные ключи и токены задаются через Cloud Run Variables & Secrets и Netlify Environment variables.
- Для повторного деплоя достаточно снова выполнить команду `gcloud run deploy ...`.


