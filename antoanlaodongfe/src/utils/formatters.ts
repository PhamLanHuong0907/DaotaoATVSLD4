import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/** Parse an ISO string from the backend. If no timezone suffix is present,
 * treat it as UTC (BE stores UTC in Mongo, some responses omit the Z). */
function parseDate(date: string): dayjs.Dayjs {
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(date);
  return hasTz ? dayjs(date) : dayjs.utc(date);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  return parseDate(date).local().format('DD/MM/YYYY');
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—';
  return parseDate(date).local().format('DD/MM/YYYY HH:mm');
}

export function formatScore(score: number): string {
  return score % 1 === 0 ? score.toString() : score.toFixed(2);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`;
}

export function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
