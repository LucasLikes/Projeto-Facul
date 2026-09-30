import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getRetentionDays } from "@/lib/env";
import { demoArena, demoCourts, getDemoReplays } from "@/lib/demo-data";
import type { Arena, BookingDay, BookingView, Court, CourtDay, CourtSlot, ReplayComment, ReplayView } from "@/lib/domain";
import { getR2Bucket, getR2Client } from "@/lib/r2";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { addLocalDays, formatLocalDate, hourText, isFutureLocalSlot, localDayRange, saoPauloDateString, slotIsCurrent, weekdayForLocalDate } from "@/lib/time";

type ReplayRow = { id: string; capturado_em: string; duracao_s: number; video_key: string; thumb_key: string };
type SlotRow = { id: string; hora_inicio: string; hora_fim: string };

function demoBookings(date: string, courtId: string): BookingView[] {
  if (date !== saoPauloDateString() || courtId !== demoCourts[0].id) return [];
  return [{ id: "40000000-0000-4000-8000-000000000001", court_id: courtId, data: date, hora_inicio: "20:00:00", hora_fim: "21:00:00", status: "confirmada" }];
}

async function signReplayUrls(rows: ReplayRow[], includeVideo: boolean): Promise<ReplayView[]> {
  const s3 = getR2Client();
  const bucket = getR2Bucket();
  return Promise.all(rows.map(async (row) => {
    const demo = row.video_key.startsWith("demo/");
    if (demo) {
      return { id: row.id, capturado_em: row.capturado_em, duracao_s: row.duracao_s, thumb_url: "/thumb-placeholder.svg", video_url: null, demo: true };
    }
    let thumbUrl = "/thumb-placeholder.svg";
    let videoUrl: string | null = null;
    if (s3 && bucket) {
      try {
        thumbUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: row.thumb_key }), { expiresIn: 300 });
        if (includeVideo) videoUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: row.video_key }), { expiresIn: 300 });
      } catch {
        thumbUrl = "/thumb-placeholder.svg";
      }
    }
    return { id: row.id, capturado_em: row.capturado_em, duracao_s: row.duracao_s, thumb_url: thumbUrl, video_url: videoUrl, demo: false };
  }));
}

function groupByHour(replays: ReplayView[]): SlotRow[] {
  return [...new Set(replays.map((replay) => `${new Date(replay.capturado_em).toLocaleString("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", hourCycle: "h23" })}:00`))]
    .sort()
    .map((start) => {
      const hour = Number(start.slice(0, 2));
      return { id: `hour-${start}`, hora_inicio: start, hora_fim: `${String(hour + 1).padStart(2, "0")}:00:00` };
    });
}

function buildCourtSlots(date: string, slotRows: SlotRow[], replayRows: ReplayView[], bookings: BookingView[]): CourtSlot[] {
  return slotRows.map((slot) => {
    const startsAt = `${date}T${hourText(slot.hora_inicio)}:00-03:00`;
    const endsAt = `${date}T${hourText(slot.hora_fim)}:00-03:00`;
    const replays = replayRows.filter((replay) => replay.capturado_em >= new Date(startsAt).toISOString() && replay.capturado_em < new Date(endsAt).toISOString())
      .sort((left, right) => right.capturado_em.localeCompare(left.capturado_em));
    const reserved = bookings.some((booking) => booking.status !== "cancelada"
      && booking.hora_inicio < slot.hora_fim && booking.hora_fim > slot.hora_inicio);
    const current = slotIsCurrent(date, slot.hora_inicio, slot.hora_fim);
    return {
      id: slot.id,
      hora_inicio: slot.hora_inicio,
      hora_fim: slot.hora_fim,
      reservado: reserved,
      status: current ? "agora" : reserved ? "reservado" : "livre",
      replays,
    };
  });
}

export async function getPublicCourtDay(arenaSlug: string, courtSlug: string, date: string): Promise<CourtDay | null> {
  const admin = getAdminSupabase();
  if (!admin) {
    if (arenaSlug !== demoArena.slug) return null;
    const court = demoCourts.find((item) => item.slug === courtSlug);
    if (!court) return null;
    const replays = getDemoReplays(court.id, date);
    const slots = Array.from({ length: 6 }, (_, hour) => ({
      id: `demo-${court.id}-${hour + 17}`,
      hora_inicio: `${String(hour + 17).padStart(2, "0")}:00:00`,
      hora_fim: `${String(hour + 18).padStart(2, "0")}:00:00`,
    }));
    return {
      arena: demoArena,
      court,
      courts: demoCourts,
      date,
      hasConfiguredSlots: true,
      slots: buildCourtSlots(date, slots, replays, demoBookings(date, court.id)),
    };
  }

  const { data: arenaRow, error: arenaError } = await admin.from("arenas")
    .select("id,nome,slug,cidade,telefone_whatsapp,logo_url,cor_primaria,retention_days,publicidade_ativa,publicidade_titulo,publicidade_texto,publicidade_imagem_url,publicidade_whatsapp")
    .eq("slug", arenaSlug).maybeSingle();
  if (arenaError || !arenaRow) return null;
  const { data: courtRows, error: courtError } = await admin.from("courts")
    .select("id,arena_id,nome,esporte,tipo,slug,ativa")
    .eq("arena_id", arenaRow.id).eq("ativa", true).order("nome");
  if (courtError) return null;
  const courtRow = (courtRows ?? []).find((item) => item.slug === courtSlug);
  if (!courtRow) return null;

  const { start, end } = localDayRange(date);
  const [slotResult, bookingResult, replayResult] = await Promise.all([
    admin.from("time_slots").select("id,hora_inicio,hora_fim").eq("court_id", courtRow.id).eq("dia_semana", weekdayForLocalDate(date)).eq("ativo", true).order("hora_inicio"),
    admin.from("bookings").select("id,court_id,data,hora_inicio,hora_fim,status").eq("court_id", courtRow.id).eq("data", date).neq("status", "cancelada"),
    admin.from("replays").select("id,capturado_em,duracao_s,video_key,thumb_key").eq("court_id", courtRow.id).eq("visivel", true).gt("expira_em", new Date().toISOString()).gte("capturado_em", start).lt("capturado_em", end).order("capturado_em", { ascending: false }),
  ]);
  if (slotResult.error || bookingResult.error || replayResult.error) return null;

  const replays = await signReplayUrls((replayResult.data ?? []) as ReplayRow[], false);
  const configured = (slotResult.data ?? []) as SlotRow[];
  const slots = configured.length ? configured : groupByHour(replays);
  const arena: Arena = { ...arenaRow, retention_days: arenaRow.retention_days ?? getRetentionDays() };
  return {
    arena,
    court: courtRow as Court,
    courts: (courtRows ?? []) as Court[],
    date,
    hasConfiguredSlots: configured.length > 0,
    slots: buildCourtSlots(date, slots, replays, (bookingResult.data ?? []) as BookingView[]),
  };
}

export async function getPublicReplay(id: string): Promise<{ replay: ReplayView; arena: Arena; court: Court } | null> {
  const admin = getAdminSupabase();
  if (!admin) {
    const court = demoCourts.find((candidate) => getDemoReplays(candidate.id, saoPauloDateString()).some((item) => item.id === id));
    const replay = court ? getDemoReplays(court.id, saoPauloDateString()).find((item) => item.id === id) : null;
    if (!replay) return null;
    return { replay, arena: demoArena, court: court! };
  }

  const { data: replayRow, error } = await admin.from("replays")
    .select("id,court_id,capturado_em,duracao_s,video_key,thumb_key,expira_em,visivel,courts(id,arena_id,nome,esporte,tipo,slug,ativa,arenas(id,nome,slug,cidade,telefone_whatsapp,logo_url,cor_primaria,retention_days,publicidade_ativa,publicidade_titulo,publicidade_texto,publicidade_imagem_url,publicidade_whatsapp))")
    .eq("id", id).eq("visivel", true).gt("expira_em", new Date().toISOString()).maybeSingle();
  if (error || !replayRow) return null;

  const courtRelation = replayRow.courts as unknown as Court & { arenas: Arena };
  if (!courtRelation?.arenas) return null;
  const [replay] = await signReplayUrls([replayRow as ReplayRow], true);
  return { replay, arena: courtRelation.arenas, court: courtRelation };
}

export async function getPublicReplayComments(replayId: string): Promise<{ comments: ReplayComment[]; enabled: boolean }> {
  const admin = getAdminSupabase();
  if (!admin) {
    const isDemoReplay = demoCourts.some((court) => getDemoReplays(court.id, saoPauloDateString()).some((item) => item.id === replayId));
    return {
      enabled: false,
      comments: isDemoReplay ? [{
        id: "43b913ae-8f24-4588-a596-ff1ddb9a0b6c",
        replay_id: replayId,
        apelido: "Jogador da arena",
        texto: "Que lance! Este espaço pode receber comentários da galera.",
        criado_em: "2026-09-29T20:14:00-03:00",
        demo: true,
      }] : [],
    };
  }

  const { data: replay, error: replayError } = await admin.from("replays").select("id")
    .eq("id", replayId).eq("visivel", true).gt("expira_em", new Date().toISOString()).maybeSingle();
  if (replayError || !replay) return { comments: [], enabled: true };
  const { data, error } = await admin.from("replay_comments")
    .select("id,replay_id,apelido,texto,criado_em")
    .eq("replay_id", replayId).order("criado_em", { ascending: false }).limit(50);
  return { comments: error ? [] : (data ?? []) as ReplayComment[], enabled: true };
}

export async function getPublicBookingData(arenaSlug: string, courtSlug: string): Promise<{ arena: Arena; court: Court; days: BookingDay[] } | null> {
  const today = saoPauloDateString();
  const dates = Array.from({ length: 14 }, (_, index) => addLocalDays(today, index));
  const admin = getAdminSupabase();
  if (!admin) {
    const court = demoCourts.find((item) => item.slug === courtSlug);
    if (arenaSlug !== demoArena.slug || !court) return null;
    const slots = Array.from({ length: 6 }, (_, index) => ({ hora_inicio: `${String(index + 17).padStart(2, "0")}:00:00`, hora_fim: `${String(index + 18).padStart(2, "0")}:00:00` }));
    return {
      arena: demoArena,
      court,
        days: dates.map((date) => {
        const dayBookings = demoBookings(date, court.id);
        return {
          date,
          slots: slots.map((slot) => ({
            ...slot,
              livre: isFutureLocalSlot(date, slot.hora_inicio)
                && !dayBookings.some((booking) => booking.hora_inicio < slot.hora_fim && booking.hora_fim > slot.hora_inicio),
          })),
        };
      }),
    };
  }

  const { data: arenaRow } = await admin.from("arenas").select("id,nome,slug,cidade,telefone_whatsapp,logo_url,cor_primaria,retention_days,publicidade_ativa,publicidade_titulo,publicidade_texto,publicidade_imagem_url,publicidade_whatsapp").eq("slug", arenaSlug).maybeSingle();
  if (!arenaRow) return null;
  const { data: courtRow } = await admin.from("courts").select("id,arena_id,nome,esporte,tipo,slug,ativa").eq("arena_id", arenaRow.id).eq("slug", courtSlug).eq("ativa", true).maybeSingle();
  if (!courtRow) return null;
  const { data: slots } = await admin.from("time_slots").select("dia_semana,hora_inicio,hora_fim").eq("court_id", courtRow.id).eq("ativo", true).order("hora_inicio");
  const { data: bookings } = await admin.from("bookings").select("data,hora_inicio,hora_fim,status").eq("court_id", courtRow.id).gte("data", dates[0]).lte("data", dates[13]).neq("status", "cancelada");
  const arena: Arena = { ...arenaRow, retention_days: arenaRow.retention_days ?? getRetentionDays() };
  return {
    arena,
    court: courtRow as Court,
    days: dates.map((date) => {
      const dayBookings = (bookings ?? []).filter((booking) => booking.data === date);
      return {
        date,
        slots: (slots ?? []).filter((slot) => slot.dia_semana === weekdayForLocalDate(date)).map((slot) => ({
          hora_inicio: slot.hora_inicio,
          hora_fim: slot.hora_fim,
          livre: isFutureLocalSlot(date, slot.hora_inicio)
            && !dayBookings.some((booking) => booking.status !== "cancelada" && booking.hora_inicio < slot.hora_fim && booking.hora_fim > slot.hora_inicio),
        })),
      };
    }),
  };
}

export function bookingStatusLabel(status: string) {
  if (status === "confirmada") return "Confirmada";
  if (status === "bloqueada") return "Indisponível";
  return "Aguardando confirmação";
}

export function dateLabel(date: string) {
  return formatLocalDate(date, { weekday: "short", day: "2-digit", month: "short" });
}