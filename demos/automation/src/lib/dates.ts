import {
  addDays,
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
} from "date-fns";
export const DEMO_DATE = "2026-09-26";
export function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value))
    return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}
export function dateLabel(value: unknown) {
  const parsed = parseDate(value);
  return parsed ? format(parsed, "dd MMM yyyy") : "Date unavailable";
}
export function daysBetween(later: unknown, earlier: unknown) {
  const end = parseDate(later);
  const start = parseDate(earlier);
  return end && start ? differenceInCalendarDays(end, start) : null;
}
export function moveDate(value: string, days: number) {
  const parsed = parseDate(value);
  if (!parsed || !Number.isInteger(days))
    throw new Error("Invalid sample date");
  return format(addDays(parsed, days), "yyyy-MM-dd");
}
export function actionTiming(due: string | null, asOf: string) {
  if (!due) return "Closed";
  const days = daysBetween(asOf, due);
  if (days === null) return "Date unavailable";
  if (days > 0) return `${days} ${days === 1 ? "day" : "days"} overdue`;
  return days === 0 ? "Due today" : `Due ${dateLabel(due)}`;
}
export function overdueDays(due: unknown, asOf: string = DEMO_DATE) {
  const parsed = parseDate(due);
  return parsed ? Math.max(0, daysBetween(asOf, due) ?? 0) : 0;
}
