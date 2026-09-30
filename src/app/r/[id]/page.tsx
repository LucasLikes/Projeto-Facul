import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArenaHeader } from "@/components/ArenaHeader";
import { ReplayViewer } from "@/components/ReplayViewer";
import { LikesCredit } from "@/components/LikesCredit";
import { getPublicReplay, getPublicReplayComments } from "@/lib/public-data";
import { getEnv } from "@/lib/env";
import { z } from "zod";

const replayIdSchema = z.string().uuid();

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const route = replayIdSchema.safeParse((await params).id);
  if (!route.success) return { title: "Replay indisponível | Fez Bonito" };
  const item = await getPublicReplay(route.data);
  if (!item) return { title: "Replay indisponível | Fez Bonito" };
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const appUrl = getEnv("NEXT_PUBLIC_APP_URL") ?? `${protocol}://${host}`;
  const thumbnail = new URL(item.replay.demo ? item.replay.thumb_url : `/api/public/replays/${item.replay.id}/thumbnail`, appUrl).toString();
  return {
    title: `${item.court.nome} · ${item.arena.nome} | Fez Bonito`,
    description: `Replay capturado na ${item.court.nome}, na ${item.arena.nome}.`,
    openGraph: {
      type: "video.other",
      title: `Olha esse lance · ${item.court.nome}`,
      description: item.arena.nome,
      images: [{ url: thumbnail, width: 1200, height: 630, alt: `Replay da ${item.court.nome}` }],
    },
    twitter: { card: "summary_large_image", title: `Olha esse lance · ${item.court.nome}`, images: [thumbnail] },
  };
}

export default async function ReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const route = replayIdSchema.safeParse((await params).id);
  if (!route.success) notFound();
  const item = await getPublicReplay(route.data);
  if (!item) notFound();
  const commentData = await getPublicReplayComments(item.replay.id);

  return (
    <main className="public-shell replay-shell" style={{ "--brand": item.arena.cor_primaria } as React.CSSProperties}>
      <ArenaHeader arena={item.arena} court={item.court} />
      <Link className="back-link replay-back" href={`/${item.arena.slug}/${item.court.slug}`}>← Ver outros replays</Link>
      <ReplayViewer replay={item.replay} arena={item.arena} court={item.court} comments={commentData.comments} commentsEnabled={commentData.enabled} />
      <p className="replay-retention">Esta quadra é monitorada por câmera. Os vídeos ficam disponíveis por {item.arena.retention_days} dias.</p>
      <LikesCredit />
      <footer className="legal-footer"><Link href="/privacidade">Privacidade</Link><span>·</span><Link href="/termos">Termos</Link><span>·</span><span>FEZ BONITO</span></footer>
    </main>
  );
}