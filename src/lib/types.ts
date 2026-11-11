export type FeedPost = {
  id: string;
  author: string;
  handle?: string;
  initials: string;
  avatarTone: "violet" | "peach" | "blue" | "mint";
  category: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
  anonymous?: boolean;
  accent?: string;
};
