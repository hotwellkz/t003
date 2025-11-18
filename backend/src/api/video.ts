import { Router, Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { sendPromptToSyntx } from "../telegram/syntxService";
import { uploadFileToDrive } from "../googleDrive/driveService";
import {
  createJob,
  getJob,
  updateJob,
  deleteJob,
} from "../models/videoJob";

const router = Router();

// POST /api/video/generate
router.post("/generate", async (req: Request, res: Response) => {
  try {
    const { veoprompt, channelId, ideaText } = req.body;

    if (!veoprompt) {
      return res.status(400).json({ error: "Требуется veoprompt" });
    }

    // Создаём job
    const job = createJob(veoprompt, channelId, ideaText);
    console.log(`[VideoJob] Created job ${job.id}`);

    try {
      // Отправляем промпт в Syntx AI
      const localPath = await sendPromptToSyntx(veoprompt);

      // Обновляем job
      const updatedJob = updateJob(job.id, {
        status: "ready",
        localPath,
      });

      if (!updatedJob) {
        throw new Error(`Failed to update job ${job.id}`);
      }

      console.log(`[VideoJob] Job ${job.id} updated with file: ${localPath}`);
      
      // Проверяем, что файл существует перед возвратом ответа
      if (!fs.existsSync(localPath)) {
        throw new Error(`File does not exist after download: ${localPath}`);
      }

      const fileStat = fs.statSync(localPath);
      console.log(`[VideoJob] File verified: ${localPath}, size: ${fileStat.size} bytes`);

      res.json({
        jobId: job.id,
        status: "ready",
        previewUrl: `/api/video/preview/${job.id}`,
      });
    } catch (error: any) {
      // Обновляем статус на failed
      updateJob(job.id, {
        status: "failed",
      });

      console.error("Ошибка генерации видео:", error);
      const errorMessage = error?.message || error?.toString() || "Неизвестная ошибка";
      res.status(500).json({
        error: "Ошибка при генерации видео",
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      });
    }
  } catch (error: any) {
    console.error("Ошибка:", error);
    const errorMessage = error?.message || error?.toString() || "Неизвестная ошибка";
    res.status(500).json({ 
      error: "Внутренняя ошибка сервера",
      message: errorMessage,
    });
  }
});

// GET /api/video/preview/:id
router.get("/preview/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = getJob(id);

    if (!job) {
      return res.status(404).json({ error: "Job не найден" });
    }

    if (job.status !== "ready" && job.status !== "uploaded") {
      return res.status(400).json({
        error: "Видео ещё не готово или было отклонено",
      });
    }

    if (!job.localPath) {
      console.error(`[VideoJob] Job ${id} has no localPath`);
      return res.status(404).json({ error: "Файл видео не найден (localPath не задан)" });
    }

    if (!fs.existsSync(job.localPath)) {
      console.error(`[VideoJob] File not found for job ${id}: ${job.localPath}`);
      return res.status(404).json({ 
        error: "Файл видео не найден",
        path: job.localPath 
      });
    }

    const fileStat = fs.statSync(job.localPath);
    console.log(`[VideoJob] Streaming video for job ${id}: ${job.localPath}, size: ${fileStat.size} bytes`);

    // Стримим видео
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", fileStat.size);
    fs.createReadStream(job.localPath).pipe(res);
  } catch (error) {
    console.error("Ошибка при стриминге видео:", error);
    res.status(500).json({ error: "Ошибка при загрузке видео" });
  }
});

// POST /api/video/jobs/:id/approve
router.post("/jobs/:id/approve", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = getJob(id);

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
        path: job.localPath 
      });
    }

    const fileStat = fs.statSync(job.localPath);
    console.log(`[VideoJob] Approving job ${id}, file: ${job.localPath}, size: ${fileStat.size} bytes`);

    // Обновляем статус на uploading
    updateJob(id, { status: "uploading" });

    try {
      // Генерируем имя файла
      const fileName = `video_${job.id}_${Date.now()}.mp4`;
      console.log(`[VideoJob] Uploading to Google Drive: ${fileName}`);

      // Загружаем в Google Drive
      const driveResult = await uploadFileToDrive(job.localPath, fileName);
      
      console.log(`[VideoJob] Successfully uploaded to Google Drive: ${driveResult.fileId}`);

      // Обновляем job
      updateJob(id, {
        status: "uploaded",
        driveFileId: driveResult.fileId,
        webViewLink: driveResult.webViewLink,
        webContentLink: driveResult.webContentLink,
      });

      // Опционально: удаляем локальный файл
      // fs.unlinkSync(job.localPath);

      res.json({
        status: "uploaded",
        googleDriveFileId: driveResult.fileId,
        googleDriveWebViewLink: driveResult.webViewLink,
        googleDriveWebContentLink: driveResult.webContentLink,
      });
    } catch (error: any) {
      updateJob(id, { status: "ready" }); // Откатываем статус
      throw error;
    }
  } catch (error: any) {
    console.error("Ошибка при одобрении видео:", error);
    res.status(500).json({
      error: "Ошибка при загрузке в Google Drive",
      message: error.message,
    });
  }
});

// POST /api/video/jobs/:id/reject
router.post("/jobs/:id/reject", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = getJob(id);

    if (!job) {
      return res.status(404).json({ error: "Job не найден" });
    }

    // Удаляем локальный файл
    if (job.localPath && fs.existsSync(job.localPath)) {
      try {
        fs.unlinkSync(job.localPath);
      } catch (error) {
        console.error("Ошибка при удалении файла:", error);
      }
    }

    // Обновляем статус
    updateJob(id, { status: "rejected" });

    res.json({ status: "rejected" });
  } catch (error) {
    console.error("Ошибка при отклонении видео:", error);
    res.status(500).json({ error: "Ошибка при отклонении видео" });
  }
});

// POST /api/video/jobs/:id/regenerate
router.post("/jobs/:id/regenerate", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const oldJob = getJob(id);

    if (!oldJob) {
      return res.status(404).json({ error: "Job не найден" });
    }

    // Можно использовать обновлённый промпт из body или старый
    const veoprompt = req.body.veoprompt || oldJob.prompt;

    // Создаём новый job
    const newJob = createJob(
      veoprompt,
      oldJob.channelId,
      oldJob.ideaText
    );

    try {
      // Генерируем новое видео
      const localPath = await sendPromptToSyntx(veoprompt);

      updateJob(newJob.id, {
        status: "ready",
        localPath,
      });

      res.json({
        jobId: newJob.id,
        status: "ready",
        previewUrl: `/api/video/preview/${newJob.id}`,
      });
    } catch (error: any) {
      updateJob(newJob.id, {
        status: "failed",
      });

      console.error("Ошибка перегенерации видео:", error);
      res.status(500).json({
        error: "Ошибка при перегенерации видео",
        message: error.message,
      });
    }
  } catch (error: any) {
    console.error("Ошибка:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

export default router;

