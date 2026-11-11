import Link from "next/link";
import { demoPosts } from "@/lib/demo-posts";

export default function FeedPage() {
  return (
    <main style={{ padding: 32, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "center" }}>
        <div>
          <p style={{ textTransform: "uppercase", letterSpacing: 1.6, opacity: 0.7, margin: 0, fontSize: 12 }}>
            Подслушано
          </p>
          <h1 style={{ margin: "8px 0 0" }}>Лента публикаций</h1>
        </div>
        <Link href="/" style={{ color: "#8b5cf6", textDecoration: "none" }}>На главную</Link>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {demoPosts.map((post) => (
          <article key={post.id} style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 20, background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <strong>{post.author}</strong>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{post.time}</div>
              </div>
              <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, background: "#f3e8ff", color: "#6d28d9" }}>
                {post.category} · {post.source ?? "site"}
              </span>
            </div>
            <p style={{ margin: 0, lineHeight: 1.7 }}>{post.content}</p>
            <div style={{ marginTop: 16, display: "flex", gap: 16, fontSize: 14, opacity: 0.7 }}>
              <span>❤ {post.likes}</span>
              <span>💬 {post.comments}</span>
              <span>{post.moderationStatus === "pending" ? "На модерации" : "Опубликовано"}</span>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
