# WhiteCoding Studio

Приложение для автоматизации генерации коротких видео через Syntx AI (Telegram) и загрузки их в Google Drive после ручного одобрения.

## Структура проекта

```
.
├── backend/          # Node.js + TypeScript backend
│   ├── src/
│   │   ├── telegram/     # Модуль работы с Telegram (GramJS)
│   │   ├── googleDrive/  # Модуль работы с Google Drive
│   │   ├── models/       # Модели данных (каналы, видео-джобы)
│   │   ├── api/          # REST API роуты
│   │   └── server.ts     # Главный сервер
│   ├── package.json
│   └── tsconfig.json
├── frontend/        # React + TypeScript frontend
│   ├── src/
│   │   ├── components/   # React компоненты
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
└── .env.example     # Пример файла с переменными окружения
```

## Установка и запуск

### 1. Установка зависимостей

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Настройка переменных окружения

Создайте файл `.env` в корне проекта (или в папке `backend/`) на основе `.env.example`:

```env
# Telegram (GramJS)
TELEGRAM_API_ID=ваш_api_id
TELEGRAM_API_HASH=ваш_api_hash
TELEGRAM_STRING_SESSION=
SYNTX_BOT_USERNAME=syntxaibot
DOWNLOAD_DIR=./downloads

# Для первичного интерактивного логина (если нужно)
TELEGRAM_PHONE_NUMBER=
TELEGRAM_2FA_PASSWORD=

# Google Drive (OAuth2)
GDRIVE_CLIENT_ID=ваш_client_id
GDRIVE_CLIENT_SECRET=ваш_client_secret
GDRIVE_REFRESH_TOKEN=ваш_refresh_token
GDRIVE_FOLDER_ID=id_папки_в_google_drive

# OpenAI API (для генерации идей, промптов и транскрипции голоса)
OPENAI_API_KEY=ваш_openai_api_key

# HTTP сервер
PORT=4000
```

#### Как получить Telegram API credentials:

1. Перейдите на https://my.telegram.org/apps
2. Войдите в свой аккаунт
3. Создайте приложение и получите `api_id` и `api_hash`

#### Как настроить Google Drive (OAuth2):

1. **Создайте OAuth 2.0 Client в Google Cloud Console:**
   - Перейдите на https://console.cloud.google.com/
   - Выберите проект (или создайте новый)
   - Перейдите в "APIs & Services" → "Credentials"
   - Нажмите "Create Credentials" → "OAuth client ID"
   - Если впервые: настройте OAuth consent screen (выберите "External" и заполните обязательные поля)
   - Выберите тип приложения: "Desktop app" или "Web application"
   - Добавьте Authorized redirect URIs: `http://localhost:3000/oauth2callback`
   - Скопируйте `Client ID` и `Client secret`

2. **Получите refresh_token:**
   ```bash
   cd backend
   npm run get-drive-token
   ```
   - Скрипт выведет OAuth-ссылку для авторизации (содержит все необходимые параметры, включая `response_type=code`)
   - Откройте ссылку в браузере и авторизуйтесь в Google
   - Разрешите доступ к Google Drive
   - После авторизации скрипт автоматически получит код через локальный сервер и обменяет его на refresh_token
   - Скрипт автоматически добавит `GDRIVE_REFRESH_TOKEN` в `.env` файл
   - Если автоматическое обновление не сработало, скопируйте `GDRIVE_REFRESH_TOKEN` из консоли в `.env` вручную

3. **Настройте папку:**
   - Создайте папку в вашем Google Drive
   - Откройте папку и скопируйте ID из URL: `https://drive.google.com/drive/folders/ВАШ_ID`
   - Укажите ID в `GDRIVE_FOLDER_ID`

### 3. Первичная авторизация в Telegram

При первом запуске backend попросит авторизоваться в Telegram:

```bash
cd backend
npm run dev
```

Введите номер телефона и код из Telegram. После успешной авторизации скопируйте `TELEGRAM_STRING_SESSION` из консоли в `.env` файл.

### 4. Запуск приложения

#### Backend (в одном терминале):

```bash
cd backend
npm run dev
```

Сервер запустится на `http://localhost:4000`

#### Frontend (в другом терминале):

```bash
cd frontend
npm run dev
```

Frontend запустится на `http://localhost:3000`

## Использование

1. Откройте `http://localhost:3000` в браузере
2. Перейдите во вкладку "Настройки каналов" и создайте каналы (или используйте предустановленные)
3. Перейдите во вкладку "Генерация видео":
   - Выберите канал
   - Выберите один из трёх вариантов:
     1. **"Предложить свою идею"** (голосом/текстом):
        - Нажмите кнопку с микрофоном
        - Нажмите на микрофон и надиктуйте идею (используется OpenAI Whisper для распознавания речи)
        - После распознавания текст появится в текстовом поле
        - Нажмите "Сгенерировать промпт" для создания финального промпта
     2. **"Сгенерировать идеи"** (через AI):
        - Нажмите кнопку для автоматической генерации идей через OpenAI
        - Выберите понравившуюся идею из списка
        - Промпт и название видео будут сгенерированы автоматически
     3. **"Вставить готовый промпт"** (прямой ввод):
        - Нажмите кнопку для вставки уже подготовленного промпта для Veo 3.1 Fast
        - Вставьте промпт в модальное окно
        - Нажмите "Продолжить к генерации" — сразу перейдёте к шагу генерации видео
   - На шаге 3 отредактируйте промпт при необходимости
   - Нажмите "Сгенерировать видео"
   - Дождитесь генерации (может занять несколько минут)
   - Просмотрите видео и одобрите/отклоните/перегенерируйте

## API Endpoints

- `GET /api/channels` - Получить список каналов
- `POST /api/channels` - Создать канал
- `DELETE /api/channels/:id` - Удалить канал
- `POST /api/ideas/generate` - Сгенерировать идеи для канала
- `POST /api/prompts/veo` - Сгенерировать промпт для Veo
- `POST /api/video/generate` - Сгенерировать видео
- `GET /api/video/preview/:id` - Получить превью видео
- `POST /api/video/jobs/:id/approve` - Одобрить и загрузить в Google Drive
- `POST /api/video/jobs/:id/reject` - Отклонить видео
- `POST /api/video/jobs/:id/regenerate` - Перегенерировать видео
- `POST /api/transcribe-idea` - Транскрибировать аудио в текст (OpenAI Whisper)
- `POST /api/generate-title` - Сгенерировать название видео на основе промпта (OpenAI)

## Технологии

- **Backend**: Node.js, TypeScript, Express
- **Frontend**: React, TypeScript, Vite
- **Telegram**: GramJS (telegram)
- **Google Drive**: googleapis
- **OpenAI**: OpenAI API (для генерации идей, промптов и транскрипции голоса через Whisper)
- **Голосовой ввод**: MediaRecorder API (frontend) + OpenAI Whisper (backend)
- **Хранение данных**: In-memory (можно заменить на БД)

## Примечания

- Данные хранятся в памяти (in-memory), при перезапуске сервера они сбросятся
- Для продакшена рекомендуется использовать базу данных (PostgreSQL, MongoDB и т.д.)
- Генерация идей и промптов использует OpenAI API (gpt-4o-mini)
- Голосовой ввод использует OpenAI Whisper для транскрипции речи (более надёжно, чем браузерный SpeechRecognition)
- Видео скачиваются локально в папку `downloads/` (можно настроить через `DOWNLOAD_DIR`)

