export type Language = "ru" | "kk" | "en";

export interface Channel {
  id: string;
  name: string;
  description: string; // Краткое описание стиля канала
  language: Language; // Основной язык ролика
  durationSeconds: number; // Целевая длительность (по умолчанию 8)
  ideaPromptTemplate: string; // Шаблон промпта для генерации идей
  videoPromptTemplate: string; // Шаблон промпта для генерации финального промпта Veo
}

const channels = new Map<string, Channel>();

// Инициализация с примерами каналов
channels.set("babushka-dedushka", {
  id: "babushka-dedushka",
  name: "Бабушка и Дедушка Life",
  description: "Семейный юмор, деревенская атмосфера, бабушка и дедушка",
  language: "ru",
  durationSeconds: 8,
  ideaPromptTemplate:
    "Сгенерируй 5 идей для очень смешных 8-секундных видео с бабушкой и дедушкой. Видео должно быть реалистичным, с семейным юмором, понятным зрителям из Казахстана. Формат ответа: JSON-массив с полями title и description. Язык — русский.",
  videoPromptTemplate:
    "На основе следующей идеи сгенерируй детализированный промпт для Veo 3.1 Fast. Промпт должен описывать сцену на 8 секунд с русской бабушкой и дедушкой, реалистичная кинематографичная съёмка, тёплый свет, деревенская атмосфера Казахстана, семейный юмор. В конце ролика желательно визуально или репликой упомянуть сайт hotwell.kz. Сначала верни блок veo_prompt (английский язык, чистый текст промпта для Veo), затем блок video_title — короткое, запоминающееся русское название ролика как для YouTube.\n\nИдея: {{IDEA_TEXT}}",
});

channels.set("sipdeluxe", {
  id: "sipdeluxe",
  name: "SIPDeluxe.kz",
  description: "IT-юмор, технологии, программирование",
  language: "ru",
  durationSeconds: 8,
  ideaPromptTemplate:
    "Сгенерируй 5 идей для смешных 8-секундных видео про IT, технологии и программирование. Юмор должен быть понятен IT-специалистам. Формат ответа: JSON-массив с полями title и description. Язык — русский.",
  videoPromptTemplate:
    "На основе следующей идеи сгенерируй детализированный промпт для Veo 3.1 Fast. Промпт должен описывать сцену на 8 секунд с IT-тематикой, современная обстановка, яркое освещение, технологический юмор. Сначала верни блок veo_prompt (английский язык, чистый текст промпта для Veo), затем блок video_title — короткое, запоминающееся русское название ролика как для YouTube.\n\nИдея: {{IDEA_TEXT}}",
});

channels.set("hotwell", {
  id: "hotwell",
  name: "HotWell.kz",
  description: "Здоровый образ жизни, фитнес, ЗОЖ",
  language: "ru",
  durationSeconds: 8,
  ideaPromptTemplate:
    "Сгенерируй 5 идей для смешных 8-секундных видео про здоровье, фитнес и ЗОЖ. Юмор должен быть позитивным и мотивирующим. Формат ответа: JSON-массив с полями title и description. Язык — русский.",
  videoPromptTemplate:
    "На основе следующей идеи сгенерируй детализированный промпт для Veo 3.1 Fast. Промпт должен описывать сцену на 8 секунд про здоровый образ жизни, энергичную атмосферу, динамичную съёмку. Сначала верни блок veo_prompt (английский язык, чистый текст промпта для Veo), затем блок video_title — короткое, запоминающееся русское название ролика как для YouTube.\n\nИдея: {{IDEA_TEXT}}",
});

export function getAllChannels(): Channel[] {
  return Array.from(channels.values());
}

export function getChannelById(id: string): Channel | undefined {
  return channels.get(id);
}

export function createChannel(channel: Channel): Channel {
  channels.set(channel.id, channel);
  return channel;
}

export function updateChannel(id: string, updates: Partial<Channel>): Channel | null {
  const channel = channels.get(id);
  if (!channel) {
    return null;
  }
  const updated = { ...channel, ...updates, id }; // Сохраняем id
  channels.set(id, updated);
  return updated;
}

export function deleteChannel(id: string): boolean {
  return channels.delete(id);
}

