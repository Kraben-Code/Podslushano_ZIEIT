import Link from "next/link";

const listings = [
  { title: "Ноутбук Lenovo IdeaPad 5", price: "12 500 грн", category: "Електроніка", seller: "Марина" },
  { title: "Механічна клавіатура Redragon", price: "2 200 грн", category: "Периферія", seller: "Іван" },
  { title: "Книга з аналізу даних", price: "350 грн", category: "Навчальні матеріали", seller: "Оля" },
  { title: "Сонячна лампа для стола", price: "900 грн", category: "Другое", seller: "Дмитро" },
];

export default function MarketplacePage() {
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <p style={{ textTransform: "uppercase", letterSpacing: 1.6, opacity: 0.7, margin: 0, fontSize: 12 }}>
            Барахолка
          </p>
          <h1 style={{ margin: "8px 0 0" }}>Студентські оголошення</h1>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/feed" style={{ color: "#0f172a", textDecoration: "none", fontWeight: 700 }}>Лента</Link>
          <Link href="/chat" style={{ color: "#0f172a", textDecoration: "none", fontWeight: 700 }}>Чат</Link>
          <Link href="/" style={{ color: "#8b5cf6", textDecoration: "none", fontWeight: 700 }}>На главную</Link>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 24, padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            "Усі",
            "Електроніка",
            "Периферія",
            "Книги",
            "Навчальні матеріали",
            "Другое",
          ].map((category) => (
            <button
              key={category}
              type="button"
              style={{
                border: category === "Усі" ? "1px solid #8b5cf6" : "1px solid #dfe7f3",
                background: category === "Усі" ? "#f5f3ff" : "#fff",
                color: category === "Усі" ? "#5b21b6" : "#0f172a",
                borderRadius: 999,
                padding: "8px 12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
        {listings.map((item) => (
          <article key={item.title} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, overflow: "hidden" }}>
            <div style={{ height: 180, background: "linear-gradient(135deg, #dbeafe 0%, #e9d5ff 100%)", display: "grid", placeItems: "center", fontSize: 40 }}>📦</div>
            <div style={{ padding: 18, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <strong>{item.title}</strong>
                <span style={{ background: "#ecfeff", color: "#0f766e", borderRadius: 999, padding: "4px 8px", fontSize: 12, fontWeight: 700 }}>{item.category}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#111827" }}>{item.price}</div>
              <div style={{ color: "#475569" }}>Продавець: {item.seller}</div>
              <button
                type="button"
                style={{
                  marginTop: 8,
                  border: "none",
                  background: "linear-gradient(135deg, #2563eb 0%, #8b5cf6 100%)",
                  color: "#fff",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Написати покупцю
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
