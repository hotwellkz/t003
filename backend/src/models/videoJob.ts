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
  createdAt: number;
  updatedAt: number; // Время последнего обновления
}

const videoJobs = new Map<string, VideoJob>();

function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createJob(
  prompt: string,
  channelId?: string,
  channelName?: string,
  ideaText?: string,
  videoTitle?: string
): VideoJob {
  const now = Date.now();
  const job: VideoJob = {
    id: generateJobId(),
    prompt,
    channelId,
    channelName,
    ideaText,
    videoTitle,
    status: "queued",
    createdAt: now,
    updatedAt: now,
  };
  videoJobs.set(job.id, job);
  return job;
}

export function getJob(id: string): VideoJob | undefined {
  return videoJobs.get(id);
}

export function updateJob(id: string, updates: Partial<VideoJob>): VideoJob | null {
  const job = videoJobs.get(id);
  if (!job) {
    return null;
  }
  const updated = { ...job, ...updates, updatedAt: Date.now() };
  videoJobs.set(id, updated);
  return updated;
}

export function deleteJob(id: string): boolean {
  return videoJobs.delete(id);
}

/**
 * Получить все задачи, опционально отфильтрованные по channelId
 */
export function getAllJobs(channelId?: string): VideoJob[] {
  const jobs = Array.from(videoJobs.values());
  if (channelId) {
    return jobs.filter(job => job.channelId === channelId);
  }
  return jobs;
}

/**
 * Получить активные задачи (в процессе генерации)
 * Активные статусы: queued, sending, waiting_video, downloading, uploading
 */
export function getActiveJobs(channelId?: string): VideoJob[] {
  const activeStatuses: VideoJobStatus[] = ["queued", "sending", "waiting_video", "downloading", "uploading"];
  const jobs = getAllJobs(channelId);
  return jobs.filter(job => activeStatuses.includes(job.status));
}

/**
 * Подсчитать количество активных задач
 */
export function countActiveJobs(channelId?: string): number {
  return getActiveJobs(channelId).length;
}

