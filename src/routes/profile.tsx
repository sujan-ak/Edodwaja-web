import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import {
  AccountTab,
  NotificationsTab,
  SecurityTab,
  PrivacyTab,
} from "@/components/profile/ProfileComponents";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { fetchProfile, type Profile } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — MakersFlow" },
      {
        name: "description",
        content: "Manage your MakersFlow profile, notifications, security and privacy settings.",
      },
    ],
  }),
  component: ProfilePage,
});

type TabKey = "account" | "notifications" | "security" | "privacy";
const TABS: { key: TabKey; label: string }[] = [
  { key: "account", label: "Account" },
  { key: "notifications", label: "Notifications" },
  { key: "security", label: "Security" },
  { key: "privacy", label: "Privacy" },
];

function ProfilePage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [tab, setTab] = useState<TabKey>("account");

  const profileQ = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user?.id,
  });

  if (!user || authLoading || profileQ.isLoading) {
    return (
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="grid flex-1 place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const profile: Profile = profileQ.data ?? {
    id: user.id,
    full_name: (user.user_metadata?.full_name as string) ?? null,
    email: user.email ?? null,
    avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
    grade: null,
    school: null,
    role: null,
  };
  const isGoogle = user.app_metadata?.provider === "google";

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10">
          <header className="mb-6">
            <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
              Your profile
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your personal info, notifications and security.
            </p>
          </header>

          <div className="flex gap-1 overflow-x-auto border-b border-border">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "relative shrink-0 px-4 py-3 text-sm font-medium transition-colors sm:px-5",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                  {active && (
                    <motion.span
                      layoutId="profile-tab-underline"
                      className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-primary to-accent"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            {tab === "account" && (
              <AccountTab
                profile={profile}
                isGoogle={isGoogle}
                onUpdated={() => profileQ.refetch()}
              />
            )}
            {tab === "notifications" && <NotificationsTab />}
            {tab === "security" && <SecurityTab isGoogle={isGoogle} />}
            {tab === "privacy" && <PrivacyTab />}
          </div>
        </div>
      </main>
    </div>
  );
}
