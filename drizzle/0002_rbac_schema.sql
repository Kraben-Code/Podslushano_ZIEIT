CREATE TABLE "permissions" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"description" varchar(160) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"key" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(64) NOT NULL,
	"description" varchar(180) NOT NULL,
	"assign_permission_key" varchar(64),
	"is_assignable" boolean DEFAULT false NOT NULL,
	"is_protected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_key" varchar(50) NOT NULL,
	"permission_key" varchar(64) NOT NULL,
	CONSTRAINT "role_permissions_role_key_permission_key_pk" PRIMARY KEY("role_key","permission_key")
);
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_key_roles_key_fk" FOREIGN KEY ("role_key") REFERENCES "public"."roles"("key") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_key_permissions_key_fk" FOREIGN KEY ("permission_key") REFERENCES "public"."permissions"("key") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "role_permissions_permission_key_idx" ON "role_permissions" USING btree ("permission_key");
--> statement-breakpoint
INSERT INTO "roles" ("key", "name", "description", "assign_permission_key", "is_assignable", "is_protected") VALUES
	('USER', 'Користувач', 'Звичайний користувач платформи.', NULL, false, true),
	('CHAT_MODERATOR', 'Модератор чатів', 'Модерація загальних чатів і спільнот.', 'team.roles.manage', true, false),
	('MODERATOR', 'Модератор', 'Модерація публікацій, коментарів і скарг.', 'team.roles.manage', true, false),
	('ADMIN', 'Адміністратор', 'Повне адміністрування платформи та команди модераторів.', 'team.admin.manage', true, false),
	('OWNER', 'Власник', 'Повні повноваження; передавання лише окремою процедурою.', 'platform.ownership.transfer', false, true);
--> statement-breakpoint
DROP INDEX "user_roles_user_role_unique";
--> statement-breakpoint
ALTER TABLE "user_roles" RENAME COLUMN "role" TO "role_key";
--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "role_key" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "role_key" TYPE varchar(50) USING "role_key"::text;
--> statement-breakpoint
ALTER TABLE "user_roles" RENAME COLUMN "created_at" TO "assigned_at";
--> statement-breakpoint
ALTER TABLE "user_roles" ADD COLUMN "assigned_by" uuid;
--> statement-breakpoint
ALTER TABLE "user_roles" ADD COLUMN "expires_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "user_roles" ADD COLUMN "suspended_until" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_key_roles_key_fk" FOREIGN KEY ("role_key") REFERENCES "public"."roles"("key") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_user_role_unique" ON "user_roles" USING btree ("user_id", "role_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_owner_unique" ON "user_roles" USING btree ("role_key") WHERE "role_key" = 'OWNER';
--> statement-breakpoint
DROP TYPE "global_role";
--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"actor_username" varchar(30),
	"target_user_id" uuid,
	"target_username" varchar(30) NOT NULL,
	"action" varchar(64) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "admin_audit_logs_target_created_idx" ON "admin_audit_logs" USING btree ("target_user_id", "created_at");
--> statement-breakpoint
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs" USING btree ("created_at");
