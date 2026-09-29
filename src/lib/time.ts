export const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

export function saoPauloDateString(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addLocalDays(date: string, amount: number): string {
  const value = new Date(`${date}T12:00:00-03:00`);
  value.setUTCDate(value.getUTCDate() + amount);
  return saoPauloDateString(value);
}

export function localDayRange(date: string) {
  const start = new Date(`${date}T00:00:00-03:00`);
  const end = new Date(start.getTime() + 86_400_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function weekdayForLocalDate(date: string): number {
  return new Date(`${date}T12:00:00-03:00`).getUTCDay();
}

export function hourText(value: string): string {
  return value.slice(0, 5);
}

export function slotIsCurrent(date: string, start: string, end: string, now = new Date()): boolean {
  if (saoPauloDateString(now) !== date) return false;
  const current = new Intl.DateTimeFormat("en-GB", {
    timeZone: SAO_PAULO_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return hourText(start) <= current && current < hourText(end);
}

export function formatLocalDate(date: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: SAO_PAULO_TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
    ...options,
  }).format(new Date(`${date}T12:00:00-03:00`));
}

export function formatReplayTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: SAO_PAULO_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

export function localClockTime(date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: SAO_PAULO_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function isFutureLocalSlot(date: string, start: string, today = saoPauloDateString(), now = new Date()): boolean {
  return date > today || (date === today && hourText(start) > localClockTime(now));
}