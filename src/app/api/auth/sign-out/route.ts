import { NextResponse } from "next/server";
import { hasSameOrigin } from "@/lib/auth/origin";
import { endCurrentSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json(
      { error: "Запит не пройшов перевірку безпеки." },
      { status: 403 },
    );
  }

  await endCurrentSession();

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
