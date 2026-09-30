import { notFound } from "next/navigation";
import { z } from "zod";
import { CourtTimeline } from "@/components/CourtTimeline";
import { getPublicCourtDay } from "@/lib/public-data";
import { saoPauloDateString } from "@/lib/time";
import { localDateSchema } from "@/lib/validation";

const paramsSchema = z.object({
  arena: z.string().regex(/^[a-z0-9-]{1,80}$/),
  quadra: z.string().regex(/^[a-z0-9-]{1,80}$/),
});
export const dynamic = "force-dynamic";

export default async function CourtPage({
  params,
  searchParams,
}: {
  params: Promise<{ arena: string; quadra: string }>;
  searchParams: Promise<{ data?: string; agora?: string }>;
}) {
  const route = paramsSchema.safeParse(await params);
  if (!route.success) notFound();
  const query = await searchParams;
  const selectedDate = localDateSchema.safeParse(query.data);
  const date = selectedDate.success ? selectedDate.data : saoPauloDateString();
  const nowMode = query.agora === "1";
  const day = await getPublicCourtDay(route.data.arena, route.data.quadra, date);
  if (!day) notFound();
  return <CourtTimeline arena={day.arena} court={day.court} courts={day.courts} date={day.date} slots={day.slots} agora={nowMode} />;
}