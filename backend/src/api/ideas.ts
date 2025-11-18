import { Router, Request, Response } from "express";
import { getChannelById } from "../models/channel";

const router = Router();

// POST /api/ideas/generate
router.post("/generate", async (req: Request, res: Response) => {
  try {
    const { channelId } = req.body;

    if (!channelId) {
      return res.status(400).json({ error: "Требуется channelId" });
    }

    const channel = getChannelById(channelId);
    if (!channel) {
      return res.status(404).json({ error: "Канал не найден" });
    }

    // Генерация идей (заглушка - можно заменить на LLM API)
    const ideas = generateIdeas(channel.basePrompt);

    res.json({ ideas });
  } catch (error) {
    console.error("Ошибка генерации идей:", error);
    res.status(500).json({ error: "Ошибка при генерации идей" });
  }
});

function generateIdeas(basePrompt: string): Array<{ id: string; text: string }> {
  // Простая заглушка - генерирует идеи на основе basePrompt
  // В реальном приложении здесь можно использовать OpenAI API или другой LLM

  const ideaTemplates = [
    "{{basePrompt}}. Сцена: неожиданная ситуация с {{character}}",
    "{{basePrompt}}. Сцена: забавный диалог про {{topic}}",
    "{{basePrompt}}. Сцена: комичная ошибка при {{action}}",
    "{{basePrompt}}. Сцена: неловкий момент с {{object}}",
    "{{basePrompt}}. Сцена: смешная реакция на {{event}}",
    "{{basePrompt}}. Сцена: необычное использование {{item}}",
    "{{basePrompt}}. Сцена: забавное недоразумение про {{subject}}",
    "{{basePrompt}}. Сцена: комичная попытка {{activity}}",
    "{{basePrompt}}. Сцена: смешной эксперимент с {{thing}}",
    "{{basePrompt}}. Сцена: неожиданный поворот в {{situation}}",
  ];

  const characters = ["бабушкой", "дедушкой", "внуком", "внучкой"];
  const topics = ["технологии", "еду", "погоду", "новости"];
  const actions = ["готовке", "уборке", "покупках", "отдыхе"];
  const objects = ["телефоном", "пультом", "очками", "газетой"];
  const events = ["новость", "сообщение", "звонок", "визит"];
  const items = ["смартфон", "планшет", "умные часы", "робот-пылесос"];
  const subjects = ["интернет", "соцсети", "онлайн-шопинг", "стриминг"];
  const activities = ["настроить Wi-Fi", "заказать еду", "позвонить", "сфотографировать"];
  const things = ["новым гаджетом", "умным домом", "виртуальной реальностью", "AI-ассистентом"];
  const situations = ["семейном ужине", "просмотре ТВ", "прогулке", "разговоре"];

  const replacements: Record<string, string[]> = {
    character: characters,
    topic: topics,
    action: actions,
    object: objects,
    event: events,
    item: items,
    subject: subjects,
    activity: activities,
    thing: things,
    situation: situations,
  };

  const ideas = ideaTemplates.map((template, index) => {
    let text = template.replace("{{basePrompt}}", basePrompt);

    // Заменяем плейсхолдеры случайными значениями
    for (const [key, values] of Object.entries(replacements)) {
      const placeholder = `{{${key}}}`;
      if (text.includes(placeholder)) {
        const randomValue = values[Math.floor(Math.random() * values.length)];
        text = text.replace(placeholder, randomValue);
      }
    }

    return {
      id: `idea_${index + 1}`,
      text: text.trim(),
    };
  });

  return ideas;
}

export default router;

