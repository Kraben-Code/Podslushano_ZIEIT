import type { Metadata } from "next";
import Link from "next/link";
import { AudioLines, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/app/login/login-form";
import { getCurrentUser } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/db";

export const metadata: Metadata = {
  title: "Вхід — Подслушано ЗІЕІТ",
  description: "Увійди до студентської спільноти ЗІЕІТ.",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-page auth-loading">
          <div className="auth-loading-card">Завантажуємо сторінку входу…</div>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

async function LoginPageContent() {
  const databaseConfigured = isDatabaseConfigured();

  if (databaseConfigured && (await getCurrentUser())) {
    redirect("/profile");
  }

  return (
    <main className="auth-page">
      <section aria-label="Ласкаво просимо до спільноти" className="auth-story">
        <div className="auth-story-orbit auth-orbit-one" />
        <div className="auth-story-orbit auth-orbit-two" />
        <div className="auth-story-top">
          <Brand />
          <span className="auth-top-label">ПРОСТІР ДЛЯ СВОЇХ</span>
        </div>
        <div className="auth-story-copy">
          <span className="auth-hello">
            <Sparkles size={14} /> ТВОЯ СТУДЕНТСЬКА СПІЛЬНОТА
          </span>
          <h1>
            Тут починаються
            <br />
            <span>історії кампусу.</span>
          </h1>
          <p>
            Тримай зв’язок зі своїми, ділися думками й відчувай себе частиною
            спільноти ЗІЕІТ.
          </p>
        </div>
        <div aria-hidden="true" className="auth-orbit-art">
          <div className="auth-orbit-ring ring-one" />
          <div className="auth-orbit-ring ring-two" />
          <div className="auth-art-square">
            <AudioLines size={41} strokeWidth={1.7} />
          </div>
          <span className="auth-art-star">✳</span>
          <span className="auth-art-dot" />
          <span className="auth-art-caption">просто будь собою</span>
        </div>
        <div className="auth-story-footer">
          <span>ЗІЕІТ</span>
          <span>·</span>
          <span>Зроблено студентами, для студентів</span>
        </div>
      </section>

      <section aria-labelledby="login-title" className="auth-form-side">
        <div className="auth-form-head">
          <div className="auth-mobile-brand">
            <Brand />
          </div>
          <Link className="auth-home-link" href="/">
            На головну <span>↗</span>
          </Link>
        </div>
        <div className="auth-form-content">
          <div className="auth-welcome-icon">
            <LockKeyhole size={21} />
          </div>
          <div className="auth-small-label">З РАДІСТЮ ЗНОВУ БАЧИМО</div>
          <h2 id="login-title">Раді, що ти тут</h2>
          <p className="auth-form-description">
            Увійди, щоб залишатися поруч зі своєю спільнотою.
          </p>

          <LoginForm databaseConfigured={databaseConfigured} />

          <div className="auth-security">
            <ShieldCheck size={16} />
            <span>Твої дані захищені й ніколи не відображаються публічно.</span>
          </div>
        </div>
        <footer className="auth-legal">
          <span>© 2026 Подслушано ЗІЕІТ</span>
          <span>Студентська спільнота</span>
        </footer>
      </section>
    </main>
  );
}
