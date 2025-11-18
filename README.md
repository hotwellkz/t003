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

# Google Drive
GDRIVE_FOLDER_ID=id_папки_в_google_drive
GDRIVE_SERVICE_ACCOUNT_EMAIL=email_сервисного_аккаунта
GDRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# HTTP сервер
PORT=4000
```

#### Как получить Telegram API credentials:

1. Перейдите на https://my.telegram.org/apps
2. Войдите в свой аккаунт
3. Создайте приложение и получите `api_id` и `api_hash`

#### Как настроить Google Drive:

1. Создайте проект в Google Cloud Console
2. Включите Google Drive API
3. Создайте сервисный аккаунт и скачайте JSON ключ
4. Скопируйте `client_email` в `GDRIVE_SERVICE_ACCOUNT_EMAIL`
5. Скопируйте `private_key` в `GDRIVE_PRIVATE_KEY` (с `\n` для переносов строк)
6. Получите ID папки в Google Drive и укажите в `GDRIVE_FOLDER_ID`
7. Поделитесь папкой с email сервисного аккаунта (дайте права редактора)

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
   - Сгенерируйте идеи
   - Выберите идею и отредактируйте промпт при необходимости
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

## Технологии

- **Backend**: Node.js, TypeScript, Express
- **Frontend**: React, TypeScript, Vite
- **Telegram**: GramJS (telegram)
- **Google Drive**: googleapis
- **Хранение данных**: In-memory (можно заменить на БД)

## Примечания

- Данные хранятся в памяти (in-memory), при перезапуске сервера они сбросятся
- Для продакшена рекомендуется использовать базу данных (PostgreSQL, MongoDB и т.д.)
- Генерация идей использует простую заглушку - можно заменить на LLM API (OpenAI, Anthropic и т.д.)
- Видео скачиваются локально в папку `downloads/` (можно настроить через `DOWNLOAD_DIR`)

