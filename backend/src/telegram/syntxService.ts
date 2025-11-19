import { TelegramClient, Api } from "telegram";
import * as fs from "fs";
import * as path from "path";
import { getTelegramClient } from "./client";

export async function sendPromptToSyntx(
  prompt: string,
  customFileName?: string
): Promise<string> {
  const client = await getTelegramClient();
  const botUsername = process.env.SYNTX_BOT_USERNAME || "syntxaibot";

  try {
    // Проверяем, что клиент авторизован
    const isAuthorized = await client.checkAuthorization();
    if (!isAuthorized) {
      throw new Error("Telegram клиент не авторизован. Выполните авторизацию перед использованием.");
    }

    console.log(`[Syntx] Проверяем доступность бота ${botUsername}...`);
    
    // Получаем чат бота
    const entity = await client.getEntity(botUsername);
    
    // Отправляем промпт
    console.log(`[Syntx] Отправляем промпт боту ${botUsername}...`);
    const sentMessage = await client.sendMessage(entity, { message: prompt });
    const sinceMessageId = sentMessage.id;

    console.log(`[Syntx] ✅ Промпт отправлен боту ${botUsername}, message ID: ${sinceMessageId}`);
    console.log(`[Syntx] Ожидаем видео (таймаут: 15 минут)...`);

    // Ждём видеосообщение
    const videoMessage = await waitForSyntxVideo(
      client,
      entity,
      sinceMessageId,
      15 * 60 * 1000 // 15 минут
    );

    // Подготавливаем директорию для загрузок с абсолютным путём
    const downloadRoot = process.env.DOWNLOAD_DIR || "./downloads";
    const downloadDir = path.resolve(downloadRoot);
    
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
      console.log(`[Syntx] Создана директория для загрузок: ${downloadDir}`);
    }
    
    console.log(`[Syntx] Download directory: ${downloadDir}`);

    // Генерируем имя файла (используем customFileName если указан, иначе дефолтное)
    const timestamp = Date.now();
    const fileName = customFileName || `syntx_${timestamp}.mp4`;
    const filePath = path.join(downloadDir, fileName);
    
    console.log(`[Syntx] Target file path: ${filePath}`);

    // Логируем информацию о медиа перед скачиванием
    console.log("[Syntx] Message media info:", {
      messageId: videoMessage.id,
      hasMedia: !!videoMessage.media,
      mediaType: videoMessage.media?.constructor?.name || "unknown",
    });

    // Скачиваем видео с проверкой результата
    console.log("[Syntx] Starting download...");
    
    try {
      // Пробуем скачать через опцию file
      await client.downloadMedia(videoMessage, {
        file: filePath,
      });

      // Проверяем, что файл реально появился
      await new Promise((resolve) => setTimeout(resolve, 500)); // Небольшая задержка для завершения записи
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`File was not created at ${filePath}`);
      }

      const stat = fs.statSync(filePath);
      console.log(`[Syntx] File downloaded, size: ${stat.size} bytes`);
      
      if (stat.size === 0) {
        throw new Error("Downloaded file has size 0 bytes");
      }

      console.log(`[Syntx] ✅ Видео успешно скачано: ${filePath}`);
      return filePath;
    } catch (err: any) {
      console.error("[Syntx] Error while downloading media (file mode):", err);
      
      // Если опция file не сработала, пробуем через Buffer
      console.log("[Syntx] Trying buffer mode...");
      
      try {
        const buffer = (await client.downloadMedia(videoMessage, {})) as Buffer;
        
        if (!buffer || !buffer.length) {
          throw new Error("downloadMedia returned empty buffer");
        }

        fs.writeFileSync(filePath, buffer);
        const stat = fs.statSync(filePath);
        console.log(`[Syntx] File saved (buffer mode), size: ${stat.size} bytes`);
        
        if (stat.size === 0) {
          throw new Error("Saved file has size 0 bytes");
        }

        console.log(`[Syntx] ✅ Видео успешно скачано (buffer mode): ${filePath}`);
        return filePath;
      } catch (bufferErr: any) {
        console.error("[Syntx] Error while downloading media (buffer mode):", bufferErr);
        throw new Error(`Failed to download media: ${err.message || err}. Buffer mode also failed: ${bufferErr.message || bufferErr}`);
      }
    }
  } catch (error: any) {
    console.error("Ошибка в sendPromptToSyntx:", error);
    
    // Специальная обработка ошибки авторизации
    if (error.errorMessage === 'AUTH_KEY_UNREGISTERED' || error.message?.includes('AUTH_KEY_UNREGISTERED')) {
      throw new Error("Telegram клиент не авторизован. Выполните авторизацию в консоли backend сервера и перезапустите сервер.");
    }
    
    throw new Error(`Ошибка при работе с Telegram ботом: ${error.message || error}`);
  }
}

async function waitForSyntxVideo(
  client: TelegramClient,
  chat: Api.TypeEntityLike,
  sinceMessageId: number,
  timeoutMs: number
): Promise<Api.Message> {
  const startTime = Date.now();
  const pollInterval = 10000; // 10 секунд
  const botUsername = process.env.SYNTX_BOT_USERNAME || "syntxaibot";

  while (Date.now() - startTime < timeoutMs) {
    try {
      // Получаем последние сообщения из диалога с ботом
      const messages = await client.getMessages(chat, {
        limit: 20,
      });

      // Ищем видеосообщение после sinceMessageId
      for (const message of messages) {
        if (message.id <= sinceMessageId) {
          continue;
        }

        // Проверяем, что сообщение от бота (не от нас)
        const fromId = message.fromId;
        if (fromId) {
          try {
            const sender = await client.getEntity(fromId);
            // Проверяем, что это сообщение от бота, а не от нас
            if (sender instanceof Api.User) {
              const senderUsername = sender.username?.toLowerCase();
              const expectedUsername = botUsername.toLowerCase().replace('@', '');
              if (senderUsername !== expectedUsername) {
                // Это не от нужного бота, пропускаем
                continue;
              }
            }
          } catch (e) {
            // Если не удалось получить информацию об отправителе, продолжаем проверку
          }
        }

        // Проверяем, есть ли видео
        if (message.media) {
          if (message.media instanceof Api.MessageMediaDocument) {
            const document = message.media.document;
            if (document instanceof Api.Document) {
              for (const attr of document.attributes) {
                if (attr instanceof Api.DocumentAttributeVideo) {
                  console.log(`[Syntx] ✅ Видео получено от бота ${botUsername}, message ID: ${message.id}`);
                  console.log(`[Syntx] Video info: duration=${attr.duration}s, size=${document.size} bytes`);
                  return message as Api.Message;
                }
              }
            }
          } else if (message.media instanceof Api.MessageMediaPhoto) {
            // Пропускаем фото
            continue;
          }
        }
      }

      // Ждём перед следующей проверкой
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    } catch (error) {
      console.error("Ошибка при ожидании видео:", error);
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  throw new Error(
    `Таймаут ожидания видео от бота ${botUsername} (${timeoutMs / 1000} секунд)`
  );
}

