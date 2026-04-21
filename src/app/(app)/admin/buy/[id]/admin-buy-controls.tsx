"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Pencil, ChevronLeft } from "lucide-react";
import { AdminBuyActions } from "./admin-buy-actions";
import { EditBuyForm } from "./edit-buy-form";
import { StatusBadge } from "@/components/status-badge";
import { tokens } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { BuyRoundStatus } from "@/lib/supabase/database.types";

interface AdminBuyControlsProps {
  buyRoundId: string;
  status: BuyRoundStatus;
  committedKits: number;
  moq: number;
  pricePerKit: number;
  notes: string | null;
  title: string;
  backHref: string;
  backLabel: string;
}

export function AdminBuyControls({
  buyRoundId,
  status,
  committedKits,
  moq,
  pricePerKit,
  notes,
  title,
  backHref,
  backLabel,
}: AdminBuyControlsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const isEditable = status !== "shipped" && status !== "cancelled";

  return (
    <div>
      <Link
        href={backHref}
        className={cn(
          tokens.type.muted,
          "inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors mb-2"
        )}
      >
        <ChevronLeft size={14} aria-hidden="true" />
        {backLabel}
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className={tokens.type.pageTitle}>{title}</h1>
          <div className="mt-1">
            <StatusBadge status={status} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isEditable && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing((v) => !v)}
              className="gap-1.5 min-h-[44px]"
            >
              <Pencil size={13} aria-hidden="true" />
              Edit
            </Button>
          )}
          <AdminBuyActions
            buyRoundId={buyRoundId}
            status={status}
            committedKits={committedKits}
            moq={moq}
          />
        </div>
      </div>

      <AnimatePresence>
        {isEditing && (
          <EditBuyForm
            buyRoundId={buyRoundId}
            pricePerKit={pricePerKit}
            moq={moq}
            notes={notes}
            onClose={() => setIsEditing(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
