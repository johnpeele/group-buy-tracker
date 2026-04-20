import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { tokens } from "@/lib/design-tokens";
import { AccountForm } from "./account-form";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email, role")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-6 max-w-sm">
      <h1 className={tokens.type.pageTitle}>Account</h1>
      <AccountForm
        userId={user.id}
        email={profile?.email ?? user.email ?? ""}
        displayName={profile?.display_name ?? ""}
        role={profile?.role ?? "member"}
      />
    </div>
  );
}
