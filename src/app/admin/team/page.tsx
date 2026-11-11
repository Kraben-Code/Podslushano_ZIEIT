import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { TeamManager } from "@/app/admin/team/team-manager";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Команда та ролі — Подслушано ЗІЕІТ",
};

export default function TeamPage() {
  return (
    <Suspense
      fallback={
        <main className="team-page">
          <div className="team-loading">Завантажуємо команду…</div>
        </main>
      }
    >
      <TeamPageContent />
    </Suspense>
  );
}

async function TeamPageContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fteam");
  if (!(await hasPermission(user.id, "team.roles.manage"))) notFound();

  return (
    <main className="team-page">
      <header className="team-topbar">
        <Link className="team-back" href="/profile">
          <ArrowLeft size={17} /> Профіль
        </Link>
        <span className="team-topbar-label">
          <Shield size={15} /> АДМІНІСТРУВАННЯ
        </span>
      </header>
      <TeamManager actorId={user.id} />
      <footer className="team-footnote">
        Усі зміни ролей журналюються. Роль OWNER не змінюється через звичайне
        керування командою.
      </footer>
    </main>
  );
}
