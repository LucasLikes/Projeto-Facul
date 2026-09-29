export function getEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function requiredEnv(name: string): string {
  const value = getEnv(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function getRetentionDays(): number {
  const value = Number(getEnv("REPLAY_RETENTION_DAYS") ?? 30);
  return Number.isInteger(value) && value >= 1 && value <= 365 ? value : 30;
}