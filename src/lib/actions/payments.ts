"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionResult = { success: boolean; error?: string };

/**
 * Mark a member's payment as received. Admin only.
 */
export async function markPaymentReceived(
  commitment_id: string,
  amount_paid: number,
  notes?: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { success: false, error: "Admin access required." };

  if (!amount_paid || amount_paid <= 0) {
    return { success: false, error: "Invalid payment amount." };
  }
  if (amount_paid > 100_000) {
    return { success: false, error: "Payment amount cannot exceed $100,000." };
  }
  if (notes && notes.trim().length > 1000) {
    return { success: false, error: "Notes must be 1000 characters or fewer." };
  }

  // Verify commitment exists
  const { data: commitment } = await supabase
    .from("commitments")
    .select("id, buy_round_id")
    .eq("id", commitment_id)
    .single();

  if (!commitment) return { success: false, error: "Commitment not found." };

  const { error } = await supabase.from("payments").insert({
    commitment_id,
    amount_paid,
    marked_by: user.id,
    notes: notes?.trim() || null,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/buy/${commitment.buy_round_id}`);
  return { success: true };
}

/**
 * Remove a payment record. Admin only.
 * Used to undo a mistaken payment mark.
 */
export async function removePayment(payment_id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { success: false, error: "Admin access required." };

  const { error } = await supabase.from("payments").delete().eq("id", payment_id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin");
  return { success: true };
}
