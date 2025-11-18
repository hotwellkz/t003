export interface Channel {
  id: string;
  name: string;
  basePrompt: string;
  veoPromptTemplate: string;
}

const channels = new Map<string, Channel>();

// Инициализация с примерами каналов
channels.set("babushka-dedushka", {
  id: "babushka-dedushka",
  name: "Бабушка и Дедушка",
  basePrompt:
    "Смешные ситуации с бабушкой и дедушкой, семейный юмор, реалистичные сцены, 8 секунд",
  veoPromptTemplate:
    "Создай 8-секундное реалистичное видео: {{idea}}. Стиль: семейный юмор, реализм, естественное освещение.",
});

channels.set("sipdeluxe", {
  id: "sipdeluxe",
  name: "SIPDeluxe.kz",
  basePrompt:
    "Юмор про технологии, IT-шутки, программирование, современные мемы, 8 секунд",
  veoPromptTemplate:
    "Создай 8-секундное видео: {{idea}}. Стиль: IT-юмор, современный, яркое освещение.",
});

channels.set("hotwell", {
  id: "hotwell",
  name: "HotWell.kz",
  basePrompt:
    "Юмор про здоровье, фитнес, ЗОЖ, смешные ситуации в спортзале, 8 секунд",
  veoPromptTemplate:
    "Создай 8-секундное видео: {{idea}}. Стиль: здоровый образ жизни, энергичный, динамичный.",
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

export function deleteChannel(id: string): boolean {
  return channels.delete(id);
}

