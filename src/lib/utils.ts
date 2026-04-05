import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Characters that don't decompose via NFD but should transliterate. */
const TRANSLITERATE: Record<string, string> = {
  "ø": "o", "Ø": "O", "ð": "d", "Ð": "D", "þ": "th", "Þ": "Th",
  "æ": "ae", "Æ": "AE", "œ": "oe", "Œ": "OE", "ß": "ss",
  "ł": "l", "Ł": "L", "đ": "d", "Đ": "D",
};

export function slugify(text: string): string {
  if (!text.trim()) return "";

  const slug = text
    // Transliterate characters that NFD can't decompose
    .replace(/[øØðÐþÞæÆœŒßłŁđĐ]/g, (c) => TRANSLITERATE[c] ?? c)
    // Decompose Unicode (é → e + combining accent)
    .normalize("NFD")
    // Strip combining diacritical marks
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // If the slug is empty or too short (all non-Latin chars), use a hash fallback
  if (slug.length < 2) {
    const hash = simpleHash(text.toLowerCase());
    return slug ? `${slug}-${hash}` : hash;
  }

  return slug;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Extract a YouTube video ID from various URL formats and return
 * a thumbnail URL, or null if the URL isn't a recognized YouTube link.
 */
export function getYouTubeThumbnail(url: string | null | undefined): string | null {
  if (!url) return null;

  const patterns = [
    // youtube.com/watch?v=ID
    /(?:youtube\.com\/watch\?.*v=)([\w-]{11})/,
    // youtu.be/ID
    /(?:youtu\.be\/)([\w-]{11})/,
    // youtube.com/embed/ID
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    }
  }

  return null;
}

export function formatRelativeDate(dateStr: string | Date, now = new Date()) {
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}
