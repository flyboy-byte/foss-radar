import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInMonths, differenceInYears, formatDistanceToNow } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type ProjectHealth = "green" | "yellow" | "orange" | "red" | "unknown";

export function getProjectHealth(lastCommitDateString: string | null | undefined): { color: ProjectHealth; text: string } {
  if (!lastCommitDateString) {
    return { color: "unknown", text: "No commit data available" };
  }

  const date = new Date(lastCommitDateString);
  const now = new Date();
  const monthsDiff = differenceInMonths(now, date);
  const yearsDiff = differenceInYears(now, date);
  const relativeText = formatDistanceToNow(date, { addSuffix: true });

  if (monthsDiff < 1) {
    return { color: "green", text: `Active: Last commit ${relativeText}` };
  } else if (yearsDiff < 1) {
    return { color: "yellow", text: `Slow: Last commit ${relativeText}` };
  } else if (yearsDiff < 2) {
    return { color: "orange", text: `Stale: Last commit ${relativeText}` };
  } else {
    return { color: "red", text: `Abandoned: Last commit ${relativeText}` };
  }
}
