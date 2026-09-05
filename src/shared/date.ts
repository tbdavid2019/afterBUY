/**
 * Calendar dates in afterBuy are business dates in Taiwan. Keep these helpers
 * independent from the browser/server process timezone so a request near
 * midnight cannot move an item to the previous or next day.
 */
export const BUSINESS_TIME_ZONE = 'Asia/Taipei';

export function businessDate(value: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Parse a YYYY-MM-DD business date without applying the host timezone. */
export function parseBusinessDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addBusinessDays(value: Date | string, days: number): string {
  const date = typeof value === 'string' ? parseBusinessDate(value) : parseBusinessDate(businessDate(value));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function businessDateDiff(from: string, to: string): number {
  return Math.round((parseBusinessDate(to).getTime() - parseBusinessDate(from).getTime()) / 86400000);
}
