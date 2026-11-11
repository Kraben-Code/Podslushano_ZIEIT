import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase, isDatabaseConfigured } from "@/lib/db";
import { chatRooms } from "@/lib/db/schema";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Чат недоступен: сервер ещё не подключён к базе данных." },
      { status: 503 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Войдите в аккаунт, чтобы открыть чат." },
      { status: 401 },
    );
  }

  const rooms = await getDatabase()
    .select({
      key: chatRooms.key,
      name: chatRooms.name,
      description: chatRooms.description,
    })
    .from(chatRooms)
    .orderBy(chatRooms.name);

  return NextResponse.json(
    { rooms },
    { headers: { "Cache-Control": "no-store" } },
  );
}
