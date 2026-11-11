import Link from "next/link";

const channelPosts = [
  {
    title: "Нова зустріч студентської спільноти",
    text: "Завтра в 18:00 відбудеться сесія з обговоренням активностей, фліпів і нових ініціатив у кампусі.",
    tag: "Подія",
  },
  {
    title: "Лайфхак для студентів",
    text: "Як краще організувати навчальний графік та не перегоряти перед сесією — короткі поради від студентів.",
    tag: "Корисне",
  },
  {
    title: "Публікації від анонімних авторів",
    text: "У каналі публікуються лише перевірені матеріали. Анонімність зберігається, але перевірки не скасовуються.",
    tag: "Анонс",
  },
];

export default function ChannelPage() {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, letterSpacing: 1.8, textTransform: "uppercase", opacity: 0.7 }}>Канал</p>
          <h1 style={{ margin: "8px 0 0" }}>Подслушано — офіційний канал новин</h1>
        </div>
        <Link href="/" style={{ color: "#7c3aed", textDecoration: "none", fontWeight: 700 }}>На головну</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 20 }}>
        <section style={{ border: "1px solid #e5e7eb", borderRadius: 24, background: "#fff", padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h2 style={{ margin: 0 }}>Новини каналу</h2>
            <span style={{ background: "#eef2ff", color: "#4338ca", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700 }}>Онлайн</span>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {channelPosts.map((post) => (
              <article key={post.title} style={{ border: "1px solid #edf2f7", borderRadius: 18, padding: 18, background: "#f8fafc" }}>
                <div style={{ display: "inline-block", background: "#dbeafe", color: "#1d4ed8", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{post.tag}</div>
                <h3 style={{ margin: "0 0 8px" }}>{post.title}</h3>
                <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>{post.text}</p>
              </article>
            ))}
          </div>
        </section>

        <aside style={{ border: "1px solid #e5e7eb", borderRadius: 24, background: "#fff", padding: 24, display: "grid", gap: 18 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase", opacity: 0.7 }}>Підписники</div>
            <h3 style={{ margin: "8px 0 0", fontSize: 36 }}>18.4K</h3>
          </div>

          <div style={{ background: "#f8fafc", borderRadius: 18, padding: 18 }}>
            <div style={{ fontSize: 12, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1.2 }}>Зараз у розсилці</div>
            <p style={{ margin: "10px 0 0", lineHeight: 1.6 }}>Оголошення, новини, анонімні публікації після модерації та події спільноти.</p>
          </div>

          <div style={{ background: "#eef2ff", borderRadius: 18, padding: 18 }}>
            <div style={{ fontSize: 12, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1.2 }}>Основні правила</div>
            <ul style={{ margin: "10px 0 0", paddingLeft: 16, color: "#334155", lineHeight: 1.8 }}>
              <li>Тільки схвалені матеріали</li>
              <li>Анонімність зберігається</li>
              <li>Модерація перед публікацією</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
