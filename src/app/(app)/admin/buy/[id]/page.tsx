import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { MoqProgressBar } from "@/components/moq-progress-bar";
import { tokens } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AdminBuyActions } from "./admin-buy-actions";
import { CommitmentsTable } from "./commitments-table";

export const revalidate = 10;

interface AdminBuyPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminBuyPage({ params }: AdminBuyPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  // Fetch the buy round with variant + peptide info
  const { data: round } = await supabase
    .from("buy_rounds")
    .select(`
      id, status, moq, price_per_kit, notes, opened_at,
      peptide_variants (
        weight_label,
        peptides ( name )
      )
    `)
    .eq("id", id)
    .single();

  if (!round) notFound();

  // MOQ progress
  const { data: progressData } = await supabase
    .rpc("get_moq_progress", { p_buy_round_id: id })
    .single();

  const committedKits = progressData?.committed_kits ?? 0;
  const totalValue = committedKits * round.price_per_kit;

  // Fetch all commitments with member info and payment status
  const { data: commitments } = await supabase
    .from("commitments")
    .select(`
      id, kit_quantity, committed_at,
      profiles ( display_name, email ),
      payments ( id, amount_paid, marked_paid_at, notes )
    `)
    .eq("buy_round_id", id)
    .order("committed_at", { ascending: true });

  const variant = round.peptide_variants;
  const peptide = Array.isArray(variant?.peptides)
    ? variant.peptides[0]
    : variant?.peptides;
  const title = `${peptide?.name ?? "Unknown"} — ${variant?.weight_label ?? ""}`;

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <Link
          href="/admin"
          className={cn(
            tokens.type.muted,
            "inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors mb-2"
          )}
        >
          <ChevronLeft size={14} aria-hidden="true" />
          Admin
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className={tokens.type.pageTitle}>{title}</h1>
            <div className="mt-1">
              <StatusBadge status={round.status} />
            </div>
          </div>
          <AdminBuyActions buyRoundId={id} status={round.status} committedKits={committedKits} moq={round.moq} />
        </div>
      </div>

      {/* Progress + stats */}
      <Card className="shadow-sm">
        <CardContent className="pt-4 pb-4 space-y-4">
          <MoqProgressBar
            committedKits={committedKits}
            moq={round.moq}
            buyRoundId={id}
          />
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className={cn(tokens.type.mono, "text-xl font-semibold")}>{committedKits}</p>
              <p className={tokens.type.muted}>Kits committed</p>
            </div>
            <div className="text-center">
              <p className={cn(tokens.type.mono, "text-xl font-semibold")}>${round.price_per_kit.toFixed(2)}</p>
              <p className={tokens.type.muted}>Per kit</p>
            </div>
            <div className="text-center">
              <p className={cn(tokens.type.mono, "text-xl font-semibold")}>${totalValue.toFixed(2)}</p>
              <p className={tokens.type.muted}>Total value</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {round.notes && (
        <Card className="shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className={cn(tokens.type.sectionLabel, "mb-1")}>Notes</p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{round.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Commitments */}
      <section aria-labelledby="commitments-heading">
        <h2 id="commitments-heading" className={cn(tokens.type.sectionLabel, "mb-3")}>
          Member Commitments
        </h2>
        <CommitmentsTable
          commitments={commitments ?? []}
          pricePerKit={round.price_per_kit}
          buyRoundId={id}
          roundStatus={round.status}
        />
      </section>

      {/* Danger zone */}
      {round.status !== "cancelled" && round.status !== "shipped" && (
        <section aria-labelledby="danger-heading">
          <h2 id="danger-heading" className={cn(tokens.type.sectionLabel, "mb-3 text-red-600 dark:text-red-400")}>
            Danger Zone
          </h2>
          <Card className="shadow-sm border-red-200 dark:border-red-900">
            <CardContent className="pt-4 pb-4">
              <AdminBuyActions
                buyRoundId={id}
                status={round.status}
                committedKits={committedKits}
                moq={round.moq}
                dangerZone
              />
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
