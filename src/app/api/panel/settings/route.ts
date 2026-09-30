import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { getPanelContext } from "@/lib/panel-context";

const settingsSchema = z.object({
  telefone_whatsapp: z.string().trim().max(20).regex(/^[+\d\s()-]*$/),
  logo_url: z.union([z.string().url().max(2048), z.literal("")]),
  cor_primaria: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  retention_days: z.number().int().min(1).max(365),
  publicidade_ativa: z.boolean(),
  publicidade_titulo: z.string().trim().max(80),
  publicidade_texto: z.string().trim().max(240),
  publicidade_imagem_url: z.union([z.string().url().max(2048).refine((value) => value.startsWith("https://"), "Use uma imagem HTTPS."), z.literal("")]),
  publicidade_whatsapp: z.string().trim().max(20).regex(/^[+\d\s()-]*$/),
}).refine((value) => !value.publicidade_ativa || (value.publicidade_titulo.length >= 3 && value.publicidade_texto.length >= 10), {
  path: ["publicidade_titulo"],
  message: "Para ativar, informe um título e uma descrição para o destaque.",
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
    publicidade_ativa: body.data.publicidade_ativa,
    publicidade_titulo: body.data.publicidade_titulo || null,
    publicidade_texto: body.data.publicidade_texto || null,
    publicidade_imagem_url: body.data.publicidade_imagem_url || null,
    publicidade_whatsapp: body.data.publicidade_whatsapp,
  }).eq("id", context.arena.id);
  if (error) return apiError(503, "settings_update_failed", "Não foi possível salvar as configurações.");
  return NextResponse.json({ salvo: true });
}