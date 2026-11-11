"use client";

import { ArrowLeft, LogOut, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProfileCustomizer } from "@/components/profile-customizer";
import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/lib/auth/session";

export function ProfilePanel({
  user,
  canManageTeam,
}: {
  user: CurrentUser;
  canManageTeam: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
      });

      if (!response.ok) {
        setError("Не вдалося вийти. Спробуй ще раз.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Не вдалося зв’язатися із сервером. Перевір з’єднання.");
    } finally {
      setPending(false);
    }
  }

  const initials = Array.from(user.displayName.trim()).slice(0, 1).join("");
  const joined = new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(user.createdAt);

  return (
    <main className="profile-page">
      <header className="profile-topbar">
        <Link aria-label="На головну" className="profile-back" href="/">
          <ArrowLeft size={17} />
          На головну
        </Link>
        <span className="profile-wordmark">ПОДСЛУШАНО <i>ЗІЕІТ</i></span>
      </header>

      <section aria-labelledby="profile-title" className="profile-card">
        <div className="profile-cover">
          <div className="profile-cover-orbit cover-orbit-one" />
          <div className="profile-cover-orbit cover-orbit-two" />
          <span className="profile-cover-label">ТВІЙ ПРОСТІР У СПІЛЬНОТІ</span>
        </div>
        <div className="profile-body">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-title-row">
            <div>
              <span className="profile-overline">ОСОБИСТИЙ ПРОФІЛЬ</span>
              <h1 id="profile-title">{user.displayName}</h1>
              <span className="profile-handle">@{user.username}</span>
            </div>
            <span className="profile-trust">
              <ShieldCheck size={15} /> Захищений акаунт
            </span>
          </div>

          <div className="profile-info-grid">
            <div className="profile-info-item">
              <span className="profile-info-icon">
                <UserRound size={17} />
              </span>
              <div>
                <span>Логін</span>
                <strong>@{user.username}</strong>
              </div>
            </div>
            <div className="profile-info-item">
              <span className="profile-info-icon profile-info-violet">
                <ShieldCheck size={17} />
              </span>
              <div>
                <span>У спільноті з</span>
                <strong>{joined}</strong>
              </div>
            </div>
          </div>

          <div className="profile-note">
            <span>✳</span>
            <p>
              Профіль — це твоя візитівка у спільноті. Тут можна змінити аватар,
              обкладинку, опис, інтереси та налаштування приватності.
            </p>
          </div>

          <ProfileCustomizer initialName={user.displayName} initialHandle={user.username} />

          {error && (
            <p aria-live="polite" className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="profile-actions">
            <Link className="profile-home-button" href="/">
              До стрічки
            </Link>
            {canManageTeam && (
              <Link className="profile-team-button" href="/admin/team">
                <ShieldCheck size={15} /> Команда та ролі
              </Link>
            )}
            <Button
              className="profile-signout"
              disabled={pending}
              onClick={signOut}
              type="button"
              variant="outline"
            >
              <LogOut size={16} />
              {pending ? "Виходимо…" : "Вийти"}
            </Button>
          </div>
        </div>
      </section>
      <p className="profile-footnote">
        Твій акаунт створено через Telegram. Для відновлення доступу звернися до
        офіційного бота.
      </p>
    </main>
  );
}
