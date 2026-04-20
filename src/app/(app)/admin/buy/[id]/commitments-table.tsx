"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { markPaymentReceived, removePayment } from "@/lib/actions/payments";
import { tokens } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { BuyRoundStatus } from "@/lib/supabase/database.types";

interface Commitment {
  id: string;
  kit_quantity: number;
  committed_at: string;
  profiles: { display_name: string; email: string } | { display_name: string; email: string }[] | null;
  payments: { id: string; amount_paid: number; marked_paid_at: string; notes: string | null }[] | null;
}

interface CommitmentsTableProps {
  commitments: Commitment[];
  pricePerKit: number;
  buyRoundId: string;
  roundStatus: BuyRoundStatus;
}

function PaymentCell({
  commitment,
  pricePerKit,
  roundStatus,
}: {
  commitment: Commitment;
  pricePerKit: number;
  roundStatus: BuyRoundStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const payment = Array.isArray(commitment.payments)
    ? commitment.payments[0]
    : commitment.payments;
  const amtOwed = commitment.kit_quantity * pricePerKit;

  // Before lock, no payment tracking
  if (roundStatus === "open") {
    return <span className={tokens.type.muted}>—</span>;
  }

  if (payment) {
    return (
      <div className="flex items-center gap-2">
        <span className={cn(tokens.status.paid, "text-xs font-medium px-2 py-0.5 rounded-full")}>
          Paid ✓
        </span>
        <button
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const result = await removePayment(payment.id);
              if (!result.success) {
                toast.error(result.error ?? "Failed to remove payment.");
                return;
              }
              toast.success("Payment removed.");
              router.refresh();
            });
          }}
          aria-label="Undo payment"
        >
          undo
        </button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="xs"
      className="min-h-[36px]"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await markPaymentReceived(commitment.id, amtOwed);
          if (!result.success) {
            toast.error(result.error ?? "Failed to mark payment.");
            return;
          }
          toast.success("Payment marked.");
          router.refresh();
        });
      }}
    >
      {isPending ? "Marking..." : `Mark paid $${amtOwed.toFixed(2)}`}
    </Button>
  );
}

export function CommitmentsTable({
  commitments,
  pricePerKit,
  buyRoundId: _buyRoundId,
  roundStatus,
}: CommitmentsTableProps) {
  if (commitments.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-8 text-center">
          <p className={tokens.type.muted}>
            No commitments yet. Members will appear here as they commit.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <Card className="shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Member</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Kits</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Owed</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Payment</th>
              </tr>
            </thead>
            <tbody>
              {commitments.map((commitment) => {
                const profile = Array.isArray(commitment.profiles)
                  ? commitment.profiles[0]
                  : commitment.profiles;
                const amtOwed = commitment.kit_quantity * pricePerKit;

                return (
                  <tr
                    key={commitment.id}
                    className="border-b border-zinc-50 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors last:border-0"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{profile?.display_name}</p>
                      <p className={tokens.type.muted}>{profile?.email}</p>
                    </td>
                    <td className={cn("px-4 py-3 text-right", tokens.type.mono)}>
                      {commitment.kit_quantity}
                    </td>
                    <td className={cn("px-4 py-3 text-right", tokens.type.mono)}>
                      ${amtOwed.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <PaymentCell
                        commitment={commitment}
                        pricePerKit={pricePerKit}
                        roundStatus={roundStatus}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Mobile card list */}
      <ul className="md:hidden space-y-2" role="list">
        {commitments.map((commitment) => {
          const profile = Array.isArray(commitment.profiles)
            ? commitment.profiles[0]
            : commitment.profiles;
          const amtOwed = commitment.kit_quantity * pricePerKit;

          return (
            <li key={commitment.id}>
              <Card className="shadow-sm">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{profile?.display_name}</p>
                      <p className={tokens.type.muted}>{profile?.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn(tokens.type.mono, "text-sm")}>{commitment.kit_quantity} kits</p>
                      <p className={cn(tokens.type.mono, "text-sm")}>${amtOwed.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <PaymentCell
                      commitment={commitment}
                      pricePerKit={pricePerKit}
                      roundStatus={roundStatus}
                    />
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}
