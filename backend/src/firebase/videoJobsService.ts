import { getFirestore } from "./admin";
import { VideoJob, VideoJobStatus } from "../models/videoJob";

const COLLECTION_NAME = "videoJobs";

/**
 * Создать задачу в Firestore
 */
export async function createJob(job: VideoJob): Promise<VideoJob> {
  try {
    const db = getFirestore();
    const jobRef = db.collection(COLLECTION_NAME).doc(job.id);
    
    await jobRef.set({
      prompt: job.prompt,
      channelId: job.channelId || null,
      channelName: job.channelName || null,
      ideaText: job.ideaText || null,
      videoTitle: job.videoTitle || null,
      localPath: job.localPath || null,
      status: job.status,
      driveFileId: job.driveFileId || null,
      webViewLink: job.webViewLink || null,
      webContentLink: job.webContentLink || null,
      errorMessage: job.errorMessage || null,
      telegramRequestMessageId: job.telegramRequestMessageId || null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });

    console.log(`[Firebase] ✅ VideoJob created: ${job.id}`);
    return job;
  } catch (error: unknown) {
    console.error(`[Firebase] Error creating job ${job.id}:`, error);
    throw new Error(`Ошибка создания задачи: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Получить задачу по ID
 */
export async function getJob(id: string): Promise<VideoJob | undefined> {
  try {
    const db = getFirestore();
    const doc = await db.collection(COLLECTION_NAME).doc(id).get();
    
    if (!doc.exists) {
      return undefined;
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as VideoJob;
  } catch (error: unknown) {
    console.error(`[Firebase] Error getting job ${id}:`, error);
    throw new Error(`Ошибка получения задачи: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Обновить задачу в Firestore
 */
export async function updateJob(id: string, updates: Partial<VideoJob>): Promise<VideoJob | null> {
  try {
    const db = getFirestore();
    const jobRef = db.collection(COLLECTION_NAME).doc(id);
    
    const doc = await jobRef.get();
    if (!doc.exists) {
      return null;
    }

    // Удаляем id из updates, если он там есть
    const { id: _, ...updateData } = updates as any;
    updateData.updatedAt = Date.now();
    
    await jobRef.update(updateData);

    const updatedDoc = await jobRef.get();
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    } as VideoJob;
  } catch (error: unknown) {
    console.error(`[Firebase] Error updating job ${id}:`, error);
    throw new Error(`Ошибка обновления задачи: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Удалить задачу из Firestore
 */
export async function deleteJob(id: string): Promise<boolean> {
  try {
    const db = getFirestore();
    const jobRef = db.collection(COLLECTION_NAME).doc(id);
    
    const doc = await jobRef.get();
    if (!doc.exists) {
      return false;
    }

    await jobRef.delete();
    console.log(`[Firebase] ✅ VideoJob deleted: ${id}`);
    return true;
  } catch (error: unknown) {
    console.error(`[Firebase] Error deleting job ${id}:`, error);
    throw new Error(`Ошибка удаления задачи: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Получить все задачи, опционально отфильтрованные по channelId
 */
export async function getAllJobs(channelId?: string): Promise<VideoJob[]> {
  try {
    const db = getFirestore();
    let query: FirebaseFirestore.Query = db.collection(COLLECTION_NAME);
    
    if (channelId) {
      query = query.where("channelId", "==", channelId);
    }

    const snapshot = await query.get();
    const jobs: VideoJob[] = [];
    
    snapshot.forEach((doc) => {
      jobs.push({
        id: doc.id,
        ...doc.data(),
      } as VideoJob);
    });

    return jobs;
  } catch (error: unknown) {
    console.error("[Firebase] Error getting jobs:", error);
    throw new Error(`Ошибка получения задач: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Получить активные задачи (в процессе генерации)
 */
export async function getActiveJobs(channelId?: string): Promise<VideoJob[]> {
  const activeStatuses: VideoJobStatus[] = ["queued", "sending", "waiting_video", "downloading", "uploading"];
  const jobs = await getAllJobs(channelId);
  return jobs.filter(job => activeStatuses.includes(job.status));
}

/**
 * Подсчитать количество активных задач
 */
export async function countActiveJobs(channelId?: string): Promise<number> {
  const activeJobs = await getActiveJobs(channelId);
  return activeJobs.length;
}

