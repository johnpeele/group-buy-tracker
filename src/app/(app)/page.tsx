import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { MoqProgressBar } from "@/components/moq-progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { tokens } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const revalidate = 10; // re-fetch every 10s (polling substitute for Realtime)

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch open buy rounds with variant + peptide info
  const { data: rounds, error } = await supabase
    .from("buy_rounds")
    .select(`
      id,
      status,
      moq,
      variant_id,
      peptide_variants (
        weight_label,
        peptides ( name )
      )
    `)
    .in("status", ["open", "locked"])
    .order("opened_at", { ascending: false });

  // Fetch my commitments for this batch (to show kit count on cards)
  const { data: myCommitments } = await supabase
    .from("commitments")
    .select("buy_round_id, kit_quantity")
    .eq("member_id", user!.id);

  const myKitsByRound: Record<string, number> = {};
  myCommitments?.forEach((c) => {
    myKitsByRound[c.buy_round_id] = c.kit_quantity;
  });

  // Fetch MOQ progress for all rounds (via SECURITY DEFINER RPC)
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
    <div className="space-y-4">
      <h1 className={cn(tokens.type.pageTitle, "mb-2")}>Open Buys</h1>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load buys. Pull to refresh.
        </p>
      ) : !rounds || rounds.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-3" role="list">
          {rounds.map((round) => {
            const variant = round.peptide_variants;
            const peptide = Array.isArray(variant?.peptides)
              ? variant.peptides[0]
              : variant?.peptides;
            const peptideName = peptide?.name ?? "Unknown peptide";
            const weightLabel = variant?.weight_label ?? "";
            const myKits = myKitsByRound[round.id];
            const committedKits = progressByRound[round.id] ?? 0;

            return (
              <li key={round.id}>
                <Link href={`/buy/${round.id}`} className="block group">
                  <Card className="shadow-sm hover:shadow-md transition-shadow duration-150">
                    <CardContent className="pt-4 pb-4 space-y-3">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {peptideName}
                          </p>
                          <p className={tokens.type.muted}>{weightLabel}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {myKits !== undefined && (
                            <span
                              className={cn(
                                tokens.type.mono,
                                "text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full"
                              )}
                            >
                              {myKits} kit{myKits !== 1 ? "s" : ""}
                            </span>
                          )}
                          <StatusBadge status={round.status} />
                          <ChevronRight
                            size={16}
                            className="text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 transition-colors"
                            aria-hidden="true"
                          />
                        </div>
                      </div>

                      {/* Progress bar */}
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

function EmptyState() {
  return (
    <Card className="shadow-sm">
      <CardContent className="py-12 text-center space-y-1">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          No open buys right now.
        </p>
        <p className={tokens.type.muted}>
          Check back soon — the coordinator will announce when the next round opens.
        </p>
      </CardContent>
    </Card>
  );
}
