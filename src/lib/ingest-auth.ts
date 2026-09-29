import { createHash } from "node:crypto";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { getEnv } from "@/lib/env";
import { getAdminSupabase } from "@/lib/supabase/admin";

const tokenSchema = z.string().regex(/^[A-Za-z0-9._~-]{32,256}$/);

export async function authorizeDevice(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = tokenSchema.safeParse(authorization.match(/^Bearer\s+(.+)$/i)?.[1] ?? "");
  if (!token.success) {
    return { ok: false as const, response: apiError(401, "unauthorized", "Token de dispositivo inválido.") };
  }

  const admin = getAdminSupabase();
  if (!admin) {
    return { ok: false as const, response: apiError(503, "service_unavailable", "Ingestão indisponível.") };
  }

  const tokenHash = createHash("sha256").update(token.data).digest("hex");
  const { data: device, error } = await admin
    .from("devices")
    .select("id, court_id, status")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !device || device.status === "revogado") {
    return { ok: false as const, response: apiError(401, "unauthorized", "Token de dispositivo inválido.") };
  }

  const limit = Number(getEnv("INGEST_RATE_LIMIT_PER_MINUTE") ?? 30);
  const { data: allowed, error: rateError } = await admin.rpc("consume_device_rate_limit", {
    p_device_id: device.id,
    p_limit: Number.isInteger(limit) && limit > 0 ? limit : 30,
    p_window_seconds: 60,
  });

  if (rateError) {
    return { ok: false as const, response: apiError(503, "rate_limit_unavailable", "Não foi possível validar o limite de requisições.") };
  }
  if (allowed !== true) {
    return { ok: false as const, response: apiError(429, "rate_limited", "Limite de requisições excedido.") };
  }

  return { ok: true as const, admin, device };
}