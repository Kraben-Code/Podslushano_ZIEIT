import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isBackendConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isBackendConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  role: CommunityRole;
};

export type CommunityRole = "user" | "moderator" | "admin" | "owner";

export type CommunityPost = {
  id: string;
  author_id: string;
  category: string;
  content: string;
  is_anonymous: boolean;
  moderation_status: "pending" | "approved" | "rejected";
  source: "site" | "telegram";
  published_to_channel: boolean;
  created_at: string;
};

export type ChatRoom = {
  key: string;
  name: string;
  description: string;
};

export type ChatMessage = {
  id: string;
  room_key: string;
  author_id: string;
  message_type: "message" | "listing";
  content: string;
  listing_title: string | null;
  listing_price: number | null;
  created_at: string;
};

export type Listing = {
  id: string;
  author_id: string;
  title: string;
  description: string;
  price: number | null;
  category: string;
  status: "pending" | "active" | "rejected" | "sold";
  created_at: string;
};
