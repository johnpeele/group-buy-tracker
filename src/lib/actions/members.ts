"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/lib/supabase/database.types";

type ActionResult = { success: boolean; error?: string };

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { supabase, user, isAdmin: profile?.role === "admin" };
}

export async function updateMember(
  memberId: string,
  fields: { display_name: string; email: string }
): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) return { success: false, error: "Admin access required." };
  if (!fields.display_name.trim()) return { success: false, error: "Name is required." };
  if (fields.display_name.trim().length > 80) return { success: false, error: "Name must be 80 characters or fewer." };
  if (!fields.email.trim()) return { success: false, error: "Email is required." };
  if (!fields.email.includes("@")) return { success: false, error: "Invalid email address." };
  if (fields.email.trim().length > 254) return { success: false, error: "Email must be 254 characters or fewer." };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: fields.display_name.trim(), email: fields.email.trim() })
    .eq("id", memberId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/members");
  return { success: true };
}

export async function setMemberRole(
  memberId: string,
  role: UserRole
): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) return { success: false, error: "Admin access required." };
  if (memberId === user.id) return { success: false, error: "You cannot change your own role." };

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", memberId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/members");
  return { success: true };
}

export async function deleteMember(memberId: string): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) return { success: false, error: "Admin access required." };
  if (memberId === user.id) return { success: false, error: "You cannot delete yourself." };

  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", memberId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/members");
  return { success: true };
}
