import Link from "next/link";
import { RealtimeChat } from "@/components/realtime-chat";

export default function ChatPage() {
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <p style={{ textTransform: "uppercase", letterSpacing: 1.6, opacity: 0.7, margin: 0, fontSize: 12 }}>
            Чат
          </p>
          <h1 style={{ margin: "8px 0 0" }}>Реальний чат для студентів</h1>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/feed" style={{ color: "#0f172a", textDecoration: "none", fontWeight: 700 }}>Лента</Link>
          <Link href="/marketplace" style={{ color: "#0f172a", textDecoration: "none", fontWeight: 700 }}>Барахолка</Link>
          <Link href="/" style={{ color: "#8b5cf6", textDecoration: "none", fontWeight: 700 }}>На главную</Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.8fr", gap: 20 }}>
        <aside style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: 18 }}>
            <div style={{ fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase", opacity: 0.7 }}>Комнати</div>
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {[
                "Загальний чат",
                "Учеба",
                "IT Club",
                "Меми",
                "Барахолка",
              ].map((room, index) => (
                <button
                  key={room}
                  type="button"
                  style={{
                    border: index === 0 ? "1px solid #a78bfa" : "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: "10px 12px",
                    textAlign: "left",
                    background: index === 0 ? "#f5f3ff" : "#fff",
                    color: "#111827",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {room}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: 18 }}>
            <div style={{ fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase", opacity: 0.7 }}>Онлайн</div>
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {[
                "Ліля · 24",
                "Данило · 18",
                "Юра · 13",
                "Аліна · 11",
              ].map((person) => (
                <div key={person} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{person.split(" · ")[0]}</span>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                </div>
              ))}
            </div>
          </div>
        </aside>

        <RealtimeChat />
      </div>
    </main>
  );
}
