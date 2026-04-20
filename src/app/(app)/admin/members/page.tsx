import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { tokens } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { InviteForm } from "./invite-form";
import { MembersTable } from "./members-table";

export const revalidate = 10;

export default async function AdminMembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: members }, { data: pendingInvites }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase
      .from("profiles")
      .select("id, email, display_name, role, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("pending_invites")
      .select("id, email, created_at, expires_at, accepted_at")
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  if (profile?.role !== "admin") redirect("/");

  return (
    <div className="space-y-6">
      <h1 className={tokens.type.pageTitle}>Members</h1>

      {/* Invite form */}
      <section aria-labelledby="invite-heading">
        <h2 id="invite-heading" className={cn(tokens.type.sectionLabel, "mb-3")}>
          Invite Member
        </h2>
        <InviteForm />
      </section>

      {/* Pending invites */}
      {pendingInvites && pendingInvites.length > 0 && (
        <section aria-labelledby="pending-heading">
          <h2 id="pending-heading" className={cn(tokens.type.sectionLabel, "mb-3")}>
            Pending Invites
          </h2>
          <Card className="shadow-sm">
            <ul role="list" className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {pendingInvites.map((invite) => {
                const isExpired = new Date(invite.expires_at) < new Date();
                return (
                  <li key={invite.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{invite.email}</p>
                      <p className={tokens.type.muted}>
                        {isExpired ? (
                          <span className="text-red-500 dark:text-red-400">Expired</span>
                        ) : (
                          "Pending"
                        )}
                        {" · "}
                        Sent {new Date(invite.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <InviteForm resendEmail={invite.email} inviteId={invite.id} />
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      )}

      {/* Members table */}
      <section aria-labelledby="members-heading">
        <h2 id="members-heading" className={cn(tokens.type.sectionLabel, "mb-3")}>
          All Members
        </h2>
        <MembersTable members={members ?? []} currentUserId={user!.id} />
      </section>
    </div>
  );
}
