import { loadEnvConfig } from "@next/env";
import argon2 from "argon2";
import { drizzle } from "drizzle-orm/postgres-js";
import { stdin, stdout } from "node:process";
import { StringDecoder } from "node:string_decoder";
import * as readline from "node:readline/promises";
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

function ask(question: string) {
  const prompt = readline.createInterface({ input: stdin, output: stdout });
  return prompt.question(question).finally(() => prompt.close());
}

function askSecret(question: string) {
  if (!stdin.isTTY || !stdin.setRawMode) {
    throw new Error("Run this command in an interactive terminal.");
  }

  stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise<string>((resolve, reject) => {
    let value = "";
    const decoder = new StringDecoder("utf8");

    function finish(error?: Error) {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    }

    function onData(chunk: Buffer) {
      for (const character of decoder.write(chunk)) {
        if (character === "\u0003") {
          finish(new Error("Cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = Array.from(value).slice(0, -1).join("");
          continue;
        }
        if (character >= " ") {
          value += character;
        }
      }
    }

    stdin.on("data", onData);
  });
}

async function main() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    process.env.ALLOW_LOCAL_TEST_ACCOUNTS !== "true"
  ) {
    throw new Error(
      "Test-account creation is disabled. Set ALLOW_LOCAL_TEST_ACCOUNTS=true in a development environment.",
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Set DATABASE_URL to a development database first.");
  }

  const username = usernameSchema.parse(await ask("Login (3-30 characters): "));
  const displayName = displayNameSchema.parse(
    await ask("Display name (2-48 characters): "),
  );
  const password = passwordSchema.parse(
    await askSecret("Password (12-128 characters; input hidden): "),
  );
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
      const [user] = await transaction
        .insert(users)
        .values({ username, passwordHash })
        .returning({ id: users.id });

      await transaction.insert(profiles).values({
        userId: user.id,
        displayName,
      });

      await transaction.insert(userRoles).values({
        userId: user.id,
        roleKey: "USER",
      });
    });
  } finally {
    await client.end();
  }

  stdout.write(`Created local test account @${username}.\n`);
}

main().catch((error: unknown) => {
  const message =
    error instanceof z.ZodError
      ? error.issues.map((issue) => issue.message).join("\n")
      : error instanceof Error
        ? error.message
        : "Unknown error.";

  console.error(`Could not create local test account: ${message}`);
  process.exitCode = 1;
});
