import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  permissions,
  rolePermissions,
  roles,
} from "../src/lib/db/schema";

loadEnvConfig(process.cwd());

const permissionDefinitions = [
  ["chat.messages.moderate", "Remove messages in public chats and communities."],
  ["chat.users.restrict", "Temporarily restrict users in public chats."],
  ["chat.reports.manage", "Review reports about public chat messages."],
  ["content.posts.review", "Review posts awaiting moderation."],
  ["content.posts.approve", "Approve posts for publication."],
  ["content.posts.reject", "Reject posts awaiting moderation."],
  ["content.delete", "Remove platform content."],
  ["content.restore", "Restore previously removed platform content."],
  ["reports.manage", "Review reports about posts and comments."],
  ["users.restrict", "Apply temporary platform restrictions to users."],
  ["users.manage", "Manage platform users and sanctions."],
  ["platform.settings.manage", "Manage ordinary platform settings."],
  ["admin.dashboard.view", "View the administration dashboard and statistics."],
  ["team.roles.manage", "Assign and revoke moderator team roles."],
  ["team.admin.manage", "Assign and revoke administrator roles."],
  ["platform.critical.manage", "Manage critical platform settings."],
  ["platform.ownership.transfer", "Use the protected ownership-transfer process."],
] as const;

const moderatorPermissions = [
  "content.posts.review",
  "content.posts.approve",
  "content.posts.reject",
  "content.delete",
  "content.restore",
  "reports.manage",
  "users.restrict",
];

const chatModeratorPermissions = [
  "chat.messages.moderate",
  "chat.users.restrict",
  "chat.reports.manage",
];

const adminPermissions = [
  ...moderatorPermissions,
  "users.manage",
  "platform.settings.manage",
  "admin.dashboard.view",
  "team.roles.manage",
];

const roleDefinitions = [
  {
    key: "USER",
    name: "Користувач",
    description: "Звичайний користувач платформи.",
    assignPermissionKey: null,
    isAssignable: false,
    isProtected: true,
    permissionKeys: [],
  },
  {
    key: "CHAT_MODERATOR",
    name: "Модератор чатів",
    description: "Модерація загальних чатів і спільнот.",
    assignPermissionKey: "team.roles.manage",
    isAssignable: true,
    isProtected: false,
    permissionKeys: chatModeratorPermissions,
  },
  {
    key: "MODERATOR",
    name: "Модератор",
    description: "Модерація публікацій, коментарів і скарг.",
    assignPermissionKey: "team.roles.manage",
    isAssignable: true,
    isProtected: false,
    permissionKeys: moderatorPermissions,
  },
  {
    key: "ADMIN",
    name: "Адміністратор",
    description: "Повне адміністрування платформи та команди модераторів.",
    assignPermissionKey: "team.admin.manage",
    isAssignable: true,
    isProtected: false,
    permissionKeys: adminPermissions,
  },
  {
    key: "OWNER",
    name: "Власник",
    description: "Повні повноваження; передавання лише окремою процедурою.",
    assignPermissionKey: "platform.ownership.transfer",
    isAssignable: false,
    isProtected: true,
    permissionKeys: [...adminPermissions, ...chatModeratorPermissions, "team.admin.manage", "platform.critical.manage", "platform.ownership.transfer"],
  },
] as const;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Set DATABASE_URL before seeding RBAC roles.");
  }

  const client = postgres(databaseUrl, { prepare: false, max: 1 });
  const database = drizzle(client);

  try {
    await database.transaction(async (transaction) => {
      await transaction
        .insert(permissions)
        .values(
          permissionDefinitions.map(([key, description]) => ({
            key,
            description,
          })),
        )
        .onConflictDoNothing();

      await transaction
        .insert(roles)
        .values(
          roleDefinitions.map(
            ({
              key,
              name,
              description,
              assignPermissionKey,
              isAssignable,
              isProtected,
            }) => ({
              key,
              name,
              description,
              assignPermissionKey,
              isAssignable,
              isProtected,
            }),
          ),
        )
        .onConflictDoNothing();

      const links = roleDefinitions.flatMap((role) =>
        role.permissionKeys.map((permissionKey) => ({
          roleKey: role.key,
          permissionKey,
        })),
      );

      await transaction
        .insert(rolePermissions)
        .values(links)
        .onConflictDoNothing();
    });
  } finally {
    await client.end();
  }

  console.log("RBAC roles and permissions are ready.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error.";
  console.error(`Could not seed RBAC roles: ${message}`);
  process.exitCode = 1;
});
