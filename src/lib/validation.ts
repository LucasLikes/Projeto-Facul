import { z } from "zod";

const isoDateTime = z.string().datetime({ offset: true });
export const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}, "Informe uma data válida.");
export const clockTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);

export const ingestPresignSchema = z.object({
  capturado_em: isoDateTime,
  duracao_s: z.number().int().min(1).max(120),
  tamanho_bytes: z.number().int().positive().max(500_000_000),
  video_content_type: z.enum(["video/mp4", "video/quicktime"]).default("video/mp4"),
  thumb_content_type: z.enum(["image/jpeg", "image/webp", "image/png"]).default("image/jpeg"),
});

export const ingestConfirmSchema = z.object({ replay_id: z.string().uuid() });

export const bookingSchema = z.object({
  court_id: z.string().uuid(),
  data: localDateSchema,
  hora_inicio: clockTimeSchema,
  hora_fim: clockTimeSchema,
  nome_cliente: z.string().trim().min(2).max(100),
  whatsapp: z.string().trim().min(10).max(20).regex(/^[+\d\s()-]+$/),
}).refine((value) => value.hora_inicio < value.hora_fim, {
  path: ["hora_fim"],
  message: "O horário final deve ser posterior ao inicial.",
});

export const reportSchema = z.object({ motivo: z.string().trim().min(5).max(500) });
export const signInSchema = z.object({ email: z.string().trim().email().max(254) });