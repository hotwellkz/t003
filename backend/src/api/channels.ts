import { Router, Request, Response } from "express";
import {
  getAllChannels,
  getChannelById,
  createChannel,
  updateChannel,
  deleteChannel,
  Channel,
} from "../models/channel";

const router = Router();

// GET /api/channels
router.get("/", (req: Request, res: Response) => {
  try {
    const channels = getAllChannels();
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при получении каналов" });
  }
});

// POST /api/channels
router.post("/", (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      language,
      durationSeconds,
      ideaPromptTemplate,
      videoPromptTemplate,
    } = req.body;

    // Валидация обязательных полей
    if (!name || !ideaPromptTemplate || !videoPromptTemplate) {
      return res.status(400).json({
        error: "Требуются поля: name, ideaPromptTemplate, videoPromptTemplate",
      });
    }

    // Генерируем ID из имени
    const id = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const channel = createChannel({
      id,
      name,
      description: description || "",
      language: language || "ru",
      durationSeconds: durationSeconds || 8,
      ideaPromptTemplate,
      videoPromptTemplate,
    });

    res.json(channel);
  } catch (error) {
    console.error("Ошибка при создании канала:", error);
    res.status(500).json({ error: "Ошибка при создании канала" });
  }
});

// PUT /api/channels/:id
router.put("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      language,
      durationSeconds,
      ideaPromptTemplate,
      videoPromptTemplate,
    } = req.body;

    // Валидация обязательных полей
    if (!name || !ideaPromptTemplate || !videoPromptTemplate) {
      return res.status(400).json({
        error: "Требуются поля: name, ideaPromptTemplate, videoPromptTemplate",
      });
    }

    const updated = updateChannel(id, {
      name,
      description: description || "",
      language: language || "ru",
      durationSeconds: durationSeconds || 8,
      ideaPromptTemplate,
      videoPromptTemplate,
    });

    if (!updated) {
      return res.status(404).json({ error: "Канал не найден" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Ошибка при обновлении канала:", error);
    res.status(500).json({ error: "Ошибка при обновлении канала" });
  }
});

// DELETE /api/channels/:id
router.delete("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = deleteChannel(id);

    if (!deleted) {
      return res.status(404).json({ error: "Канал не найден" });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Ошибка при удалении канала" });
  }
});

export default router;

