/**
 * Format a byte count into a human‑readable string. Uses binary units
 * (KiB = 1024 bytes) and shows no decimal places for values above
 * 10 KiB. For smaller values a single decimal place is retained.
 */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || isNaN(bytes)) return '';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const num = bytes / Math.pow(k, i);
  const fixed = num >= 10 || i === 0 ? num.toFixed(0) : num.toFixed(1);
  return `${fixed} ${sizes[i]}`;
}

/** Convert an ISO date string into a locale‑formatted string. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleString();
}

/** Format transfer speeds (bytes per second) into a human‑readable
 * string with /s appended. */
export function formatSpeed(bps: number | null | undefined): string {
  if (!bps) return '';
  return `${formatBytes(bps)}/s`;
}
