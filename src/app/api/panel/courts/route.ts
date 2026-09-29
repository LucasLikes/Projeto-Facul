import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { getPanelContext } from "@/lib/panel-context";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create_court"), nome: z.string().trim().min(1).max(80), esporte: z.enum(["futebol_society", "volei", "futevolei", "beach_tennis"]), tipo: z.enum(["interna", "externa"]), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80) }),
  z.object({ action: z.literal("create_device"), court_id: z.string().uuid() }),
  z.object({ action: z.literal("rotate_device"), court_id: z.string().uuid() }),
]);

function createDeviceToken() {
  return randomBytes(32).toString("base64url");
}

export async function POST(request: Request) {
  const context = await getPanelContext();
  if (!context) return apiError(401, "unauthorized", "Entre no painel para continuar.");
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError(400, "invalid_request", "Dados da quadra ou dispositivo inválidos.");
  const payload = body.data;

  if (payload.action === "create_court") {
    const { data, error } = await context.admin.from("courts").insert({
      arena_id: context.arena.id,
      nome: payload.nome,
      esporte: payload.esporte,
      tipo: payload.tipo,
      slug: payload.slug,
      ativa: true,
    }).select("id,nome,slug").single();
    if (error) return apiError(error.code === "23505" ? 409 : 503, "court_create_failed", "Este nome ou endereço de quadra já está em uso.");
    return NextResponse.json({ id: data.id, nome: data.nome, slug: data.slug }, { status: 201 });
  }

  const court = context.courts.find((item) => item.id === payload.court_id);
  if (!court) return apiError(404, "not_found", "Quadra não encontrada nesta arena.");
  const token = createDeviceToken();
  const token_hash = createHash("sha256").update(token).digest("hex");
  if (payload.action === "create_device") {
    const { data, error } = await context.admin.from("devices").insert({ court_id: court.id, token_hash, status: "offline" }).select("id").single();
    if (error) return apiError(error.code === "23505" ? 409 : 503, "device_create_failed", "Já existe um dispositivo nesta quadra ou não foi possível criá-lo.");
    return NextResponse.json({ id: data.id, token, shown_once: true }, { status: 201 });
  }

  const { data, error } = await context.admin.from("devices").update({ token_hash, status: "offline", ultimo_ping: null })
    .eq("court_id", court.id).select("id").maybeSingle();
  if (error) return apiError(503, "device_rotate_failed", "Não foi possível rotacionar o token.");
  if (!data) return apiError(404, "not_found", "Esta quadra ainda não tem dispositivo cadastrado.");
  return NextResponse.json({ id: data.id, token, shown_once: true });
}