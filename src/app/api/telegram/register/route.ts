import { eq } from "drizzle-orm";
import argon2 from "argon2";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase, isDatabaseConfigured } from "@/lib/db";
import { profiles, roles, userRoles, users } from "@/lib/db/schema";

const registerSchema = z.object({
  telegramId: z.string().min(1),
  username: z.string().trim().min(3).max(30).regex(/^[a-z0-9._-]+$/i),
  login: z.string().trim().min(3).max(30).regex(/^[a-z0-9._-]+$/),
  displayName: z.string().trim().min(2).max(48),
  password: z.string().min(6).max(128),
  language: z.enum(["uk", "ru", "en"]).default("ru"),
});

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "База даних ще не підключена." },
      { status: 503 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Невірний формат запиту." },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Перевір введені дані та спробуй ще раз." },
      { status: 400 },
    );
  }

  const database = getDatabase();
  const { displayName, login, password, telegramId, username, language } = parsed.data;

  const existingUsername = await database
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, login.toLowerCase()))
    .limit(1);

  if (existingUsername.length > 0) {
    return NextResponse.json(
      { error: "Такий логін вже зайнятий." },
      { status: 409 },
    );
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  const [createdUser] = await database
    .insert(users)
    .values({
      username: login.toLowerCase(),
      passwordHash,
    })
    .returning({ id: users.id });

  await database
    .insert(profiles)
    .values({
      userId: createdUser.id,
      displayName,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { displayName, updatedAt: new Date() },
    });

  const existingRole = await database
    .select({ key: roles.key })
    .from(roles)
    .where(eq(roles.key, "USER"))
    .limit(1);

  if (existingRole.length === 0) {
    await database
      .insert(roles)
      .values({
        key: "USER",
        name: "Користувач",
        description: "Звичайний користувач платформи.",
        assignPermissionKey: null,
        isAssignable: false,
        isProtected: true,
      })
      .onConflictDoNothing();
  }

  await database
    .insert(userRoles)
    .values({
      userId: createdUser.id,
      roleKey: "USER",
    })
    .onConflictDoNothing();

  return NextResponse.json({
    ok: true,
    user: { id: createdUser.id, login, telegramId, username, language },
  });
}
