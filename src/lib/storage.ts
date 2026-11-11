import "server-only";

import { createClient } from "@supabase/supabase-js";

export function getStorageClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured to use file storage.",
    );
  }

  return {
    client: createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    }),
    bucket: process.env.SUPABASE_STORAGE_BUCKET ?? "zieit-media",
  };
}
