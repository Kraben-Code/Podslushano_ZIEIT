import Link from "next/link";
import { RealtimeChat } from "@/components/realtime-chat";

export default function ChatPage() {
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: 12,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            Сообщество ЗИЕИТ
          </p>
          <h1 style={{ margin: "8px 0 0", fontSize: "clamp(24px, 4vw, 34px)" }}>
            Студенческий чат
          </h1>
        </div>
        <nav aria-label="Навигация по сайту" style={{ display: "flex", gap: 14 }}>
          <Link href="/feed">Лента</Link>
          <Link href="/marketplace">Барахолка</Link>
          <Link href="/">На главную</Link>
        </nav>
      </header>

      <RealtimeChat />
    </main>
  );
}
