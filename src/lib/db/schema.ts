import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  jsonb,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: varchar("username", { length: 30 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "users_username_lowercase",
      sql`${table.username} = lower(${table.username})`,
    ),
  ],
);

export const permissions = pgTable("permissions", {
  key: varchar("key", { length: 64 }).primaryKey(),
  description: varchar("description", { length: 160 }).notNull(),
});

export const roles = pgTable("roles", {
  key: varchar("key", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  description: varchar("description", { length: 180 }).notNull(),
  assignPermissionKey: varchar("assign_permission_key", { length: 64 }),
  isAssignable: boolean("is_assignable").notNull().default(false),
  isProtected: boolean("is_protected").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleKey: varchar("role_key", { length: 50 })
      .notNull()
      .references(() => roles.key, { onDelete: "cascade" }),
    permissionKey: varchar("permission_key", { length: 64 })
      .notNull()
      .references(() => permissions.key, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.roleKey, table.permissionKey] }),
    index("role_permissions_permission_key_idx").on(table.permissionKey),
  ],
);

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: varchar("display_name", { length: 48 }).notNull(),
  bio: varchar("bio", { length: 240 }),
  avatarPath: varchar("avatar_path", { length: 512 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleKey: varchar("role_key", { length: 50 })
      .notNull()
      .references(() => roles.key, { onDelete: "restrict" }),
    assignedBy: uuid("assigned_by").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    suspendedUntil: timestamp("suspended_until", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("user_roles_user_role_unique").on(table.userId, table.roleKey),
    uniqueIndex("user_roles_owner_unique")
      .on(table.roleKey)
      .where(sql`${table.roleKey} = 'OWNER'`),
  ],
);

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorUsername: varchar("actor_username", { length: 30 }),
    targetUserId: uuid("target_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    targetUsername: varchar("target_username", { length: 30 }).notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("admin_audit_logs_target_created_idx").on(
      table.targetUserId,
      table.createdAt,
    ),
    index("admin_audit_logs_created_at_idx").on(table.createdAt),
  ],
);

export const telegramAccounts = pgTable(
  "telegram_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    telegramId: varchar("telegram_id", { length: 32 }).notNull().unique(),
    linkedAt: timestamp("linked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    keyHash: varchar("key_hash", { length: 64 }).primaryKey(),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    blockedUntil: timestamp("blocked_until", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("login_attempts_updated_at_idx").on(table.updatedAt)],
);

export const chatRooms = pgTable("chat_rooms", {
  key: varchar("key", { length: 40 }).primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  description: varchar("description", { length: 160 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomKey: varchar("room_key", { length: 40 })
      .notNull()
      .references(() => chatRooms.key, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 16 }).notNull().default("message"),
    content: varchar("content", { length: 1000 }).notNull().default(""),
    listingTitle: varchar("listing_title", { length: 100 }),
    listingPrice: integer("listing_price"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chat_messages_room_created_idx").on(
      table.roomKey,
      table.createdAt,
      table.id,
    ),
    check(
      "chat_messages_type_valid",
      sql`${table.type} in ('message', 'listing')`,
    ),
    check(
      "chat_messages_listing_fields_valid",
      sql`(${table.type} = 'listing' and ${table.listingTitle} is not null) or (${table.type} = 'message' and ${table.listingTitle} is null and ${table.listingPrice} is null)`,
    ),
    check(
      "chat_messages_listing_price_nonnegative",
      sql`${table.listingPrice} is null or ${table.listingPrice} >= 0`,
    ),
  ],
);
