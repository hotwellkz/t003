export type VideoJobStatus =
  | "queued"           // Задача в очереди
  | "sending"          // Отправка промпта в Syntx
  | "waiting_video"    // Ожидание видео от Syntx
  | "downloading"      // Скачивание видео
  | "ready"            // Видео готово
  | "uploading"        // Загрузка в Google Drive
  | "uploaded"         // Загружено в Google Drive
  | "rejected"         // Отклонено пользователем
  | "error";           // Ошибка

export interface VideoJob {
  id: string;
  prompt: string;
  channelId?: string;
  channelName?: string; // Название канала для удобства
  ideaText?: string;
  videoTitle?: string; // Название видео для именования файла
  localPath?: string; // Путь к локальному файлу
  status: VideoJobStatus;
  driveFileId?: string;
  webViewLink?: string;
  webContentLink?: string;
  errorMessage?: string; // Сообщение об ошибке
  telegramRequestMessageId?: number; // ID сообщения, отправленного в Telegram (для связи с ответом)
  generationId?: string; // Уникальный идентификатор генерации (для отладки и связи запрос-ответ)
  createdAt: number;
  updatedAt: number; // Время последнего обновления
}

/**
 * Генерирует уникальный ID для задачи
 * Формат: job_<timestamp>_<random>_<counter>
 * Это гарантирует уникальность даже при одновременных запросах
 */
function generateJobId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  const counter = Math.floor(Math.random() * 10000); // Дополнительная защита от коллизий
  return `job_${timestamp}_${random}_${counter}`;
}

/**
 * Генерирует уникальный generationId для связи запроса с ответом
 * Формат: gen_<timestamp>_<random>
 */
function generateGenerationId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 12);
  return `gen_${timestamp}_${random}`;
}

// Импортируем функции из Firebase сервиса
import {
  createJob as createJobInFirestore,
  getJob as getJobFromFirestore,
  updateJob as updateJobInFirestore,
  deleteJob as deleteJobFromFirestore,
  getAllJobs as getAllJobsFromFirestore,
  getActiveJobs as getActiveJobsFromFirestore,
  countActiveJobs as countActiveJobsFromFirestore,
} from "../firebase/videoJobsService";

/**
 * Создать задачу (обёртка для совместимости)
 */
export async function createJob(
  prompt: string,
  channelId?: string,
  channelName?: string,
  ideaText?: string,
  videoTitle?: string
): Promise<VideoJob> {
  const now = Date.now();
  const job: VideoJob = {
    id: generateJobId(),
    generationId: generateGenerationId(), // Уникальный ID для связи запроса с ответом
    prompt,
    channelId,
    channelName,
    ideaText,
    videoTitle,
    status: "queued",
    createdAt: now,
    updatedAt: now,
  };
  console.log(`[VideoJob] Created job ${job.id} with generationId ${job.generationId}, prompt: "${prompt.substring(0, 50)}..."`);
  return await createJobInFirestore(job);
}

// Экспортируем остальные функции
export { getJobFromFirestore as getJob };
export { updateJobInFirestore as updateJob };
export { deleteJobFromFirestore as deleteJob };
export { getAllJobsFromFirestore as getAllJobs };
export { getActiveJobsFromFirestore as getActiveJobs };
export { countActiveJobsFromFirestore as countActiveJobs };

