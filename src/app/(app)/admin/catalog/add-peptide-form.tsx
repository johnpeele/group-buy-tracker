"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function AddPeptideForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated.");
        return;
      }

      const { error } = await supabase.from("peptides").insert({
        name: name.trim(),
        description: description.trim() || null,
        created_by: user.id,
      });

      if (error) {
        toast.error(error.message.includes("unique") ? "A peptide with that name already exists." : "Failed to add peptide.");
        return;
      }

      toast.success(`${name.trim()} added to catalog.`);
      setName("");
      setDescription("");
      router.refresh();
    });
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-5 pb-5">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="peptide-name" className="sr-only">Peptide name</Label>
              <Input
                id="peptide-name"
                type="text"
                placeholder="e.g. MOTS-C"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="min-h-[44px]"
                aria-label="Peptide name"
              />
            </div>
            <Button
              type="submit"
              disabled={isPending || !name.trim()}
              className="min-h-[44px] shrink-0"
            >
              {isPending ? "Adding..." : "Add peptide"}
            </Button>
          </div>
          <div>
            <Label htmlFor="peptide-desc" className="sr-only">Description (optional)</Label>
            <Input
              id="peptide-desc"
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[44px]"
              aria-label="Peptide description"
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
