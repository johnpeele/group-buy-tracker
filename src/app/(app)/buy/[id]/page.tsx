import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { MoqProgressBar } from "@/components/moq-progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { CommitmentForm } from "./commitment-form";
import { tokens } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const revalidate = 10;

interface BuyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BuyDetailPage({ params }: BuyDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch buy round
  const { data: round, error } = await supabase
    .from("buy_rounds")
    .select(`
      id, status, moq, notes,
      peptide_variants (
        weight_label,
        peptides ( name )
      )
    `)
    .eq("id", id)
    .single();

  if (error || !round) notFound();

  const variant = round.peptide_variants;
  const peptide = Array.isArray(variant?.peptides) ? variant.peptides[0] : variant?.peptides;
  const peptideName = peptide?.name ?? "Unknown";
  const weightLabel = variant?.weight_label ?? "";

  // MOQ progress
  const { data: progress } = await supabase
    .rpc("get_moq_progress", { p_buy_round_id: id })
    .single();

  // My commitment
  const { data: myCommitment } = await supabase
    .from("commitments")
    .select("id, kit_quantity")
    .eq("buy_round_id", id)
    .eq("member_id", user!.id)
    .single();

  // Payment status (only relevant post-lock)
  const showPayment = round.status !== "open";
  let paymentStatus = null;
  if (showPayment) {
    const { data } = await supabase
      .rpc("get_member_payment_status", { p_buy_round_id: id })
      .single();
    paymentStatus = data;
  }

  const committedKits = progress?.committed_kits ?? 0;
  const isEditable = round.status === "open";

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors min-h-[44px]"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Open Buys
      </Link>

      {/* Title + status */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className={cn(tokens.type.pageTitle)}>{peptideName}</h1>
          <p className={tokens.type.muted}>{weightLabel}</p>
        </div>
        <StatusBadge status={round.status} />
      </div>

      {/* MOQ progress */}
      <Card className="shadow-sm">
        <CardContent className="pt-5 pb-5">
          <MoqProgressBar
            committedKits={committedKits}
            moq={round.moq}
            buyRoundId={id}
          />
        </CardContent>
      </Card>

      {/* My commitment */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">My Commitment</CardTitle>
        </CardHeader>
        <CardContent>
          <CommitmentForm
            buyRoundId={id}
            currentKitQuantity={myCommitment?.kit_quantity ?? null}
            isEditable={isEditable}
          />
        </CardContent>
      </Card>

      {/* Payment status — only after lock */}
      {showPayment && paymentStatus && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={tokens.type.muted}>Amount owed</span>
              <span className={cn(tokens.type.mono, "text-sm font-medium")}>
                ${paymentStatus.amount_owed.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={tokens.type.muted}>
                {paymentStatus.kit_quantity} kit{paymentStatus.kit_quantity !== 1 ? "s" : ""} × ${paymentStatus.price_per_kit.toFixed(2)}/kit
              </span>
              <StatusBadge status={paymentStatus.payment_status} />
            </div>
            {paymentStatus.payment_status === "awaiting" && (
              <>
                <Separator />
                <p className={tokens.type.muted}>
                  Send payment to your coordinator, then let them know so they can mark you as paid.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {round.notes && (
        <Card className="shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className={tokens.type.muted}>{round.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
