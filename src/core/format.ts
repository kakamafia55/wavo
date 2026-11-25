export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${Math.floor(bytes)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

export function formatTimestamp(timestamp: number, lang: 'ar' | 'en'): string {
  try {
    return new Date(timestamp).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    } as Intl.DateTimeFormatOptions);
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

export function formatProgress(received: number, total: number): number {
  if (total <= 0) return 0;
  const ratio = received / total;
  return Math.max(0, Math.min(1, ratio));
}
