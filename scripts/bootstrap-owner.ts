import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, isNull, or, gt } from "drizzle-orm";
import { stdin, stdout } from "node:process";
import * as readline from "node:readline/promises";
import postgres from "postgres";
import { adminAuditLogs, userRoles, users } from "../src/lib/db/schema";

loadEnvConfig(process.cwd());

async function main() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    process.env.ALLOW_OWNER_BOOTSTRAP !== "true"
  ) {
    throw new Error(
      "Owner bootstrap is disabled. Run this one-time command locally after explicitly enabling ALLOW_OWNER_BOOTSTRAP.",
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Set DATABASE_URL to the intended database first.");
  }

  const prompt = readline.createInterface({ input: stdin, output: stdout });
  let username = "";
  let confirmation = "";

  try {
    username = (await prompt.question("Existing registered username: "))
      .trim()
      .toLowerCase();
    confirmation = await prompt.question(
      'Type "BOOTSTRAP OWNER" to continue: ',
    );
  } finally {
    prompt.close();
  }

  if (confirmation !== "BOOTSTRAP OWNER") {
    throw new Error("Owner bootstrap cancelled.");
  }

  const client = postgres(databaseUrl, { prepare: false, max: 1 });
  const database = drizzle(client);

  try {
    await database.transaction(async (transaction) => {
      const [target] = await transaction
        .select({ id: users.id, username: users.username, isActive: users.isActive })
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!target || !target.isActive) {
        throw new Error("The account must exist and be active before bootstrap.");
      }

      const now = new Date();
      const [existingOwner] = await transaction
        .select({ id: userRoles.id })
        .from(userRoles)
        .where(
          and(
            eq(userRoles.roleKey, "OWNER"),
            or(
              isNull(userRoles.expiresAt),
              gt(userRoles.expiresAt, now),
            ),
          ),
        )
        .limit(1);

      if (existingOwner) {
        throw new Error(
          "An active owner already exists. Ownership changes require the separate protected transfer procedure.",
        );
      }

      const [grant] = await transaction
        .insert(userRoles)
        .values({
          userId: target.id,
          roleKey: "OWNER",
        })
        .onConflictDoNothing()
        .returning({ id: userRoles.id });

      if (!grant) {
        throw new Error("Owner role could not be assigned.");
      }

      await transaction.insert(adminAuditLogs).values({
        actorUsername: "bootstrap",
        targetUserId: target.id,
        targetUsername: target.username,
        action: "role.owner_bootstrapped",
        metadata: { roleKey: "OWNER", roleName: "Власник" },
      });
    });
  } finally {
    await client.end();
  }

  stdout.write(`Bootstrapped owner @${username}.\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error.";
  console.error(`Could not bootstrap platform owner: ${message}`);
  process.exitCode = 1;
});
