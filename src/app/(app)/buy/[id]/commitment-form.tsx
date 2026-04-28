"use client";

import { useState, useTransition } from "react";
import { createOrUpdateCommitment } from "@/lib/actions/commitments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";
import { StatusBadge } from "@/components/status-badge";
import { tokens } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CommitmentFormProps {
  buyRoundId: string;
  currentKitQuantity: number | null;
  isEditable: boolean;
}

export function CommitmentForm({
  buyRoundId,
  currentKitQuantity,
  isEditable,
}: CommitmentFormProps) {
  const [quantity, setQuantity] = useState(
    currentKitQuantity?.toString() ?? ""
  );
  const [quantityError, setQuantityError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!isEditable) {
    return (
      <div className="flex items-center justify-between">
        <span className={tokens.type.muted}>
          {currentKitQuantity
            ? `${currentKitQuantity} kit${currentKitQuantity !== 1 ? "s" : ""}`
            : "No commitment"}
        </span>
        <StatusBadge status="locked" />
      </div>
    );
  }

  function validateQuantity(value: string): string {
    const kits = parseInt(value, 10);
    if (!kits || kits < 10) return "Minimum commitment is 10 kits.";
    return "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const error = validateQuantity(quantity);
    if (error) {
      setQuantityError(error);
      return;
    }

    const kits = parseInt(quantity, 10);
    startTransition(async () => {
      const result = await createOrUpdateCommitment(buyRoundId, kits);
      if (result.success) {
        toast.success(
          currentKitQuantity
            ? `Updated to ${result.kit_quantity} kit${result.kit_quantity !== 1 ? "s" : ""}.`
            : `${result.kit_quantity} kit${result.kit_quantity !== 1 ? "s" : ""} committed. You're in.`
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="kit-quantity">
          Number of kits
          {currentKitQuantity !== null && (
            <span className={cn(tokens.type.muted, "ml-2 font-normal")}>
              (currently {currentKitQuantity})
            </span>
          )}
        </Label>
        <Input
          id="kit-quantity"
          type="number"
          min="10"
          step="1"
          inputMode="numeric"
          placeholder="0"
          value={quantity}
          onChange={(e) => {
            setQuantity(e.target.value);
            if (quantityError) setQuantityError("");
          }}
          onBlur={(e) => {
            if (e.target.value) setQuantityError(validateQuantity(e.target.value));
          }}
          className={cn(tokens.type.mono)}
          aria-invalid={!!quantityError}
          aria-describedby={quantityError ? "kit-quantity-error kit-quantity-hint" : "kit-quantity-hint"}
          required
        />
        <FormMessage message={quantityError} id="kit-quantity-error" />
        <p
          id="kit-quantity-hint"
          className={tokens.type.muted}
        >
          Minimum 10 kits. No maximum.
        </p>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full min-h-[44px]"
      >
        {isPending
          ? "Saving..."
          : currentKitQuantity !== null
          ? "Update commitment"
          : "Commit to this buy"}
      </Button>
    </form>
  );
}
