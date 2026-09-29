import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { getPanelContext } from "@/lib/panel-context";

const settingsSchema = z.object({
  telefone_whatsapp: z.string().trim().max(20).regex(/^[+\d\s()-]*$/),
  logo_url: z.union([z.string().url().max(2048), z.literal("")]),
  cor_primaria: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  retention_days: z.number().int().min(1).max(365),
});

export async function PATCH(request: Request) {
  const context = await getPanelContext();
  if (!context) return apiError(401, "unauthorized", "Entre no painel para continuar.");
  if (context.role !== "owner") return apiError(403, "forbidden", "Somente o proprietário pode alterar configurações.");
  const body = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError(400, "invalid_request", "Confira os campos das configurações.");
  const { error } = await context.admin.from("arenas").update({
    telefone_whatsapp: body.data.telefone_whatsapp,
    logo_url: body.data.logo_url || null,
    cor_primaria: body.data.cor_primaria,
    retention_days: body.data.retention_days,
  }).eq("id", context.arena.id);
  if (error) return apiError(503, "settings_update_failed", "Não foi possível salvar as configurações.");
  return NextResponse.json({ salvo: true });
}