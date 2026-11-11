import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { and, eq, gt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasSameOrigin } from "@/lib/auth/origin";
import { createSession } from "@/lib/auth/session";
import { getDatabase, isDatabaseConfigured } from "@/lib/db";
import { loginAttempts, profiles, users } from "@/lib/db/schema";

const signInSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9._-]+$/),
  password: z.string().min(1).max(128),
});

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_ATTEMPT_LIMIT = 5;
const IP_ATTEMPT_LIMIT = 40;
const dummyPasswordHash = argon2.hash(randomBytes(32), {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
});

function hashRateLimitKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function getRateLimitKeys(request: Request, username: string) {
  const ipAddress =
    request.headers.get("x-real-ip") ??
    (process.env.NODE_ENV === "development" ? "development-local" : "unknown");

  return {
    account: hashRateLimitKey(`account:${ipAddress}:${username}`),
    address: hashRateLimitKey(`address:${ipAddress}`),
  };
}

async function isBlocked(keyHash: string) {
  const [attempt] = await getDatabase()
    .select({ blockedUntil: loginAttempts.blockedUntil })
    .from(loginAttempts)
    .where(eq(loginAttempts.keyHash, keyHash))
    .limit(1);

  return Boolean(attempt?.blockedUntil && attempt.blockedUntil > new Date());
}

async function recordFailure(keyHash: string, limit: number) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - ATTEMPT_WINDOW_MS);
  const resetWindow = sql`${loginAttempts.windowStartedAt} <= ${windowStart}`;
  const nextCount = sql<number>`CASE WHEN ${resetWindow} THEN 1 ELSE ${loginAttempts.failedAttempts} + 1 END`;

  const [attempt] = await getDatabase()
    .insert(loginAttempts)
    .values({
      keyHash,
      failedAttempts: 1,
      windowStartedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: loginAttempts.keyHash,
      set: {
        failedAttempts: nextCount,
        windowStartedAt: sql`CASE WHEN ${resetWindow} THEN ${now} ELSE ${loginAttempts.windowStartedAt} END`,
        blockedUntil: sql`CASE WHEN ${nextCount} >= ${limit} THEN ${new Date(now.getTime() + ATTEMPT_WINDOW_MS)} ELSE NULL END`,
        updatedAt: now,
      },
    })
    .returning({ failedAttempts: loginAttempts.failedAttempts });

  return attempt.failedAttempts >= limit;
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json(
      { error: "Запит не пройшов перевірку безпеки." },
      { status: 403 },
    );
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json(
      { error: "Невірний формат запиту." },
      { status: 415 },
    );
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Вхід тимчасово недоступний: сервер ще не підключено до бази даних." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Перевір логін і пароль та спробуй ще раз." },
      { status: 400 },
    );
  }

  const parsed = signInSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Перевір логін і пароль та спробуй ще раз." },
      { status: 400 },
    );
  }

  const { username, password } = parsed.data;
  const keys = getRateLimitKeys(request, username);

  if (
    (await isBlocked(keys.account)) ||
    (await isBlocked(keys.address))
  ) {
    return NextResponse.json(
      { error: "Забагато спроб. Зачекай 15 хвилин і спробуй ще раз." },
      {
        status: 429,
        headers: { "Retry-After": "900" },
      },
    );
  }

  const [user] = await getDatabase()
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
    })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.username, username))
    .limit(1);

  const passwordMatches = await argon2.verify(
    user?.passwordHash ?? (await dummyPasswordHash),
    password,
  );

  if (!user || !user.isActive || !passwordMatches) {
    const [accountBlocked, addressBlocked] = await Promise.all([
      recordFailure(keys.account, ACCOUNT_ATTEMPT_LIMIT),
      recordFailure(keys.address, IP_ATTEMPT_LIMIT),
    ]);

    if (accountBlocked || addressBlocked) {
      return NextResponse.json(
        { error: "Забагато спроб. Зачекай 15 хвилин і спробуй ще раз." },
        {
          status: 429,
          headers: { "Retry-After": "900" },
        },
      );
    }

    return NextResponse.json(
      { error: "Невірний логін або пароль." },
      { status: 401 },
    );
  }

  await getDatabase()
    .delete(loginAttempts)
    .where(eq(loginAttempts.keyHash, keys.account));
  await createSession(user.id);

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
