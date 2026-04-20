"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { lockBuyRound, updateBuyRoundStatus } from "@/lib/actions/buy-rounds";
import { toast } from "sonner";
import type { BuyRoundStatus } from "@/lib/supabase/database.types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface AdminBuyActionsProps {
  buyRoundId: string;
  status: BuyRoundStatus;
  committedKits: number;
  moq: number;
  dangerZone?: boolean;
}

export function AdminBuyActions({
  buyRoundId,
  status,
  committedKits,
  moq,
  dangerZone = false,
}: AdminBuyActionsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleAction(
    action: () => Promise<{ success: boolean; error?: string }>
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    });
  }

  // Danger zone: only cancel button
  if (dangerZone) {
    if (status === "cancelled" || status === "shipped") return null;
    return (
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Cancel buy round</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            This will cancel the buy and notify members. This cannot be undone.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger
            className={cn(buttonVariants({ variant: "destructive", size: "sm" }), "min-h-[44px] shrink-0")}
            disabled={isPending}
          >
            Cancel Buy
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this buy round?</AlertDialogTitle>
              <AlertDialogDescription>
                This will cancel the buy round. All commitments will remain in
                the system for reference. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction
                className={cn(buttonVariants({ variant: "destructive" }))}
                onClick={() =>
                  handleAction(() =>
                    updateBuyRoundStatus(buyRoundId, "cancelled")
                  )
                }
              >
                Yes, cancel buy
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Primary action button based on status
  if (status === "open") {
    const moqMet = committedKits >= moq;
    return (
      <Button
        size="sm"
        className="min-h-[44px]"
        disabled={isPending || !moqMet}
        onClick={() => handleAction(() => lockBuyRound(buyRoundId))}
        title={!moqMet ? `MOQ not met (${committedKits}/${moq} kits)` : undefined}
      >
        {isPending ? "Locking..." : "Lock Buy"}
      </Button>
    );
  }

  if (status === "locked") {
    return (
      <Button
        size="sm"
        className="min-h-[44px]"
        disabled={isPending}
        onClick={() =>
          handleAction(() => updateBuyRoundStatus(buyRoundId, "submitted"))
        }
      >
        {isPending ? "Submitting..." : "Submit to Supplier"}
      </Button>
    );
  }

  if (status === "submitted") {
    return (
      <Button
        size="sm"
        className="min-h-[44px]"
        disabled={isPending}
        onClick={() =>
          handleAction(() => updateBuyRoundStatus(buyRoundId, "shipped"))
        }
      >
        {isPending ? "Marking..." : "Mark as Shipped"}
      </Button>
    );
  }

  return null;
}
