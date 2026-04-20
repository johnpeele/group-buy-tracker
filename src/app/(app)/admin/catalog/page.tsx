import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { tokens } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { AddPeptideForm } from "./add-peptide-form";
import { CatalogList } from "./catalog-list";

export const revalidate = 10;

export default async function AdminCatalogPage() {
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

  // Fetch all peptides with variants
  const { data: peptides } = await supabase
    .from("peptides")
    .select(`
      id, name, description, created_at,
      peptide_variants ( id, weight_label, sku, created_at )
    `)
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <h1 className={tokens.type.pageTitle}>Peptide Catalog</h1>

      {/* Add peptide */}
      <section aria-labelledby="add-peptide-heading">
        <h2 id="add-peptide-heading" className={cn(tokens.type.sectionLabel, "mb-3")}>
          Add Peptide
        </h2>
        <AddPeptideForm />
      </section>

      {/* Peptide list */}
      <section aria-labelledby="catalog-heading">
        <h2 id="catalog-heading" className={cn(tokens.type.sectionLabel, "mb-3")}>
          All Peptides
        </h2>
        <CatalogList peptides={peptides ?? []} />
      </section>
    </div>
  );
}
