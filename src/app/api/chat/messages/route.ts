import { and, asc, desc, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { hasSameOrigin } from "@/lib/auth/origin";
import { getDatabase, isDatabaseConfigured } from "@/lib/db";
import { chatMessages, chatRooms, profiles } from "@/lib/db/schema";

const roomKeySchema = z.string().min(1).max(40).regex(/^[a-z0-9-]+$/);

const createMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message"),
    roomKey: roomKeySchema,
    content: z.string().trim().min(1).max(1000),
  }),
  z.object({
    type: z.literal("listing"),
    roomKey: roomKeySchema,
    content: z.string().trim().max(1000).default(""),
    title: z.string().trim().min(3).max(100),
    price: z.number().int().min(0).max(100_000_000).nullable().optional(),
  }),
]);

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Чат недоступен: сервер ещё не подключён к базе данных." },
      { status: 503 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Войдите в аккаунт, чтобы читать сообщения." },
      { status: 401 },
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const roomKey = roomKeySchema.safeParse(searchParams.get("room"));
  if (!roomKey.success) {
    return NextResponse.json({ error: "Укажите комнату чата." }, { status: 400 });
  }

  const [room] = await getDatabase()
    .select({ key: chatRooms.key })
    .from(chatRooms)
    .where(eq(chatRooms.key, roomKey.data))
    .limit(1);

  if (!room) {
    return NextResponse.json({ error: "Комната не найдена." }, { status: 404 });
  }

  const afterParam = searchParams.get("after");
  const after = afterParam ? new Date(afterParam) : null;
  if (after && Number.isNaN(after.getTime())) {
    return NextResponse.json({ error: "Некорректный курсор сообщений." }, { status: 400 });
  }

  const messages = await getDatabase()
    .select({
      id: chatMessages.id,
      type: chatMessages.type,
      content: chatMessages.content,
      title: chatMessages.listingTitle,
      price: chatMessages.listingPrice,
      createdAt: chatMessages.createdAt,
      author: profiles.displayName,
    })
    .from(chatMessages)
    .innerJoin(profiles, eq(profiles.userId, chatMessages.authorId))
    .where(
      after
        ? and(
            eq(chatMessages.roomKey, roomKey.data),
            gte(chatMessages.createdAt, after),
          )
        : eq(chatMessages.roomKey, roomKey.data),
    )
    .orderBy(after ? asc(chatMessages.createdAt) : desc(chatMessages.createdAt))
    .limit(after ? 100 : 50);

  if (!after) {
    messages.reverse();
  }

  return NextResponse.json(
    { messages },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Запрос отклонён проверкой безопасности." }, { status: 403 });
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Ожидается JSON-запрос." }, { status: 415 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Чат недоступен: сервер ещё не подключён к базе данных." },
      { status: 503 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Войдите в аккаунт, чтобы отправлять сообщения." },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON-запрос." }, { status: 400 });
  }

  const parsed = createMessageSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Проверьте текст сообщения или объявления." },
      { status: 400 },
    );
  }

  const [room] = await getDatabase()
    .select({ key: chatRooms.key })
    .from(chatRooms)
    .where(eq(chatRooms.key, parsed.data.roomKey))
    .limit(1);

  if (!room) {
    return NextResponse.json({ error: "Комната не найдена." }, { status: 404 });
  }

  const [message] = await getDatabase()
    .insert(chatMessages)
    .values({
      roomKey: room.key,
      authorId: user.id,
      type: parsed.data.type,
      content: parsed.data.content,
      listingTitle: parsed.data.type === "listing" ? parsed.data.title : null,
      listingPrice:
        parsed.data.type === "listing" ? (parsed.data.price ?? null) : null,
    })
    .returning({
      id: chatMessages.id,
      type: chatMessages.type,
      content: chatMessages.content,
      title: chatMessages.listingTitle,
      price: chatMessages.listingPrice,
      createdAt: chatMessages.createdAt,
    });

  return NextResponse.json(
    { message: { ...message, author: user.displayName } },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
