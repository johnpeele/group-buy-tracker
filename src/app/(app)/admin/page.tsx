import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { MoqProgressBar } from "@/components/moq-progress-bar";
import { tokens } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Plus, ChevronRight, UserPlus, Package, Users } from "lucide-react";

export const revalidate = 10;

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: rounds }, { count: memberCount }, { data: pendingPayments }] =
    await Promise.all([
      supabase.from("profiles").select("role").eq("id", user!.id).single(),
      supabase
        .from("buy_rounds")
        .select(`id, status, moq, opened_at, peptide_variants ( weight_label, peptides ( name ) )`)
        .in("status", ["open", "locked", "submitted"])
        .order("opened_at", { ascending: false }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("commitments")
        .select(`
          id, kit_quantity, member_id,
          profiles ( display_name ),
          buy_rounds!inner ( id, status, price_per_kit,
            peptide_variants ( weight_label, peptides ( name ) )
          ),
          payments ( id )
        `)
        .in("buy_rounds.status", ["locked", "submitted", "shipped"])
        .is("payments", null),
    ]);

  if (profile?.role !== "admin") redirect("/");

  // Fetch MOQ progress for each round
  const progressByRound: Record<string, number> = {};
  if (rounds?.length) {
    await Promise.all(
      rounds.map(async (round) => {
        const { data } = await supabase
          .rpc("get_moq_progress", { p_buy_round_id: round.id })
          .single();
        if (data) progressByRound[round.id] = data.committed_kits;
      })
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className={tokens.type.pageTitle}>Summary</h1>

      {/* Quick actions */}
      <section className="grid grid-cols-2 gap-3">
        {[
          {
            href: "/admin/buy/new",
            icon: Plus,
            label: "New Buy Round",
            desc: "Open a group buy",
          },
          {
            href: "/admin/members",
            icon: UserPlus,
            label: "Invite Member",
            desc: "Send an invite link",
          },
          {
            href: "/admin/catalog",
            icon: Package,
            label: "Peptide Catalog",
            desc: "Add & manage peptides",
          },
          {
            href: "/admin/members",
            icon: Users,
            label: "Member Directory",
            desc: "View & manage members",
          },
        ].map(({ href, icon: Icon, label, desc }) => (
          <Link
            key={label}
            href={href}
            className="group flex flex-col"
          >
            <Card className="shadow-sm hover:shadow-md transition-shadow flex-1">
              <CardContent className="pt-4 pb-4 flex flex-col gap-1.5">
                <Icon
                  size={18}
                  className="text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium leading-tight">{label}</p>
                <p className={tokens.type.muted}>{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      {/* Stats row */}
      <section className="grid grid-cols-3 gap-3">
        {[
          { label: "Open Buys", value: rounds?.filter(r => r.status === "open").length ?? 0, href: null },
          { label: "Members", value: memberCount ?? 0, href: "/admin/members" },
          { label: "Pending Payments", value: pendingPayments?.length ?? 0, href: null },
        ].map(({ label, value, href }) => {
          const content = (
            <CardContent className="pt-4 pb-4 text-center">
              <p className={cn(tokens.type.mono, "text-2xl font-semibold")}>{value}</p>
              <p className={tokens.type.muted}>{label}</p>
            </CardContent>
          );
          return href ? (
            <Link key={label} href={href} className="group flex flex-col">
              <Card className="shadow-sm hover:shadow-md transition-shadow flex-1">{content}</Card>
            </Link>
          ) : (
            <Card key={label} className="shadow-sm">{content}</Card>
          );
        })}
      </section>

      {/* Open buy rounds */}
      <section aria-labelledby="open-buys-heading">
        <h2 id="open-buys-heading" className={cn(tokens.type.sectionLabel, "mb-3")}>
          Open Buys
        </h2>
        {!rounds || rounds.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-8 text-center">
              <p className={tokens.type.muted}>No open buy rounds.</p>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3" role="list">
            {rounds.map((round) => {
              const variant = round.peptide_variants;
              const peptide = Array.isArray(variant?.peptides) ? variant.peptides[0] : variant?.peptides;
              const committedKits = progressByRound[round.id] ?? 0;

              return (
                <li key={round.id}>
                  <Link href={`/admin/buy/${round.id}`} className="block group">
                    <Card className="shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="pt-4 pb-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{peptide?.name}</p>
                            <p className={tokens.type.muted}>{variant?.weight_label}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <StatusBadge status={round.status} />
                            <ChevronRight size={16} className="text-zinc-400 group-hover:text-zinc-600 transition-colors" aria-hidden="true" />
                          </div>
                        </div>
                        <MoqProgressBar
                          committedKits={committedKits}
                          moq={round.moq}
                          buyRoundId={round.id}
                        />
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Pending payments */}
      {pendingPayments && pendingPayments.length > 0 && (
        <section aria-labelledby="pending-payments-heading">
          <h2 id="pending-payments-heading" className={cn(tokens.type.sectionLabel, "mb-3")}>
            Pending Payments
          </h2>
          <Card className="shadow-sm">
            <ul role="list" className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {pendingPayments.map((commitment) => {
                const round = commitment.buy_rounds as {
                  id: string;
                  price_per_kit: number;
                  peptide_variants: { weight_label: string; peptides: { name: string } | { name: string }[] };
                };
                const profile = commitment.profiles as { display_name: string };
                const peptide = Array.isArray(round?.peptide_variants?.peptides)
                  ? round.peptide_variants.peptides[0]
                  : round?.peptide_variants?.peptides;
                const amtOwed = (commitment.kit_quantity * round?.price_per_kit).toFixed(2);

                return (
                  <li key={commitment.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{profile?.display_name}</p>
                      <p className={tokens.type.muted}>
                        {peptide?.name} {round?.peptide_variants?.weight_label} &middot;{" "}
                        <span className={tokens.type.mono}>{commitment.kit_quantity} kits</span>
                      </p>
                    </div>
                    <Link
                      href={`/admin/buy/${round.id}`}
                      className={cn(tokens.type.mono, "text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:underline min-h-[44px] flex items-center")}
                    >
                      ${amtOwed}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
}
