"use client";

import { AlertCircle, LoaderCircle, Send, Tag } from "lucide-react";
import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

type ChatRoom = {
  key: string;
  name: string;
  description: string;
};

type ChatMessage = {
  id: string;
  type: "message" | "listing";
  content: string;
  title: string | null;
  price: number | null;
  createdAt: string;
  author: string;
};

type MessageKind = "message" | "listing";
const emptyMessages: ChatMessage[] = [];

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "#fff",
} as const;

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function RealtimeChat() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [roomKey, setRoomKey] = useState("");
  const [messagesByRoom, setMessagesByRoom] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [kind, setKind] = useState<MessageKind>("message");
  const [draft, setDraft] = useState("");
  const [listingTitle, setListingTitle] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [error, setError] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [sending, setSending] = useState(false);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;

    async function loadRooms() {
      try {
        const response = await fetch("/api/chat/rooms", { cache: "no-store" });
        const result = (await response.json()) as {
          rooms?: ChatRoom[];
          error?: string;
        };

        if (!response.ok) {
          if (active) setError(result.error ?? "Не удалось открыть чат.");
          return;
        }

        if (active) {
          setRooms(result.rooms ?? []);
          setRoomKey((current) => current || result.rooms?.[0]?.key || "");
        }
      } catch {
        if (active) setError("Не удалось подключиться к чату. Проверьте соединение.");
      } finally {
        if (active) setLoadingRooms(false);
      }
    }

    void loadRooms();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!roomKey) return;

    let active = true;
    let cursor: string | null = null;

    async function loadMessages() {
      try {
        const query = new URLSearchParams({ room: roomKey });
        if (cursor) query.set("after", cursor);

        const response = await fetch(`/api/chat/messages?${query}`, {
          cache: "no-store",
        });
        const result = (await response.json()) as {
          messages?: ChatMessage[];
          error?: string;
        };

        if (!active) return;
        if (!response.ok) {
          setError(result.error ?? "Не удалось загрузить сообщения.");
          return;
        }

        setError("");
        const incoming = result.messages ?? [];
        if (incoming.length > 0) {
          cursor = incoming[incoming.length - 1].createdAt;
          setMessagesByRoom((currentByRoom) => {
            const current = currentByRoom[roomKey] ?? [];
            const byId = new Map(current.map((message) => [message.id, message]));
            for (const message of incoming) byId.set(message.id, message);
            return {
              ...currentByRoom,
              [roomKey]: [...byId.values()].sort(
                (left, right) =>
                  new Date(left.createdAt).getTime() -
                  new Date(right.createdAt).getTime(),
              ),
            };
          });
        }
      } catch {
        if (active) setError("Не удалось обновить чат. Проверьте соединение.");
      }
    }

    void loadMessages();
    const interval = window.setInterval(loadMessages, 2500);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [roomKey]);

  const messages = messagesByRoom[roomKey] ?? emptyMessages;

  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || !roomKey) return;

    const content = draft.trim();
    if (kind === "message" && !content) return;
    if (kind === "listing" && listingTitle.trim().length < 3) {
      setError("Добавьте название объявления (минимум 3 символа).");
      return;
    }

    const price = listingPrice.trim() ? Number(listingPrice) : undefined;
    if (
      kind === "listing" &&
      price !== undefined &&
      (!Number.isSafeInteger(price) || price < 0 || price > 100_000_000)
    ) {
      setError("Укажите цену целым числом от 0 до 100 000 000.");
      return;
    }

    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "message"
            ? { type: kind, roomKey, content }
            : {
                type: kind,
                roomKey,
                content,
                title: listingTitle.trim(),
                price,
              },
        ),
      });
      const result = (await response.json()) as {
        message?: ChatMessage;
        error?: string;
      };

      if (!response.ok) {
        setError(result.error ?? "Сообщение не отправлено.");
        return;
      }

      const savedMessage = result.message;
      if (savedMessage) {
        setMessagesByRoom((currentByRoom) => {
          const current = currentByRoom[roomKey] ?? [];
          return {
            ...currentByRoom,
            [roomKey]: current.some((message) => message.id === savedMessage.id)
              ? current
              : [...current, savedMessage],
          };
        });
      }
      setDraft("");
      setListingTitle("");
      setListingPrice("");
    } catch {
      setError("Не удалось отправить сообщение. Проверьте соединение и повторите.");
    } finally {
      setSending(false);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  const activeRoom = rooms.find((room) => room.key === roomKey);

  return (
    <div className="chat-layout" style={{ display: "grid", gap: 18 }}>
      <aside style={{ ...cardStyle, padding: 18 }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 14, color: "#64748b" }}>
          Комнаты
        </h2>
        {loadingRooms ? (
          <LoaderCircle aria-label="Загрузка комнат" className="animate-spin" size={20} />
        ) : rooms.length > 0 ? (
          <div style={{ display: "grid", gap: 8 }}>
            {rooms.map((room) => (
              <button
                key={room.key}
                type="button"
                onClick={() => setRoomKey(room.key)}
                aria-pressed={room.key === roomKey}
                style={{
                  border: room.key === roomKey ? "1px solid #a78bfa" : "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: "11px 12px",
                  textAlign: "left",
                  background: room.key === roomKey ? "#f5f3ff" : "#fff",
                  color: "#111827",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {room.name}
              </button>
            ))}
          </div>
        ) : null}
      </aside>

      <section
        aria-label={activeRoom ? `Чат: ${activeRoom.name}` : "Чат"}
        style={{ ...cardStyle, overflow: "hidden", minWidth: 0 }}
      >
        <header
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e5e7eb",
            background: "#f8fafc",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>{activeRoom?.name ?? "Чат"}</h2>
          <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 13 }}>
            {activeRoom?.description ?? "Выберите комнату"}
          </p>
        </header>

        <div
          aria-live="polite"
          style={{
            display: "grid",
            alignContent: "start",
            gap: 12,
            minHeight: 280,
            maxHeight: 480,
            overflowY: "auto",
            padding: 18,
          }}
        >
          {!loadingRooms && !error && messages.length === 0 && (
            <p style={{ margin: "auto", color: "#64748b", textAlign: "center" }}>
              В комнате пока нет сообщений. Начните разговор.
            </p>
          )}
          {messages.map((message) => (
            <article
              key={message.id}
              ref={lastMessageRef}
              style={{
                justifySelf: "start",
                width: "min(100%, 560px)",
                padding: 13,
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                background: message.type === "listing" ? "#fffbeb" : "#f8fafc",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 6,
                  color: "#475569",
                  fontSize: 12,
                }}
              >
                <strong>{message.author}</strong>
                <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
              </div>
              {message.type === "listing" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#92400e", fontWeight: 800 }}>
                  <Tag size={15} />
                  <span>{message.title}</span>
                  {message.price !== null && (
                    <span style={{ marginLeft: "auto" }}>{message.price.toLocaleString("ru-RU")} ₴</span>
                  )}
                </div>
              )}
              {message.content && (
                <p style={{ margin: message.type === "listing" ? "8px 0 0" : 0, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                  {message.content}
                </p>
              )}
            </article>
          ))}
          <div ref={lastMessageRef} />
        </div>

        {error && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              margin: "0 18px 12px",
              padding: "10px 12px",
              borderRadius: 10,
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: 14,
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
            {error.includes("Войдите") && (
              <Link href="/login" style={{ color: "inherit", fontWeight: 800 }}>
                Войти
              </Link>
            )}
          </div>
        )}

        <form
          onSubmit={sendMessage}
          style={{
            display: "grid",
            gap: 10,
            padding: 16,
            borderTop: "1px solid #e5e7eb",
            background: "#fff",
          }}
        >
          <div role="group" aria-label="Тип публикации" style={{ display: "flex", gap: 8 }}>
            <button type="button" aria-pressed={kind === "message"} onClick={() => setKind("message")} style={toggleStyle(kind === "message")}>
              Сообщение
            </button>
            <button type="button" aria-pressed={kind === "listing"} onClick={() => setKind("listing")} style={toggleStyle(kind === "listing")}>
              Объявление
            </button>
          </div>

          {kind === "listing" && (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 150px", gap: 8 }}>
              <input
                aria-label="Название объявления"
                value={listingTitle}
                onChange={(event) => setListingTitle(event.target.value)}
                maxLength={100}
                placeholder="Что продаёте или ищете?"
                style={inputStyle}
              />
              <input
                aria-label="Цена в гривнах"
                type="number"
                min="0"
                max="100000000"
                step="1"
                value={listingPrice}
                onChange={(event) => setListingPrice(event.target.value)}
                placeholder="Цена, ₴"
                style={inputStyle}
              />
            </div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "end" }}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              maxLength={1000}
              rows={2}
              placeholder={
                kind === "listing"
                  ? "Описание объявления (необязательно)…"
                  : "Напишите сообщение… Enter — отправить, Shift+Enter — новая строка"
              }
              aria-label={kind === "listing" ? "Описание объявления" : "Текст сообщения"}
              style={{ ...inputStyle, resize: "vertical", minHeight: 48, flex: 1 }}
            />
            <button
              type="submit"
              disabled={sending || !roomKey}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                minHeight: 46,
                padding: "0 16px",
                border: 0,
                borderRadius: 12,
                background: "#4f46e5",
                color: "#fff",
                fontWeight: 800,
                cursor: sending ? "wait" : "pointer",
                opacity: sending ? 0.7 : 1,
              }}
            >
              <Send size={16} />
              Отправить
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function toggleStyle(active: boolean) {
  return {
    border: active ? "1px solid #a78bfa" : "1px solid #e5e7eb",
    borderRadius: 999,
    padding: "7px 12px",
    background: active ? "#f5f3ff" : "#fff",
    color: "#1f2937",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  } as const;
}

const inputStyle = {
  boxSizing: "border-box",
  width: "100%",
  border: "1px solid #dbe2ea",
  borderRadius: 11,
  padding: "11px 12px",
  font: "inherit",
  color: "#111827",
  background: "#fff",
} as const;
