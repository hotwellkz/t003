export type VideoJobStatus =
  | "generating"
  | "ready"
  | "uploading"
  | "uploaded"
  | "rejected"
  | "failed";

export interface VideoJob {
  id: string;
  prompt: string;
  channelId?: string;
  ideaText?: string;
  localPath?: string;
  status: VideoJobStatus;
  driveFileId?: string;
  webViewLink?: string;
  webContentLink?: string;
  createdAt: number;
}

const videoJobs = new Map<string, VideoJob>();

function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createJob(
  prompt: string,
  channelId?: string,
  ideaText?: string
): VideoJob {
  const job: VideoJob = {
    id: generateJobId(),
    prompt,
    channelId,
    ideaText,
    status: "generating",
    createdAt: Date.now(),
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
  const updated = { ...job, ...updates };
  videoJobs.set(id, updated);
  return updated;
}

export function deleteJob(id: string): boolean {
  return videoJobs.delete(id);
}

