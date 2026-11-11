import Link from "next/link";

export default function MarketplacePage() {
  return (
    <main style={{ padding: 32, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "center" }}>
        <div>
          <p style={{ textTransform: "uppercase", letterSpacing: 1.6, opacity: 0.7, margin: 0, fontSize: 12 }}>
            Барахолка
          </p>
          <h1 style={{ margin: "8px 0 0" }}>Продажа и обмен вещей</h1>
        </div>
        <Link href="/" style={{ color: "#8b5cf6", textDecoration: "none" }}>На главную</Link>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 24 }}>
        <p>Здесь будет таблица объявлений, поиск, категории и карточки товаров.</p>
        <p style={{ opacity: 0.7 }}>Потом подключим реальные данные и модерацию через Telegram/сайт.</p>
      </div>
    </main>
  );
}
