import type { SupabaseClient } from "@supabase/supabase-js";
import type { Arena, Court } from "@/lib/domain";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";

export type PanelContext = {
  admin: SupabaseClient;
  user: { id: string; email: string | undefined };
  arena: Arena;
  role: "owner" | "staff";
  courts: Court[];
};

export async function getPanelContext(): Promise<PanelContext | null> {
  const supabase = await getServerSupabase();
  const admin = getAdminSupabase();
  if (!supabase || !admin) return null;
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return null;

  const { data: membership, error: membershipError } = await admin.from("users_arena")
    .select("arena_id,papel").eq("id", auth.user.id).order("arena_id").limit(1).maybeSingle();
  if (membershipError || !membership) return null;
  const { data: arenaRow, error: arenaError } = await admin.from("arenas")
    .select("id,nome,slug,cidade,telefone_whatsapp,logo_url,cor_primaria,retention_days,publicidade_ativa,publicidade_titulo,publicidade_texto,publicidade_imagem_url,publicidade_whatsapp")
    .eq("id", membership.arena_id).maybeSingle();
  if (arenaError || !arenaRow) return null;
  const { data: courtRows } = await admin.from("courts")
    .select("id,arena_id,nome,esporte,tipo,slug,ativa").eq("arena_id", arenaRow.id).order("nome");

  return {
    admin,
    user: { id: auth.user.id, email: auth.user.email },
    arena: { ...arenaRow, retention_days: arenaRow.retention_days ?? 30 },
    role: membership.papel as "owner" | "staff",
    courts: (courtRows ?? []) as Court[],
  };
}