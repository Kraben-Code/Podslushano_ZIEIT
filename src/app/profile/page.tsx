import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ProfilePanel } from "@/app/profile/profile-panel";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Мій профіль — Подслушано ЗІЕІТ",
};

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <main className="profile-page profile-loading">
          <div>Завантажуємо профіль…</div>
        </main>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}

async function ProfilePageContent() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=%2Fprofile");
  }

  const canManageTeam = await hasPermission(user.id, "team.roles.manage");

  return <ProfilePanel canManageTeam={canManageTeam} user={user} />;
}
