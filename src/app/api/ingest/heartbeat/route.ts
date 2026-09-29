import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { authorizeDevice } from "@/lib/ingest-auth";
import { z } from "zod";

const heartbeatSchema = z.object({}).strict();

export async function POST(request: Request) {
  const authorization = await authorizeDevice(request);
  if (!authorization.ok) return authorization.response;

  const body = await request.json().catch(() => null);
  if (!heartbeatSchema.safeParse(body).success) return apiError(400, "invalid_request", "O corpo do heartbeat deve ser um objeto vazio.");

  const ultimo_ping = new Date().toISOString();
  const { error } = await authorization.admin
    .from("devices")
    .update({ ultimo_ping, status: "online" })
    .eq("id", authorization.device.id);
  if (error) return apiError(503, "database_unavailable", "Não foi possível registrar o heartbeat.");
  return NextResponse.json({ ultimo_ping });
}