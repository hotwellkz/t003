import { Router, Request, Response } from "express";
import {
  getAllChannels,
  getChannelById,
  createChannel,
  deleteChannel,
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
    const { name, basePrompt, veoPromptTemplate } = req.body;

    if (!name || !basePrompt || !veoPromptTemplate) {
      return res.status(400).json({
        error: "Требуются поля: name, basePrompt, veoPromptTemplate",
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
      basePrompt,
      veoPromptTemplate,
    });

    res.json(channel);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при создании канала" });
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

