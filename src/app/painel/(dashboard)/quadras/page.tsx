import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CourtManager } from "@/components/CourtManager";
import { isDeviceOnline } from "@/lib/device-status";
import { getEnv } from "@/lib/env";
import { getPanelContext } from "@/lib/panel-context";

export const dynamic = "force-dynamic";

export default async function CourtsPage() {
  const context = await getPanelContext();
  if (!context) notFound();
  const courtIds = context.courts.map((court) => court.id);
  const { data: devices } = courtIds.length ? await context.admin.from("devices").select("id,court_id,ultimo_ping,status").in("court_id", courtIds) : { data: [] };
  const deviceViews = (devices ?? []).map((device) => ({ ...device, online: isDeviceOnline(device.status, device.ultimo_ping) }));
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (forwardedHost.startsWith("localhost") ? "http" : "https");
  const appUrl = getEnv("NEXT_PUBLIC_APP_URL") ?? `${protocol}://${forwardedHost}`;

  return <div className="panel-page">
    <header className="panel-page-heading"><div><span className="section-eyebrow">GESTÃO DA ARENA · INFRAESTRUTURA</span><h1>Quadras e dispositivos.</h1><p>QR codes, sinais e acesso ao serviço de borda.</p></div></header>
    <CourtManager arena={context.arena} courts={context.courts} devices={deviceViews} appUrl={appUrl} />
  </div>;
}