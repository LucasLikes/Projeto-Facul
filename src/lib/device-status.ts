export function isDeviceOnline(status: string, lastPing: string | null): boolean {
  return Boolean(lastPing && status === "online" && Date.now() - new Date(lastPing).getTime() <= 10 * 60_000);
}