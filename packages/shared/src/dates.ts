import { addDays, addMinutes, differenceInDays, isAfter, isBefore } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

export const TR_TIMEZONE = 'Europe/Istanbul';

export function nowUtc(): Date {
  return new Date();
}

export function toTrZone(date: Date): Date {
  return toZonedTime(date, TR_TIMEZONE);
}

export function fromTrZone(date: Date): Date {
  return fromZonedTime(date, TR_TIMEZONE);
}

export function formatTr(date: Date, pattern: string): string {
  return formatInTimeZone(date, TR_TIMEZONE, pattern);
}

export function addBusinessDays(date: Date, days: number): Date {
  // Basit: hafta sonları atla
  let result = new Date(date);
  let remaining = days;
  while (remaining > 0) {
    result = addDays(result, 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) remaining--;
  }
  return result;
}

export function isExpired(expiresAt: Date | null | undefined, now: Date = nowUtc()): boolean {
  if (!expiresAt) return false;
  return isBefore(expiresAt, now);
}

export function isActive(starts: Date | null | undefined, ends: Date | null | undefined, now: Date = nowUtc()): boolean {
  if (starts && isBefore(now, starts)) return false;
  if (ends && isAfter(now, ends)) return false;
  return true;
}

export { addDays, addMinutes, differenceInDays, isAfter, isBefore };
