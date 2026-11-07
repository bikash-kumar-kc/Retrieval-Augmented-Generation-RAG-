import { formatDistanceStrict } from "date-fns";

export function relativeTime(iso: string, now: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  // under a few seconds "0 seconds ago" reads oddly
  if (Math.abs(now - date.getTime()) < 10_000) return "just now";
  return formatDistanceStrict(date, now, { addSuffix: true });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}
