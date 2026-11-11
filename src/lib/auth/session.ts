import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDatabase, isDatabaseConfigured } from "@/lib/db";
import { profiles, sessions, users } from "@/lib/db/schema";

const SESSION_LIFETIME_DAYS = 30;
const SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-pz_session"
    : "pz_session";

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  createdAt: Date;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + SESSION_LIFETIME_DAYS * 24 * 60 * 60 * 1000,
  );

  await getDatabase().insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const [session] = await getDatabase()
    .select({
      id: users.id,
      username: users.username,
      displayName: profiles.displayName,
      createdAt: users.createdAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        gt(sessions.expiresAt, new Date()),
        eq(users.isActive, true),
      ),
    )
    .limit(1);

  return session ?? null;
}

export async function endCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token && isDatabaseConfigured()) {
    await getDatabase()
      .delete(sessions)
      .where(eq(sessions.tokenHash, hashToken(token)));
  }

  cookieStore.delete(SESSION_COOKIE);
}
