import { supabase } from "@/integrations/supabase/client";

export interface DeveloperContact {
  id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
}

export const devKey = (name: string | null | undefined) =>
  (name ?? "").trim().toLowerCase();

export async function listDevelopers(): Promise<DeveloperContact[]> {
  const { data } = await supabase.from("developers").select("*").order("name");
  return (data ?? []) as DeveloperContact[];
}

/** Save (or refresh) a developer's contact details keyed by developer name. */
export async function rememberDeveloper(input: {
  name: string;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
}) {
  const name = input.name?.trim();
  if (!name) return;
  const { data: existing } = await supabase
    .from("developers")
    .select("id, contact_name, contact_phone, contact_email")
    .ilike("name", name)
    .maybeSingle();

  const merged = {
    contact_name: input.contact_name?.trim() || existing?.contact_name || null,
    contact_phone: input.contact_phone?.trim() || existing?.contact_phone || null,
    contact_email: input.contact_email?.trim() || existing?.contact_email || null,
  };

  if (existing) {
    await supabase.from("developers").update(merged).eq("id", existing.id);
  } else {
    await supabase.from("developers").insert({ name, ...merged });
  }
}
