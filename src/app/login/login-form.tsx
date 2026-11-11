"use client";

import Link from "next/link";
import { ArrowRight, Eye, EyeOff, KeyRound, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

export function LoginForm({ databaseConfigured }: { databaseConfigured: boolean }) {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password"),
        }),
      });
      const result: { error?: string } = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Не вдалося увійти. Спробуй ще раз.");
        return;
      }

      router.replace("/profile");
      router.refresh();
    } catch {
      setError("Не вдалося зв’язатися із сервером. Перевір з’єднання і повтори спробу.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label className="form-field">
        <span>Логін</span>
        <span className="form-input-wrap">
          <UserRound aria-hidden="true" size={17} />
          <input
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            maxLength={30}
            name="username"
            placeholder="Твій унікальний логін"
            required
            spellCheck={false}
          />
        </span>
      </label>

      <label className="form-field">
        <span>Пароль</span>
        <span className="form-input-wrap">
          <KeyRound aria-hidden="true" size={17} />
          <input
            autoComplete="current-password"
            maxLength={128}
            name="password"
            placeholder="Введи свій пароль"
            required
            type={passwordVisible ? "text" : "password"}
          />
          <button
            aria-label={passwordVisible ? "Сховати пароль" : "Показати пароль"}
            className="password-toggle"
            onClick={() => setPasswordVisible((visible) => !visible)}
            type="button"
          >
            {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </span>
      </label>

      {error && (
        <p aria-live="polite" className="form-error" role="alert">
          {error}
        </p>
      )}

      {!databaseConfigured && (
        <p className="setup-notice">
          Це локальне прев’ю. Щоб увійти, спочатку підключи development-базу
          даних у файлі <code>.env.local</code>.
        </p>
      )}

      <Button
        className="login-submit"
        disabled={pending}
        size="lg"
        type="submit"
      >
        {pending ? "Перевіряємо…" : "Увійти"}
        {!pending && <ArrowRight size={17} />}
      </Button>

      <div className="login-divider">
        <span />
        <span>доступ до спільноти</span>
        <span />
      </div>

      <p className="registration-note">
        Ще не маєш акаунта? Реєстрація відбувається лише через офіційного
        Telegram-бота. Самостійної реєстрації на сайті немає.
      </p>
      <Link className="back-home" href="/">
        Повернутися на головну
      </Link>
    </form>
  );
}
