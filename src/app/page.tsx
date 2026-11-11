import { AppDashboard } from "@/components/app-dashboard";
import { demoPosts } from "@/lib/demo-posts";

export default function Home() {
  const demoMode = process.env.NODE_ENV === "development";

  return (
    <AppDashboard
      demoMode={demoMode}
      posts={demoMode ? demoPosts : []}
    />
  );
}
