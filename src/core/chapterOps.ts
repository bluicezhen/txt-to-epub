import type { Chapter } from "../types";

export function renameChapter(chapters: Chapter[], id: string, title: string): Chapter[] {
  return chapters.map((ch) => (ch.id === id ? { ...ch, title } : ch));
}

export function mergeWithPrevious(chapters: Chapter[], id: string): Chapter[] {
  const index = chapters.findIndex((ch) => ch.id === id);
  if (index <= 0) return chapters;
  const prev = chapters[index - 1];
  const current = chapters[index];
  const merged: Chapter = {
    ...prev,
    lines: [...prev.lines, ...current.lines],
    title: prev.title,
    isIntro: prev.isIntro || current.isIntro,
  };
  return [...chapters.slice(0, index - 1), merged, ...chapters.slice(index + 1)];
}
