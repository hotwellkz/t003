import { Router, Request, Response } from "express";
import { getChannelById } from "../models/channel";

const router = Router();

// POST /api/prompts/veo
router.post("/veo", (req: Request, res: Response) => {
  try {
    const { channelId, ideaText } = req.body;

    if (!channelId || !ideaText) {
      return res.status(400).json({
        error: "Требуются поля: channelId, ideaText",
      });
    }

    const channel = getChannelById(channelId);
    if (!channel) {
      return res.status(404).json({ error: "Канал не найден" });
    }

    // Подставляем ideaText в шаблон
    let prompt = channel.veoPromptTemplate.replace(/{{idea}}/g, ideaText);

    // Можно добавить дополнительную обработку через LLM для улучшения промпта
    // Здесь пока просто возвращаем готовый промпт

    res.json({ prompt });
  } catch (error) {
    console.error("Ошибка генерации промпта:", error);
    res.status(500).json({ error: "Ошибка при генерации промпта" });
  }
});

export default router;

