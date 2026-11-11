import { loadEnvConfig } from "@next/env";
import argon2 from "argon2";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";
import { profiles, userRoles, users } from "../src/lib/db/schema";

loadEnvConfig(process.cwd());

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9._-]+$/);

const displayNameSchema = z.string().trim().min(2).max(48);
const passwordSchema = z.string().min(12).max(128);

function getArgValue(key: string) {
  const prefix = `--${key}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

async function main() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    process.env.ALLOW_OWNER_BOOTSTRAP !== "true"
  ) {
    throw new Error(
      "Owner bootstrap is disabled. Set ALLOW_OWNER_BOOTSTRAP=true in a local development environment first.",
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Set DATABASE_URL to the intended database first.");
  }

  const username = usernameSchema.parse(
    getArgValue("username") ?? "Kraben_Code",
  );
  const displayName = displayNameSchema.parse(
    getArgValue("display-name") ?? "Kraben_Code",
  );
  const password = passwordSchema.parse(
    getArgValue("password") ?? process.env.OWNER_PASSWORD,
  );

  if (!password) {
    throw new Error("Pass a --password or OWNER_PASSWORD value.");
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  const client = postgres(databaseUrl, { prepare: false, max: 1 });
  const database = drizzle(client);

  try {
    await database.transaction(async (transaction) => {
      const [existing] = await transaction
        .select({ id: users.id, isActive: users.isActive })
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      const userId = existing?.id ??
        (
          await transaction
            .insert(users)
            .values({ username, passwordHash })
            .returning({ id: users.id })
        )[0].id;

      if (existing && !existing.isActive) {
        throw new Error("The account exists but is inactive.");
      }

      await transaction
        .insert(profiles)
        .values({ userId, displayName })
        .onConflictDoUpdate({
          target: profiles.userId,
          set: { displayName, updatedAt: new Date() },
        });

      const now = new Date();
      const [activeOwner] = await transaction
        .select({ id: userRoles.id })
        .from(userRoles)
        .where(
          and(
            eq(userRoles.roleKey, "OWNER"),
            or(isNull(userRoles.expiresAt), gt(userRoles.expiresAt, now)),
          ),
        )
        .limit(1);

      if (activeOwner) {
        throw new Error(
          "A live owner already exists in the database. Use the admin panel or a transfer flow instead.",
        );
      }

      await transaction
        .insert(userRoles)
        .values({ userId, roleKey: "OWNER" })
        .onConflictDoNothing();
    });
  } finally {
    await client.end();
  }

  console.log(`Owner account ready: @${username}`);
}

main().catch((error: unknown) => {
  const message = error instanceof z.ZodError
    ? error.issues.map((issue) => issue.message).join("\n")
    : error instanceof Error
      ? error.message
      : "Unknown error.";

  console.error(`Could not create the owner account: ${message}`);
  process.exitCode = 1;
});
