"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tokens } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Check, X } from "lucide-react";
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
import { buttonVariants } from "@/components/ui/button";

interface Variant {
  id: string;
  weight_label: string;
  sku: string | null;
  created_at: string;
}

interface Peptide {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  peptide_variants: Variant[] | Variant | null;
}

// ─── Variant row ─────────────────────────────────────────────────────────────

function VariantRow({ variant, peptideId }: { variant: Variant; peptideId: string }) {
  const [editing, setEditing] = useState(false);
  const [weightLabel, setWeightLabel] = useState(variant.weight_label);
  const [sku, setSku] = useState(variant.sku ?? "");
  const [isSaving, startSave] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function handleSave() {
    if (!weightLabel.trim()) return;
    startSave(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("peptide_variants")
        .update({
          weight_label: weightLabel.trim(),
          sku: sku.trim() || null,
        })
        .eq("id", variant.id);

      if (error) {
        toast.error("Failed to update variant.");
        return;
      }
      toast.success("Variant updated.");
      setEditing(false);
      router.refresh();
    });
  }

  function handleCancel() {
    setWeightLabel(variant.weight_label);
    setSku(variant.sku ?? "");
    setEditing(false);
  }

  function handleDelete() {
    startDelete(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("peptide_variants")
        .delete()
        .eq("id", variant.id);

      if (error) {
        if (error.code === "23503") {
          toast.error("Can't delete — this variant has buy rounds attached to it.");
        } else {
          toast.error("Failed to delete variant.");
        }
        return;
      }
      toast.success(`${variant.weight_label} deleted.`);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <li className="flex items-center gap-2 py-1.5">
        <Input
          ref={inputRef}
          type="text"
          value={weightLabel}
          onChange={(e) => setWeightLabel(e.target.value)}
          placeholder="e.g. 40mg"
          className="min-h-[32px] h-8 text-xs flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
        />
        <Input
          type="text"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="SKU (optional)"
          className="min-h-[32px] h-8 text-xs w-28"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
        />
        <button
          onClick={handleSave}
          disabled={isSaving || !weightLabel.trim()}
          className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 disabled:opacity-40 transition-colors"
          aria-label="Save variant"
        >
          <Check size={14} />
        </button>
        <button
          onClick={handleCancel}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          aria-label="Cancel editing"
        >
          <X size={14} />
        </button>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between py-1.5 group/variant">
      <div className="flex items-center gap-2">
        <span className="text-sm">{variant.weight_label}</span>
        {variant.sku && (
          <span className={cn(tokens.type.mono, "text-xs text-zinc-400")}>
            {variant.sku}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover/variant:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          aria-label={`Edit ${variant.weight_label}`}
        >
          <Pencil size={12} />
        </button>
        <AlertDialog>
          <AlertDialogTrigger
            className="p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            aria-label={`Delete ${variant.weight_label}`}
            disabled={isDeleting}
          >
            <Trash2 size={12} />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {variant.weight_label}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this variant. This cannot be undone.
                If any buy rounds reference this variant, the delete will be blocked.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className={cn(buttonVariants({ variant: "destructive" }))}
                onClick={handleDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}

// ─── Add variant form ─────────────────────────────────────────────────────────

function AddVariantForm({
  peptideId,
  onAdded,
  onCancel,
}: {
  peptideId: string;
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [weightLabel, setWeightLabel] = useState("");
  const [sku, setSku] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!weightLabel.trim()) return;

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.from("peptide_variants").insert({
        peptide_id: peptideId,
        weight_label: weightLabel.trim(),
        sku: sku.trim() || null,
      });

      if (error) {
        toast.error("Failed to add variant.");
        return;
      }
      toast.success(`${weightLabel.trim()} added.`);
      onAdded();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center py-1">
      <Input
        ref={inputRef}
        type="text"
        placeholder="e.g. 40mg"
        value={weightLabel}
        onChange={(e) => setWeightLabel(e.target.value)}
        required
        className="min-h-[32px] h-8 text-xs flex-1"
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
      />
      <Input
        type="text"
        placeholder="SKU (optional)"
        value={sku}
        onChange={(e) => setSku(e.target.value)}
        className="min-h-[32px] h-8 text-xs w-28"
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
      />
      <button
        type="submit"
        disabled={isPending || !weightLabel.trim()}
        className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 disabled:opacity-40 transition-colors"
        aria-label="Save variant"
      >
        <Check size={14} />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
        aria-label="Cancel"
      >
        <X size={14} />
      </button>
    </form>
  );
}

// ─── Peptide row ──────────────────────────────────────────────────────────────

function PeptideRow({ peptide }: { peptide: Peptide }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(peptide.name);
  const [description, setDescription] = useState(peptide.description ?? "");
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [isSaving, startSave] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const router = useRouter();
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) nameInputRef.current?.focus();
  }, [editing]);

  const variants = Array.isArray(peptide.peptide_variants)
    ? peptide.peptide_variants
    : peptide.peptide_variants
    ? [peptide.peptide_variants]
    : [];

  function handleSave() {
    if (!name.trim()) return;
    startSave(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("peptides")
        .update({
          name: name.trim(),
          description: description.trim() || null,
        })
        .eq("id", peptide.id);

      if (error) {
        toast.error(
          error.message.includes("unique")
            ? "A peptide with that name already exists."
            : "Failed to update peptide."
        );
        return;
      }
      toast.success("Peptide updated.");
      setEditing(false);
      router.refresh();
    });
  }

  function handleCancel() {
    setName(peptide.name);
    setDescription(peptide.description ?? "");
    setEditing(false);
  }

  function handleDelete() {
    startDelete(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("peptides")
        .delete()
        .eq("id", peptide.id);

      if (error) {
        if (error.code === "23503") {
          toast.error("Can't delete — this peptide has variants with buy rounds attached.");
        } else {
          toast.error("Failed to delete peptide.");
        }
        return;
      }
      toast.success(`${peptide.name} deleted.`);
      router.refresh();
    });
  }

  return (
    <li className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      {/* Peptide header */}
      {editing ? (
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Peptide name"
              className="min-h-[36px] h-9 text-sm font-medium flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
            />
            <button
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 disabled:opacity-40 transition-colors p-1"
              aria-label="Save peptide"
            >
              <Check size={16} />
            </button>
            <button
              onClick={handleCancel}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1"
              aria-label="Cancel editing"
            >
              <X size={16} />
            </button>
          </div>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="min-h-[36px] h-9 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 group/peptide">
          <button
            className="flex-1 flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            <div>
              <p className="text-sm font-medium">{peptide.name}</p>
              {peptide.description && (
                <p className={tokens.type.muted}>{peptide.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={tokens.type.muted}>
                {variants.length} variant{variants.length !== 1 ? "s" : ""}
              </span>
              {expanded ? (
                <ChevronDown size={14} className="text-zinc-400" aria-hidden="true" />
              ) : (
                <ChevronRight size={14} className="text-zinc-400" aria-hidden="true" />
              )}
            </div>
          </button>

          {/* Edit / delete icons — visible on hover */}
          <div className="flex items-center gap-1 pr-3 opacity-0 group-hover/peptide:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(true);
                setEditing(true);
              }}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              aria-label={`Edit ${peptide.name}`}
            >
              <Pencil size={13} />
            </button>
            <AlertDialog>
              <AlertDialogTrigger
                className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                aria-label={`Delete ${peptide.name}`}
                disabled={isDeleting}
              >
                <Trash2 size={13} />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {peptide.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this peptide and all its variants.
                    This cannot be undone. If any buy rounds reference a variant,
                    the delete will be blocked.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className={cn(buttonVariants({ variant: "destructive" }))}
                    onClick={handleDelete}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Variants section */}
      {expanded && !editing && (
        <div className="px-4 pb-3">
          {variants.length > 0 ? (
            <ul className="divide-y divide-zinc-50 dark:divide-zinc-900" role="list">
              {variants.map((v) => (
                <VariantRow key={v.id} variant={v} peptideId={peptide.id} />
              ))}
            </ul>
          ) : (
            <p className={cn(tokens.type.muted, "py-1.5")}>No variants yet.</p>
          )}

          {showAddVariant ? (
            <AddVariantForm
              peptideId={peptide.id}
              onAdded={() => {
                setShowAddVariant(false);
                router.refresh();
              }}
              onCancel={() => setShowAddVariant(false)}
            />
          ) : (
            <button
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors py-1.5 mt-1"
              onClick={() => setShowAddVariant(true)}
            >
              <Plus size={12} aria-hidden="true" />
              Add variant
            </button>
          )}
        </div>
      )}
    </li>
  );
}

// ─── Catalog list (root export) ───────────────────────────────────────────────

interface CatalogListProps {
  peptides: Peptide[];
}

export function CatalogList({ peptides }: CatalogListProps) {
  if (peptides.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-8 text-center">
          <p className={tokens.type.muted}>No peptides yet. Add the first one above.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <ul role="list">
        {peptides.map((peptide) => (
          <PeptideRow key={peptide.id} peptide={peptide} />
        ))}
      </ul>
    </Card>
  );
}
