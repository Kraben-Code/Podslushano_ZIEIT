import type { FeedPost } from "@/lib/types";

export const demoPosts: FeedPost[] = [
  {
    id: "demo-campus",
    author: "Анонім",
    initials: "А",
    avatarTone: "violet",
    category: "Підслухано",
    time: "12 хв тому",
    content:
      "Хто сьогодні залишив у бібліотеці дуже гарний плейлист? Дякую за саундтрек до підготовки до сесії 🫶",
    likes: 24,
    comments: 8,
    anonymous: true,
  },
  {
    id: "demo-study",
    author: "Софія",
    handle: "sofia.k",
    initials: "С",
    avatarTone: "peach",
    category: "Навчання",
    time: "38 хв тому",
    content:
      "Зібрала короткий конспект до модулю з економіки. Може комусь теж стане в пригоді — ділюся нижче ✨",
    likes: 18,
    comments: 5,
    accent: "notes",
  },
  {
    id: "demo-question",
    author: "Максим",
    handle: "max.b",
    initials: "М",
    avatarTone: "blue",
    category: "Питання",
    time: "1 год тому",
    content:
      "Порадьте затишне місце поруч із кампусом, де можна попрацювати з ноутбуком і випити щось смачне?",
    likes: 11,
    comments: 12,
  },
];
