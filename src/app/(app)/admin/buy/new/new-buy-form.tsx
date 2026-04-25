"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createBuyRound } from "@/lib/actions/buy-rounds";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { tokens } from "@/lib/design-tokens";

interface Variant {
  id: string;
  weight_label: string;
  sku: string | null;
}

interface Peptide {
  id: string;
  name: string;
  peptide_variants: Variant[] | Variant | null;
}

interface NewBuyFormProps {
  peptides: Peptide[];
}

export function NewBuyForm({ peptides }: NewBuyFormProps) {
  const [selectedPeptideId, setSelectedPeptideId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [pricePerKit, setPricePerKit] = useState("");
  const [moq, setMoq] = useState("100");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const selectedPeptide = peptides.find((p) => p.id === selectedPeptideId);
  const variants = selectedPeptide
    ? Array.isArray(selectedPeptide.peptide_variants)
      ? selectedPeptide.peptide_variants
      : selectedPeptide.peptide_variants
      ? [selectedPeptide.peptide_variants]
      : []
    : [];

  // Reset variant when peptide changes
  function handlePeptideChange(id: string) {
    setSelectedPeptideId(id);
    setSelectedVariantId("");
  }

  const isValid =
    selectedVariantId &&
    pricePerKit &&
    parseFloat(pricePerKit) > 0 &&
    parseInt(moq) >= 1;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    const formData = new FormData();
    formData.set("variant_id", selectedVariantId);
    formData.set("price_per_kit", pricePerKit);
    formData.set("moq", moq);
    formData.set("notes", notes.trim());

    startTransition(async () => {
      const result = await createBuyRound(formData);
      if (!result.success) {
        toast.error(result.error ?? "Failed to create buy round.");
        return;
      }
      toast.success("Buy round opened!");
      router.push(result.id ? `/admin/buy/${result.id}` : "/admin");
      router.refresh();
    });
  }

  if (peptides.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-8 text-center space-y-2">
          <p className="text-sm font-medium">No peptides in catalog</p>
          <p className={tokens.type.muted}>
            Add peptides and variants in the{" "}
            <a
              href="/admin/catalog"
              className="underline hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              catalog
            </a>{" "}
            first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Peptide selector */}
          <div className="space-y-1.5">
            <Label htmlFor="peptide">Peptide</Label>
            <select
              id="peptide"
              value={selectedPeptideId}
              onChange={(e) => handlePeptideChange(e.target.value)}
              required
              className={cn(
                "w-full min-h-[44px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900",
                "px-3 text-sm text-zinc-900 dark:text-zinc-100",
                "focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              )}
            >
              <option value="">Select a peptide...</option>
              {peptides.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Variant selector */}
          <div className="space-y-1.5">
            <Label htmlFor="variant">Variant</Label>
            <select
              id="variant"
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              required
              disabled={!selectedPeptideId || variants.length === 0}
              className={cn(
                "w-full min-h-[44px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900",
                "px-3 text-sm text-zinc-900 dark:text-zinc-100",
                "focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100",
                "disabled:opacity-50"
              )}
            >
              <option value="">
                {!selectedPeptideId
                  ? "Select a peptide first..."
                  : variants.length === 0
                  ? "No variants available"
                  : "Select a variant..."}
              </option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.weight_label}
                  {v.sku ? ` (${v.sku})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Price per kit (admin-only) */}
          <div className="space-y-1.5">
            <Label htmlFor="price">Price per kit ($)</Label>
            <Input
              id="price"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={pricePerKit}
              onChange={(e) => setPricePerKit(e.target.value)}
              required
              className="min-h-[44px]"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Supplier price — visible only to admins and in member payment summaries.
            </p>
          </div>

          {/* MOQ */}
          <div className="space-y-1.5">
            <Label htmlFor="moq">Minimum order quantity (kits)</Label>
            <Input
              id="moq"
              type="number"
              min="1"
              step="1"
              placeholder="100"
              value={moq}
              onChange={(e) => setMoq(e.target.value)}
              required
              className="min-h-[44px]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Any notes for this buy round..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              className={cn(
                "w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900",
                "px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100",
                "focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100",
                "resize-none"
              )}
            />
          </div>

          <Button
            type="submit"
            disabled={isPending || !isValid}
            className="w-full min-h-[44px]"
          >
            {isPending ? "Opening buy..." : "Open buy round"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
