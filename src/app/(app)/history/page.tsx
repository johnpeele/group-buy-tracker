import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { tokens } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import Link from "next/link";

export const revalidate = 60;

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: commitments, error } = await supabase
    .from("commitments")
    .select(`
      id, kit_quantity, committed_at,
      buy_rounds (
        id, status, shipped_at,
        peptide_variants (
          weight_label,
          peptides ( name )
        )
      )
    `)
    .eq("member_id", user!.id)
    .order("committed_at", { ascending: false });

  // Filter to non-open rounds
  const history = commitments?.filter(
    (c) =>
      c.buy_rounds &&
      !["open", "locked"].includes((c.buy_rounds as { status: string }).status)
  );

  return (
    <div className="space-y-4">
      <h1 className={cn(tokens.type.pageTitle, "mb-2")}>Past Orders</h1>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load history.
        </p>
      ) : !history || history.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center space-y-1">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              No past orders yet.
            </p>
            <p className={tokens.type.muted}>
              Your completed buys will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3" role="list">
          {history.map((commitment) => {
            const round = commitment.buy_rounds as {
              id: string;
              status: string;
              shipped_at: string | null;
              peptide_variants: {
                weight_label: string;
                peptides: { name: string } | { name: string }[];
              };
            };
            const variant = round?.peptide_variants;
            const peptide = Array.isArray(variant?.peptides)
              ? variant.peptides[0]
              : variant?.peptides;

            return (
              <li key={commitment.id}>
                <Link href={`/buy/${round.id}`}>
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">
                            {peptide?.name ?? "Unknown"}
                          </p>
                          <p className={tokens.type.muted}>
                            {variant?.weight_label} &middot;{" "}
                            <span className={tokens.type.mono}>
                              {commitment.kit_quantity} kit{commitment.kit_quantity !== 1 ? "s" : ""}
                            </span>
                          </p>
                        </div>
                        <StatusBadge status={round.status} />
                      </div>
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
