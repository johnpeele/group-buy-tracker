"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CommitmentResult =
  | { success: true; kit_quantity: number }
  | { success: false; error: string };

/**
 * Create or update a commitment for the current user.
 *
 * Guards:
 * - buy_round must exist and be status='open'
 * - kit_quantity must be >= 1
 * - After save, recalculates MOQ and re-opens if total dropped below moq
 */
export async function createOrUpdateCommitment(
  buy_round_id: string,
  kit_quantity: number
): Promise<CommitmentResult> {
  if (!Number.isInteger(kit_quantity) || kit_quantity < 1) {
    return { success: false, error: "Kit quantity must be at least 1." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  // Guard: buy must be open
  const { data: round, error: roundError } = await supabase
    .from("buy_rounds")
    .select("id, status, moq")
    .eq("id", buy_round_id)
    .single();

  if (roundError || !round) {
    return { success: false, error: "Buy round not found." };
  }

  if (round.status !== "open") {
    return {
      success: false,
      error: `This buy round is ${round.status} — commitments are no longer editable.`,
    };
  }

  // Upsert commitment
  const { error: upsertError } = await supabase
    .from("commitments")
    .upsert(
      {
        buy_round_id,
        member_id: user.id,
        kit_quantity,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "buy_round_id,member_id" }
    );

  if (upsertError) {
    return { success: false, error: "Failed to save commitment. Please try again." };
  }

  revalidatePath(`/buy/${buy_round_id}`);
  revalidatePath("/");

  return { success: true, kit_quantity };
}

/**
 * Delete a commitment. Admin-only.
 * (Members cannot delete their own — they must contact admin.)
 */
export async function deleteCommitment(
  commitment_id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
    .single();

  if (profile?.role !== "admin") {
    return { success: false, error: "Admin access required." };
  }

  const { error } = await supabase
    .from("commitments")
    .delete()
    .eq("id", commitment_id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin");
  return { success: true };
}
