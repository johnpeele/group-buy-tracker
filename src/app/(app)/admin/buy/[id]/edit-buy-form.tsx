"use client";

import { useState, useTransition } from "react";
import { updateBuyRound } from "@/lib/actions/buy-rounds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";
import { Card, CardContent } from "@/components/ui/card";
import { tokens } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "motion/react";

interface EditBuyFormProps {
  buyRoundId: string;
  pricePerKit: number;
  moq: number;
  notes: string | null;
  onClose: () => void;
}

export function EditBuyForm({ buyRoundId, pricePerKit, moq, notes, onClose }: EditBuyFormProps) {
  const [price, setPrice] = useState(pricePerKit.toFixed(2));
  const [moqValue, setMoqValue] = useState(moq.toString());
  const [notesValue, setNotesValue] = useState(notes ?? "");
  const [errors, setErrors] = useState<{ price?: string; moq?: string }>({});
  const [isPending, startTransition] = useTransition();

  function validatePrice(value: string): string {
    const parsed = parseFloat(value);
    if (!value || isNaN(parsed) || parsed <= 0) return "Price must be greater than 0.";
    return "";
  }

  function validateMoq(value: string): string {
    const parsed = parseInt(value, 10);
    if (!value || isNaN(parsed) || parsed < 1) return "MOQ must be at least 1.";
    return "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceError = validatePrice(price);
    const moqError = validateMoq(moqValue);

    if (priceError || moqError) {
      setErrors({ price: priceError || undefined, moq: moqError || undefined });
      return;
    }

    const parsedPrice = parseFloat(price);
    const parsedMoq = parseInt(moqValue, 10);

    startTransition(async () => {
      const result = await updateBuyRound(buyRoundId, {
        price_per_kit: parsedPrice,
        moq: parsedMoq,
        notes: notesValue.trim() || null,
      });

      if (result.success) {
        toast.success("Buy round updated.");
        onClose();
      } else {
        toast.error(result.error ?? "Failed to update.");
      }
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{
        opacity: { duration: 0.15, ease: "easeOut" },
        height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
      }}
      style={{ overflow: "hidden", padding: "4px", margin: "0 -4px -4px" }}
    >
    <Card className="shadow-sm mt-4">
      <CardContent className="pt-4 pb-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className={cn(tokens.type.sectionLabel, "mb-1")}>Edit Buy Round</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-price">Price per kit ($)</Label>
              <Input
                id="edit-price"
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  if (errors.price) setErrors((prev) => ({ ...prev, price: undefined }));
                }}
                onBlur={(e) => {
                  const err = validatePrice(e.target.value);
                  if (err) setErrors((prev) => ({ ...prev, price: err }));
                }}
                aria-invalid={!!errors.price}
                required
                className="min-h-[44px]"
              />
              <FormMessage message={errors.price} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-moq">Minimum order quantity (kits)</Label>
              <Input
                id="edit-moq"
                type="number"
                min="1"
                step="1"
                value={moqValue}
                onChange={(e) => {
                  setMoqValue(e.target.value);
                  if (errors.moq) setErrors((prev) => ({ ...prev, moq: undefined }));
                }}
                onBlur={(e) => {
                  const err = validateMoq(e.target.value);
                  if (err) setErrors((prev) => ({ ...prev, moq: err }));
                }}
                aria-invalid={!!errors.moq}
                required
                className="min-h-[44px]"
              />
              <FormMessage message={errors.moq} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">Notes (optional)</Label>
            <textarea
              id="edit-notes"
              rows={3}
              placeholder="Any notes for this buy round..."
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              maxLength={1000}
              className={cn(
                "w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900",
                "px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100",
                "focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100",
                "resize-none"
              )}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isPending}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending} className="min-h-[44px]">
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    </motion.div>
  );
}
