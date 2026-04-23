import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { MoqProgressBar } from "@/components/moq-progress-bar";
import { tokens } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";

export const revalidate = 10;

export default async function AdminOpenBuysPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: rounds }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase
      .from("buy_rounds")
      .select(`id, status, moq, opened_at, peptide_variants ( weight_label, peptides ( name ) )`)
      .in("status", ["open", "locked", "submitted"])
      .order("opened_at", { ascending: false }),
  ]);

  if (profile?.role !== "admin") redirect("/");

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
      <div className="flex items-center justify-between">
        <h1 className={tokens.type.pageTitle}>Open Buys</h1>
        <Link href="/admin/buy/new" className={cn(buttonVariants({ size: "lg" }))}>
          <Plus size={15} className="mr-1.5" aria-hidden="true" />
          New Buy Round
        </Link>
      </div>

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
    </div>
  );
}
