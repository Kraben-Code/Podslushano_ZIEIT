"use client";

import { SendHorizonal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  author: string;
  text: string;
  self?: boolean;
  time: string;
};

const seedMessages: ChatMessage[] = [
  { id: "1", author: "Ліля", text: "Хто знає, де краще купити переплет для курсової?", time: "14:10" },
  { id: "2", author: "Ти", text: "У нас на 3 поверсі є нормальний магазин, але краще перевірити ціни.", self: true, time: "14:12" },
  { id: "3", author: "Данило", text: "Піду в суботу на весняний ярмарок, там багато цікавого.", time: "14:13" },
];

export function RealtimeChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(seedMessages);
  const [draft, setDraft] = useState("");
  const lastMessageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const timer = setInterval(() => {
      setMessages((current) => {
        const response = [
          "Є, я бачу, що люди вже обговорюють це в чату.",
          "Тут точно багато цікавого. Додаю локацію пізніше.",
          "Мені теж цікаво: хто вже брав участь в заході?",
        ][Math.floor(Math.random() * 3)];

        return [
          ...current,
          {
            id: `${Date.now()}-${Math.random()}`,
            author: "Система",
            text: response,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ];
      });
    }, 24000);

    return () => clearInterval(timer);
  }, []);

  const roomInfo = useMemo(
    () => ({ online: 142, topic: "Студентський чат / ЗІЕІТ" }),
    [],
  );

  const sendMessage = () => {
    if (!draft.trim()) return;

    setMessages((current) => [
      ...current,
      {
        id: `${Date.now()}`,
        author: "Ти",
        text: draft.trim(),
        self: true,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setDraft("");
  };

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 24,
        background: "#fff",
        overflow: "hidden",
        boxShadow: "0 12px 24px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 18,
          background: "linear-gradient(135deg, #09090b 0%, #1d4ed8 100%)",
          color: "#fff",
        }}
      >
        <div>
          <div style={{ fontSize: 11, opacity: 0.8, letterSpacing: 1.2, textTransform: "uppercase" }}>Чат</div>
          <strong style={{ fontSize: 20 }}>{roomInfo.topic}</strong>
        </div>
        <div style={{ fontSize: 12, background: "rgba(255,255,255,0.12)", padding: "6px 10px", borderRadius: 999 }}>
          {roomInfo.online} онлайн
        </div>
      </div>

      <div style={{ display: "grid", maxHeight: 440, overflowY: "auto", padding: 18, gap: 14 }}>
        {messages.map((message) => (
          <div
            key={message.id}
            ref={lastMessageRef}
            style={{
              maxWidth: "78%",
              justifySelf: message.self ? "end" : "start",
              background: message.self ? "#dbeafe" : "#f8fafc",
              borderRadius: 16,
              padding: "12px 14px",
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>{message.author}</div>
            <div style={{ lineHeight: 1.5 }}>{message.text}</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6, textAlign: "right" }}>{message.time}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, padding: 18, borderTop: "1px solid #e5e7eb", background: "#f8fafc" }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Напишіть повідомлення…"
          style={{ flex: 1, border: "1px solid #dbe2ea", borderRadius: 12, padding: "12px 14px", fontSize: 15 }}
        />
        <button
          type="button"
          onClick={sendMessage}
          style={{
            border: "none",
            background: "linear-gradient(135deg, #2563eb 0%, #8b5cf6 100%)",
            color: "#fff",
            padding: "12px 18px",
            borderRadius: 12,
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <SendHorizonal size={16} />
          Надіслати
        </button>
      </div>
    </div>
  );
}
