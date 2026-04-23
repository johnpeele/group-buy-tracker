import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { tokens } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NewBuyForm } from "./new-buy-form";

export default async function NewBuyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  // Fetch peptides with their variants
  const { data: peptides } = await supabase
    .from("peptides")
    .select(`
      id, name,
      peptide_variants ( id, weight_label, sku )
    `)
    .order("name", { ascending: true });

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <Link
          href="/admin/open-buys"
          className={cn(
            tokens.type.muted,
            "inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors mb-2"
          )}
        >
          <ChevronLeft size={14} aria-hidden="true" />
          Open Buys
        </Link>
        <h1 className={tokens.type.pageTitle}>New Buy Round</h1>
      </div>

      <NewBuyForm peptides={peptides ?? []} />
    </div>
  );
}
