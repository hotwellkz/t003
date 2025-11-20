import { Router, Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { sendPromptToSyntx } from "../telegram/syntxService";
import { uploadFileToDrive } from "../googleDrive/driveService";
import {
  createJob,
  getJob,
  updateJob,
  getAllJobs,
  countActiveJobs,
  VideoJobStatus,
} from "../models/videoJob";
import { getChannelById } from "../models/channel";
import { getSafeFileName } from "../utils/fileNameSanitizer";
import * as admin from "firebase-admin";

const router = Router();

const MAX_ACTIVE_JOBS = 2;

/**
 * Асинхронная функция для обработки генерации видео
 */
async function processVideoGeneration(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job) {
    console.error(`[VideoJob] Job ${jobId} not found for processing`);
    return;
  }
  
  console.log(`[VideoJob] 🚀 Starting video generation for job ${jobId} (generationId: ${job.generationId || 'none'}), prompt: "${job.prompt.substring(0, 50)}..."`);

  try {
    // Статус: sending - отправка промпта
    await updateJob(jobId, { status: "sending" });
    console.log(`[VideoJob] Job ${jobId} (generationId: ${job.generationId || 'none'}): sending prompt to Syntx`);

    // Формируем безопасное имя файла из videoTitle + job.id для уникальности
    // КРИТИЧНО: Добавляем job.id в имя файла, чтобы при параллельной генерации
    // с одинаковым videoTitle файлы не перезаписывали друг друга
    let safeFileName: string | undefined;
    if (job.videoTitle) {
      const baseFileName = getSafeFileName(job.videoTitle);
      // Добавляем короткий хеш из job.id для уникальности
      const jobIdHash = job.id.split('_').pop()?.substring(0, 8) || job.id.substring(0, 8);
      safeFileName = `${baseFileName.replace('.mp4', '')}_${jobIdHash}.mp4`;
    } else {
      // Если нет videoTitle, используем job.id для уникальности
      const jobIdHash = job.id.split('_').pop()?.substring(0, 8) || job.id.substring(0, 8);
      safeFileName = `video_${jobIdHash}_${Date.now()}.mp4`;
    }

    console.log(`[VideoJob] Job ${jobId} (generationId: ${job.generationId}): using filename "${safeFileName}"`);

    // Статус: waiting_video - ожидание видео
    updateJob(jobId, { status: "waiting_video" });
    console.log(`[VideoJob] Job ${jobId} (generationId: ${job.generationId}): waiting for video from Syntx`);

    // Отправляем промпт в Syntx AI и ждём видео
    // Используем существующий requestMessageId, если он есть (для повторных попыток)
    const existingRequestMessageId = job.telegramRequestMessageId;
    console.log(`[VideoJob] Job ${jobId} (generationId: ${job.generationId}): sending prompt to Syntx, existingRequestMessageId: ${existingRequestMessageId || 'none'}`);
    const syntxResult = await sendPromptToSyntx(job.prompt, safeFileName, existingRequestMessageId);

    // Сохраняем requestMessageId для связи с ответом
    await updateJob(jobId, { telegramRequestMessageId: syntxResult.requestMessageId });
    console.log(`[VideoJob] Job ${jobId} (generationId: ${job.generationId}): saved telegramRequestMessageId: ${syntxResult.requestMessageId}`);

    // Статус: downloading - скачивание
    await updateJob(jobId, { status: "downloading" });
    console.log(`[VideoJob] Job ${jobId}: downloading video`);

    // Проверяем, что файл существует
    if (!fs.existsSync(syntxResult.localPath)) {
      throw new Error(`File does not exist after download: ${syntxResult.localPath}`);
    }

    const fileStat = fs.statSync(syntxResult.localPath);
    console.log(`[VideoJob] Job ${jobId} (generationId: ${job.generationId}): file verified, size: ${fileStat.size} bytes, path: ${syntxResult.localPath}`);

    // Статус: ready - готово
    await updateJob(jobId, {
      status: "ready",
      localPath: syntxResult.localPath,
    });

    console.log(`[VideoJob] ✅ Job ${jobId} (generationId: ${job.generationId}) completed successfully`);
    console.log(`[VideoJob] Job ${jobId} final state: status=ready, localPath=${syntxResult.localPath}, telegramRequestMessageId=${syntxResult.requestMessageId}`);
  } catch (error: any) {
    console.error(`[VideoJob] Job ${jobId} error:`, error);
    const errorMessage = error?.message || error?.toString() || "Неизвестная ошибка";
    await updateJob(jobId, {
      status: "error",
      errorMessage,
    });
  }
}

/**
 * POST /api/video-jobs
 * Создать новую задачу генерации видео
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { prompt, channelId, channelName, ideaText, videoTitle } = req.body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({ error: "Требуется поле prompt (непустая строка)" });
    }

    // Проверяем лимит активных задач
    const activeCount = await countActiveJobs(channelId);
    if (activeCount >= MAX_ACTIVE_JOBS) {
      return res.status(429).json({
        error: "MAX_ACTIVE_JOBS_REACHED",
        message: `Можно генерировать не более ${MAX_ACTIVE_JOBS} видео одновременно.`,
        activeCount,
        maxActiveJobs: MAX_ACTIVE_JOBS,
      });
    }

    // Создаём задачу
    const job = await createJob(
      prompt.trim(),
      channelId,
      channelName,
      ideaText,
      videoTitle
    );

    console.log(`[VideoJob] Created job ${job.id}, channelId: ${channelId || "не указан"}, videoTitle: ${videoTitle || "не указано"}`);

    // Запускаем асинхронную обработку (не ждём завершения)
    processVideoGeneration(job.id).catch((error) => {
      console.error(`[VideoJob] Unhandled error in processVideoGeneration for job ${job.id}:`, error);
    });

    // Возвращаем информацию о созданной задаче
    res.status(201).json({
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
    });
  } catch (error: any) {
    console.error("[VideoJob] Error creating job:", error);
    const errorMessage = error?.message || error?.toString() || "Неизвестная ошибка";
    res.status(500).json({
      error: "Внутренняя ошибка сервера",
      message: errorMessage,
    });
  }
});

/**
 * GET /api/video-jobs
 * Получить список задач (опционально отфильтрованных по channelId)
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { channelId } = req.query;
    const channelIdStr = channelId ? String(channelId) : undefined;

    const jobs = await getAllJobs(channelIdStr);
    
    // Логируем для отладки параллельной генерации
    console.log(`[VideoJob] GET /api/video-jobs: found ${jobs.length} jobs for channelId=${channelIdStr || 'all'}`);
    jobs.forEach((job) => {
      console.log(`[VideoJob] Job ${job.id} (generationId: ${job.generationId || 'none'}): status=${job.status}, localPath=${job.localPath || 'none'}, prompt="${job.prompt.substring(0, 30)}..."`);
    });
    
    // Сортируем по createdAt (новые сверху) и ограничиваем последними 20
    const sortedJobs = jobs
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20)
      .map(job => ({
        id: job.id,
        prompt: job.prompt,
        channelId: job.channelId,
        channelName: job.channelName,
        videoTitle: job.videoTitle,
        status: job.status,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        previewUrl: (job.status === "ready" || job.status === "uploaded") && job.localPath
          ? `/api/video-jobs/${job.id}/preview`
          : undefined,
        driveFileId: job.driveFileId,
        webViewLink: job.webViewLink,
        webContentLink: job.webContentLink,
        generationId: job.generationId, // Добавляем для отладки на фронтенде
      }));

    res.json({
      jobs: sortedJobs,
      activeCount: await countActiveJobs(channelIdStr),
      maxActiveJobs: MAX_ACTIVE_JOBS,
    });
  } catch (error: any) {
    console.error("[VideoJob] Error getting jobs:", error);
    res.status(500).json({
      error: "Внутренняя ошибка сервера",
      message: error?.message || "Неизвестная ошибка",
    });
  }
});

/**
 * GET /api/video-jobs/:id/preview
 * Получить превью видео (стриминг файла)
 * ВАЖНО: Этот маршрут должен быть определён ПЕРЕД общим маршрутом /:id
 */
router.get("/:id/preview", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await getJob(id);

    if (!job) {
      return res.status(404).json({ error: "Job не найден" });
    }

    if (job.status !== "ready" && job.status !== "uploaded") {
      return res.status(400).json({
        error: "Видео ещё не готово или было отклонено",
      });
    }

    if (!job.localPath || !fs.existsSync(job.localPath)) {
      return res.status(404).json({ error: "Файл видео не найден" });
    }

    const fileStat = fs.statSync(job.localPath);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", fileStat.size);
    fs.createReadStream(job.localPath).pipe(res);
  } catch (error) {
    console.error("Ошибка при стриминге видео:", error);
    res.status(500).json({ error: "Ошибка при загрузке видео" });
  }
});

/**
 * POST /api/video-jobs/:id/approve
 * Одобрить и загрузить видео в Google Drive
 * ВАЖНО: Этот маршрут должен быть определён ПЕРЕД общим маршрутом /:id
 */
router.post("/:id/approve", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { videoTitle } = req.body;
    const job = await getJob(id);

    if (!job) {
      return res.status(404).json({ error: "Job не найден" });
    }

    if (job.status !== "ready") {
      return res.status(400).json({
        error: "Можно одобрить только job со статусом 'ready'",
      });
    }

    if (!job.localPath) {
      console.error(`[VideoJob] Job ${id} has no localPath for approval`);
      return res.status(404).json({ error: "Файл видео не найден (localPath не задан)" });
    }

    if (!fs.existsSync(job.localPath)) {
      console.error(`[VideoJob] File not found for approval (job ${id}): ${job.localPath}`);
      return res.status(404).json({
        error: "Файл видео не найден",
        path: job.localPath,
      });
    }

    const fileStat = fs.statSync(job.localPath);
    console.log(`[VideoJob] Approving job ${id}, file: ${job.localPath}, size: ${fileStat.size} bytes`);

    // Обновляем title в job, если передан новый
    const finalTitle = videoTitle && videoTitle.trim() ? videoTitle.trim() : job.videoTitle;
    if (finalTitle && finalTitle !== job.videoTitle) {
      await updateJob(id, { videoTitle: finalTitle });
      console.log(`[VideoJob] Updated title for job ${id}: ${finalTitle}`);
    }

    // Обновляем статус на uploading
    await updateJob(id, { status: "uploading" });

    try {
      // Генерируем имя файла из videoTitle или используем дефолтное
      const fileName = finalTitle
        ? getSafeFileName(finalTitle)
        : `video_${job.id}_${Date.now()}.mp4`;
      console.log(`[VideoJob] Uploading to Google Drive: ${fileName}`);

      // Определяем папку Google Drive: сначала из канала, затем из .env
      let targetFolderId: string | null | undefined = null;
      if (job.channelId) {
        const channel = await getChannelById(job.channelId);
        if (channel && channel.gdriveFolderId) {
          targetFolderId = channel.gdriveFolderId;
          console.log(`[VideoJob] Using folder from channel ${job.channelId}: ${targetFolderId}`);
        } else {
          console.log(`[VideoJob] Channel ${job.channelId} has no gdriveFolderId, using default from .env`);
        }
      } else {
        console.log(`[VideoJob] No channelId, using default folder from .env`);
      }

      // Загружаем в Google Drive
      const driveResult = await uploadFileToDrive(job.localPath, fileName, targetFolderId);

      console.log(`[VideoJob] Successfully uploaded to Google Drive: ${driveResult.fileId}`);

      // Обновляем job
      await updateJob(id, {
        status: "uploaded",
        driveFileId: driveResult.fileId,
        webViewLink: driveResult.webViewLink,
        webContentLink: driveResult.webContentLink,
      });

      res.json({
        status: "uploaded",
        googleDriveFileId: driveResult.fileId,
        googleDriveWebViewLink: driveResult.webViewLink,
        googleDriveWebContentLink: driveResult.webContentLink,
      });
    } catch (error: any) {
      await updateJob(id, { status: "ready" }); // Откатываем статус
      throw error;
    }
  } catch (error: any) {
    console.error("Ошибка при одобрении видео:", error);
    res.status(500).json({
      error: "Ошибка при загрузке в Google Drive",
      message: error?.message || "Неизвестная ошибка",
    });
  }
});

/**
 * POST /api/video-jobs/:id/reject
 * Отклонить видео
 * ВАЖНО: Этот маршрут должен быть определён ПЕРЕД общим маршрутом /:id
 */
router.post("/:id/reject", async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    console.log(`[VideoJob] Reject request received for job ${id}`);

    const job = await getJob(id);

    if (!job) {
      console.error(`[VideoJob] Job ${id} not found for rejection`);
      return res.status(404).json({ 
        error: "Job не найден",
        jobId: id,
      });
    }

    console.log(`[VideoJob] Rejecting job ${id}, current status: ${job.status}, localPath: ${job.localPath || 'не указан'}`);

    // Удаляем локальный файл, если есть
    if (job.localPath) {
      try {
        if (fs.existsSync(job.localPath)) {
          fs.unlinkSync(job.localPath);
          console.log(`[VideoJob] ✅ Deleted local file for rejected job ${id}: ${job.localPath}`);
        } else {
          console.log(`[VideoJob] ⚠️  Local file path specified but file does not exist: ${job.localPath}`);
        }
      } catch (unlinkError: any) {
        console.error(`[VideoJob] ⚠️  Error deleting file for job ${id}:`, unlinkError?.message || unlinkError);
        // Не прерываем выполнение, если файл не удалось удалить
        // На Cloud Run файлы могут быть уже удалены или недоступны
      }
    }

    // Обновляем статус в Firestore
    // Используем updateJob, который автоматически конвертирует undefined в null
    try {
      const updateResult = await updateJob(id, {
        status: "rejected",
        localPath: undefined, // updateJob конвертирует undefined в null для Firestore
      });

      if (!updateResult) {
        console.error(`[VideoJob] ⚠️  updateJob returned null for job ${id}`);
        return res.status(404).json({
          error: "Job не найден в базе данных",
          jobId: id,
        });
      }

      console.log(`[VideoJob] ✅ Job ${id} successfully rejected, new status: ${updateResult.status}`);
    } catch (updateError: any) {
      console.error(`[VideoJob] ❌ Error updating job ${id} in Firestore:`, updateError);
      throw new Error(`Ошибка обновления задачи в базе данных: ${updateError?.message || String(updateError)}`);
    }

    res.json({ 
      status: "rejected",
      jobId: id,
    });
  } catch (error: any) {
    console.error(`[VideoJob] ❌ Error rejecting job ${id}:`, error);
    console.error(`[VideoJob] Error stack:`, error?.stack);
    const errorMessage = error?.message || error?.toString() || "Неизвестная ошибка";
    res.status(500).json({
      error: "Ошибка при отклонении видео",
      message: errorMessage,
      jobId: id,
    });
  }
});

export default router;

