CREATE TABLE "chat_rooms" (
	"key" varchar(40) PRIMARY KEY NOT NULL,
	"name" varchar(64) NOT NULL,
	"description" varchar(160) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_key" varchar(40) NOT NULL,
	"author_id" uuid NOT NULL,
	"type" varchar(16) DEFAULT 'message' NOT NULL,
	"content" varchar(1000) DEFAULT '' NOT NULL,
	"listing_title" varchar(100),
	"listing_price" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_messages_type_valid" CHECK ("chat_messages"."type" in ('message', 'listing')),
	CONSTRAINT "chat_messages_listing_fields_valid" CHECK (("chat_messages"."type" = 'listing' and "chat_messages"."listing_title" is not null) or ("chat_messages"."type" = 'message' and "chat_messages"."listing_title" is null and "chat_messages"."listing_price" is null)),
	CONSTRAINT "chat_messages_listing_price_nonnegative" CHECK ("chat_messages"."listing_price" is null or "chat_messages"."listing_price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_room_key_chat_rooms_key_fk" FOREIGN KEY ("room_key") REFERENCES "public"."chat_rooms"("key") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "chat_messages_room_created_idx" ON "chat_messages" USING btree ("room_key","created_at","id");
--> statement-breakpoint
INSERT INTO "chat_rooms" ("key", "name", "description") VALUES
	('general', 'Общий чат', 'Общение и вопросы о жизни университета'),
	('study', 'Учёба', 'Учебные вопросы, конспекты и помощь'),
	('it-club', 'IT Club', 'Технологии, проекты и программирование'),
	('memes', 'Мемы', 'Студенческий юмор'),
	('marketplace', 'Барахолка', 'Объявления о продаже и обмене')
ON CONFLICT ("key") DO NOTHING;
