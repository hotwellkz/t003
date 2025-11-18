import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

export interface DriveUploadResult {
  fileId: string;
  webViewLink?: string;
  webContentLink?: string;
}

export async function uploadFileToDrive(
  localPath: string,
  fileName?: string
): Promise<DriveUploadResult> {
  const serviceAccountEmail = process.env.GDRIVE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GDRIVE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const folderId = process.env.GDRIVE_FOLDER_ID;

  if (!serviceAccountEmail || !privateKey || !folderId) {
    throw new Error(
      "GDRIVE_SERVICE_ACCOUNT_EMAIL, GDRIVE_PRIVATE_KEY и GDRIVE_FOLDER_ID должны быть заданы в .env"
    );
  }

  // Авторизация через JWT
  const auth = new google.auth.JWT(
    serviceAccountEmail,
    undefined,
    privateKey,
    ["https://www.googleapis.com/auth/drive.file"]
  );

  const drive = google.drive({ version: "v3", auth });

  // Определяем имя файла
  const finalFileName = fileName || path.basename(localPath);

  // Загружаем файл
  const res = await drive.files.create({
    requestBody: {
      name: finalFileName,
      parents: [folderId],
    },
    media: {
      mimeType: "video/mp4",
      body: fs.createReadStream(localPath),
    },
    fields: "id, webViewLink, webContentLink",
  });

  if (!res.data.id) {
    throw new Error("Не удалось загрузить файл в Google Drive");
  }

  return {
    fileId: res.data.id,
    webViewLink: res.data.webViewLink || undefined,
    webContentLink: res.data.webContentLink || undefined,
  };
}

