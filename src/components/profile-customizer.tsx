"use client";

import { Camera, ImagePlus, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";

type ProfileCustomizerProps = {
  initialName: string;
  initialHandle: string;
};

export function ProfileCustomizer({ initialName, initialHandle }: ProfileCustomizerProps) {
  const [displayName, setDisplayName] = useState(initialName);
  const [bio, setBio] = useState(
    "Студент ЗІЕІТ. Ділюся новинами, ідеями, питаннями і корисними матеріалами для громади.",
  );
  const [interests, setInterests] = useState([
    "IT",
    "Спільнота",
    "Події",
    "Навчання",
  ]);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState("Друзям і підписникам");

  const readFileAsDataUrl = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  };

  const readCoverAsDataUrl = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCover(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  };

  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 24,
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        style={{
          height: 120,
          background: cover
            ? `linear-gradient(135deg, rgba(15, 23, 42, 0.12), rgba(59, 130, 246, 0.2)), url(${cover}) center/cover no-repeat`
            : "linear-gradient(135deg, #1d4ed8 0%, #8b5cf6 100%)",
          position: "relative",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-end",
          padding: 16,
        }}
      >
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,255,255,0.9)",
            padding: "8px 12px",
            borderRadius: 999,
            cursor: "pointer",
            color: "#0f172a",
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          <ImagePlus size={15} />
          Обкладинка
          <input hidden type="file" accept="image/*" onChange={(e) => readCoverAsDataUrl(e.target.files?.[0] ?? null)} />
        </label>
      </div>

      <div style={{ padding: 20, display: "grid", gap: 20 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: -42 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: avatar ? `url(${avatar}) center/cover no-repeat` : "linear-gradient(135deg, #34d399, #3b82f6)",
              border: "4px solid #fff",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 10px 25px rgba(59, 130, 246, 0.18)",
              color: "#fff",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            {!avatar && displayName.slice(0, 1).toUpperCase()}
          </div>

          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#f3f4f6",
              padding: "10px 12px",
              borderRadius: 12,
              cursor: "pointer",
              color: "#111827",
              fontWeight: 600,
            }}
          >
            <Camera size={16} />
            Змінити аватар
            <input hidden type="file" accept="image/*" onChange={(e) => readFileAsDataUrl(e.target.files?.[0] ?? null)} />
          </label>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#475569", fontSize: 13, fontWeight: 700 }}>Відображене ім’я</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={{ border: "1px solid #dbe2ea", borderRadius: 12, padding: "12px 14px", fontSize: 16 }}
            />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#475569", fontSize: 13, fontWeight: 700 }}>Логін</span>
            <input
              value={initialHandle}
              readOnly
              style={{ border: "1px solid #dbe2ea", borderRadius: 12, padding: "12px 14px", fontSize: 16, background: "#f8fafc" }}
            />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#475569", fontSize: 13, fontWeight: 700 }}>Опис</span>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              style={{ border: "1px solid #dbe2ea", borderRadius: 12, padding: "12px 14px", fontSize: 15, resize: "vertical" }}
            />
          </label>

          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#475569", fontSize: 13, fontWeight: 700 }}>Інтереси</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {interests.map((interest, index) => (
                <button
                  key={interest + index}
                  type="button"
                  onClick={() => setInterests((current) => current.filter((_, i) => i !== index))}
                  style={{
                    background: "#eef2ff",
                    color: "#4338ca",
                    border: "none",
                    borderRadius: 999,
                    padding: "8px 12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {interest} ×
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#475569", fontSize: 13, fontWeight: 700 }}>Приватність</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                "Усі користувачі",
                "Підписники",
                "Друзям і підписникам",
                "Тільки я",
              ].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPrivacy(option)}
                  style={{
                    border: privacy === option ? "1px solid #8b5cf6" : "1px solid #dbe2ea",
                    borderRadius: 999,
                    background: privacy === option ? "#f5f3ff" : "#fff",
                    color: privacy === option ? "#5b21b6" : "#334155",
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #eef2f7",
            paddingTop: 16,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#0f172a", fontWeight: 700 }}>
            <ShieldCheck size={16} />
            Захищений профіль
          </div>
          <button
            type="button"
            style={{
              border: "none",
              borderRadius: 12,
              background: "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
              color: "#fff",
              padding: "12px 18px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Зберегти налаштування
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6b7280", fontSize: 13 }}>
          <Sparkles size={15} />
          Налаштування синхронізуються з профілем на сайті і будуть доступні в Telegram після підтвердження.
        </div>
      </div>
    </section>
  );
}
