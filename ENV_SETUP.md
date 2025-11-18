# Настройка переменных окружения

Создайте файл `.env` в папке `backend/` со следующим содержимым:

```env
# Telegram (GramJS)
TELEGRAM_API_ID=
TELEGRAM_API_HASH=
TELEGRAM_STRING_SESSION=
SYNTX_BOT_USERNAME=syntxaibot
DOWNLOAD_DIR=./downloads

# Для первичного интерактивного логина (если нужно)
TELEGRAM_PHONE_NUMBER=
TELEGRAM_2FA_PASSWORD=

# Google Drive
GDRIVE_FOLDER_ID=
GDRIVE_SERVICE_ACCOUNT_EMAIL=
GDRIVE_PRIVATE_KEY=

# HTTP сервер
PORT=4000
```

## Как получить значения:

### Telegram API credentials:
1. Перейдите на https://my.telegram.org/apps
2. Войдите в свой аккаунт
3. Создайте приложение и получите `api_id` и `api_hash`
4. При первом запуске backend попросит авторизоваться, после чего скопируйте `TELEGRAM_STRING_SESSION` из консоли

### Google Drive:
1. Создайте проект в Google Cloud Console
2. Включите Google Drive API
3. Создайте сервисный аккаунт и скачайте JSON ключ
4. Скопируйте `client_email` в `GDRIVE_SERVICE_ACCOUNT_EMAIL`
5. Скопируйте `private_key` в `GDRIVE_PRIVATE_KEY` (с `\n` для переносов строк)
6. Получите ID папки в Google Drive и укажите в `GDRIVE_FOLDER_ID`
7. Поделитесь папкой с email сервисного аккаунта (дайте права редактора)

