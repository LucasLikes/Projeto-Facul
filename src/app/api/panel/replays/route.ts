import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { getPanelContext } from "@/lib/panel-context";
import { getR2Bucket, getR2Client } from "@/lib/r2";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["hide", "show"]), replay_id: z.string().uuid() }),
  z.object({ action: z.literal("delete"), replay_id: z.string().uuid() }),
  z.object({ action: z.literal("resolve_report"), report_id: z.string().uuid() }),
]);

export async function PATCH(request: Request) {
  const context = await getPanelContext();
  if (!context) return apiError(401, "unauthorized", "Entre no painel para continuar.");
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError(400, "invalid_request", "Ação inválida.");
  const courtIds = context.courts.map((court) => court.id);
  if (!courtIds.length) return apiError(404, "not_found", "A arena não possui quadras.");

  if (body.data.action === "resolve_report") {
    const { data: report, error } = await context.admin.from("reports").select("id,replay_id").eq("id", body.data.report_id).maybeSingle();
    if (error || !report) return apiError(404, "not_found", "Denúncia não encontrada.");
    const { data: replay } = await context.admin.from("replays").select("id,court_id").eq("id", report.replay_id).in("court_id", courtIds).maybeSingle();
    if (!replay) return apiError(404, "not_found", "Denúncia não encontrada nesta arena.");
    const { error: updateError } = await context.admin.from("reports").update({ resolvido_em: new Date().toISOString() }).eq("id", report.id);
    if (updateError) return apiError(503, "database_unavailable", "Não foi possível concluir a denúncia.");
    return NextResponse.json({ resolvido: true });
  }

  const { data: replay, error: lookupError } = await context.admin.from("replays")
    .select("id,court_id,video_key,thumb_key").eq("id", body.data.replay_id).in("court_id", courtIds).maybeSingle();
  if (lookupError) return apiError(503, "database_unavailable", "Não foi possível consultar o replay.");
  if (!replay) return apiError(404, "not_found", "Replay não encontrado nesta arena.");

  if (body.data.action === "delete") {
    const s3 = getR2Client();
    const bucket = getR2Bucket();
    const demoReplay = replay.video_key.startsWith("demo/");
    if (!demoReplay && (!s3 || !bucket)) return apiError(503, "storage_unavailable", "Configure o R2 antes de apagar o replay.");
    if (!demoReplay && s3 && bucket) {
      try {
        await Promise.all([
          s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: replay.video_key })),
          s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: replay.thumb_key })),
        ]);
      } catch {
        return apiError(503, "storage_unavailable", "Não foi possível remover os arquivos do R2.");
      }
    }
    const { error } = await context.admin.from("replays").delete().eq("id", replay.id).in("court_id", courtIds);
    if (error) return apiError(503, "database_unavailable", "Os arquivos foram removidos, mas o registro não pôde ser apagado.");
    return NextResponse.json({ apagado: true });
  }

  const { error } = await context.admin.from("replays").update({ visivel: body.data.action === "show" }).eq("id", replay.id).in("court_id", courtIds);
  if (error) return apiError(503, "database_unavailable", "Não foi possível atualizar a visibilidade do replay.");
  return NextResponse.json({ visivel: body.data.action === "show" });
}