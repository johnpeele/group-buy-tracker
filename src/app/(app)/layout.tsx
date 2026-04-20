import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/bottom-nav";
import { TopNav } from "@/components/top-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const isAdmin = profile.role === "admin";

  return (
    <div className="flex flex-col min-h-full">
      <TopNav displayName={profile.display_name} isAdmin={isAdmin} />
      <main
        id="main-content"
        className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-6"
      >
        {children}
      </main>
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
