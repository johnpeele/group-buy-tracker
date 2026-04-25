"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { BuyRoundStatus } from "@/lib/supabase/database.types";

type ActionResult = { success: boolean; error?: string };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { supabase, user, isAdmin: profile?.role === "admin" };
}

/**
 * Create a new buy round. Admin only.
 */
export async function createBuyRound(formData: FormData): Promise<ActionResult & { id?: string }> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) return { success: false, error: "Admin access required." };

  const variant_id = formData.get("variant_id") as string;
  const price_per_kit = parseFloat(formData.get("price_per_kit") as string);
  const moq = parseInt(formData.get("moq") as string, 10) || 100;
  const notes = ((formData.get("notes") as string) || "").trim() || null;

  if (!variant_id || isNaN(price_per_kit) || price_per_kit <= 0) {
    return { success: false, error: "Invalid buy round data." };
  }
  if (notes && notes.length > 1000) {
    return { success: false, error: "Notes must be 1000 characters or fewer." };
  }

  const { data, error } = await supabase
    .from("buy_rounds")
    .insert({
      variant_id,
      price_per_kit,
      moq,
      notes,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true, id: data.id };
}

/**
 * Update editable fields on a buy round. Admin only.
 * Allowed for any non-terminal status (not shipped/cancelled).
 */
export async function updateBuyRound(
  buy_round_id: string,
  fields: { price_per_kit: number; moq: number; notes: string | null }
): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) return { success: false, error: "Admin access required." };

  if (fields.price_per_kit <= 0) return { success: false, error: "Price must be greater than 0." };
  if (!Number.isInteger(fields.moq) || fields.moq < 1) return { success: false, error: "MOQ must be at least 1." };
  if (fields.notes && fields.notes.trim().length > 1000) return { success: false, error: "Notes must be 1000 characters or fewer." };

  const { data: round } = await supabase
    .from("buy_rounds")
    .select("status")
    .eq("id", buy_round_id)
    .single();

  if (!round) return { success: false, error: "Buy round not found." };
  if (round.status === "shipped" || round.status === "cancelled") {
    return { success: false, error: "Cannot edit a completed buy round." };
  }

  const { error } = await supabase
    .from("buy_rounds")
    .update({ price_per_kit: fields.price_per_kit, moq: fields.moq, notes: fields.notes })
    .eq("id", buy_round_id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/buy/${buy_round_id}`);
  revalidatePath("/admin");
  revalidatePath("/admin/open-buys");
  revalidatePath("/");
  return { success: true };
}

/**
 * Lock a buy round. Validates MOQ is met before transitioning.
 */
export async function lockBuyRound(buy_round_id: string): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) return { success: false, error: "Admin access required." };

  // Get current totals
  const { data: progress } = await supabase
    .rpc("get_moq_progress", { p_buy_round_id: buy_round_id })
    .single();

  if (!progress) return { success: false, error: "Buy round not found." };

  if (progress.status !== "open") {
    return { success: false, error: `Buy round is already ${progress.status}.` };
  }

  // Guard: MOQ must be met
  if (progress.committed_kits < progress.moq) {
    return {
      success: false,
      error: `MOQ not met — ${progress.committed_kits}/${progress.moq} kits committed.`,
    };
  }

  const { error } = await supabase
    .from("buy_rounds")
    .update({ status: "locked", locked_at: new Date().toISOString() })
    .eq("id", buy_round_id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/buy/${buy_round_id}`);
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

/**
 * Transition buy round status. Admin only.
 * Allowed transitions: locked→submitted, submitted→shipped, any→cancelled
 */
export async function updateBuyRoundStatus(
  buy_round_id: string,
  new_status: Extract<BuyRoundStatus, "submitted" | "shipped" | "cancelled">
): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) return { success: false, error: "Admin access required." };

  const { data: round } = await supabase
    .from("buy_rounds")
    .select("status")
    .eq("id", buy_round_id)
    .single();

  if (!round) return { success: false, error: "Buy round not found." };

  // Validate transitions
  const valid: Record<string, BuyRoundStatus[]> = {
    submitted: ["locked"],
    shipped: ["submitted"],
    cancelled: ["open", "locked", "submitted"],
  };

  if (!valid[new_status]?.includes(round.status)) {
    return {
      success: false,
      error: `Cannot transition from ${round.status} to ${new_status}.`,
    };
  }

  const timestampField: Record<string, string> = {
    submitted: "submitted_at",
    shipped: "shipped_at",
  };

  type BuyRoundUpdate = {
    status: BuyRoundStatus;
    locked_at?: string;
    submitted_at?: string;
    shipped_at?: string;
  };
  const now = new Date().toISOString();
  const updates: BuyRoundUpdate = { status: new_status };
  if (new_status === "submitted") updates.submitted_at = now;
  if (new_status === "shipped") updates.shipped_at = now;
  if (new_status === "cancelled") {
    // no extra timestamp for cancellation
  }

  const { error } = await supabase
    .from("buy_rounds")
    .update(updates)
    .eq("id", buy_round_id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/buy/${buy_round_id}`);
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}
