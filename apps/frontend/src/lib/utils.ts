import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

export function hasDistinctEpisodeTitle(episodeCode: string, episodeTitle: string): boolean {
  const normalizedCode = episodeCode.trim();
  const normalizedTitle = episodeTitle.trim();
  return normalizedTitle.length > 0 && normalizedTitle !== normalizedCode;
}

export function formatEpisodeCode(episodeNumber: number): string {
  return `EP${String(episodeNumber).padStart(2, "0")}`;
}

export function parseEpisodeCodeNumber(episodeCode: string): number | null {
  const matchedNumber = /^EP(\d+)$/i.exec(episodeCode.trim())?.[1];
  if (!matchedNumber) {
    return null;
  }

  const parsedNumber = Number.parseInt(matchedNumber, 10);
  return Number.isFinite(parsedNumber) ? parsedNumber : null;
}

export function formatEpisodeDisplayLabel(episodeCode: string, episodeTitle: string): string {
  return hasDistinctEpisodeTitle(episodeCode, episodeTitle)
    ? `${episodeCode.trim()} ${episodeTitle.trim()}`
    : episodeCode.trim();
}
