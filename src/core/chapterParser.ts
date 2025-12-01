import type { Chapter, Language } from "../types";
import { hasMeaningfulContent } from "./preprocess";

const chapterPattern =
  /^第([0-9０-９零一二三四五六七八九十百千万两〇○]+)章(?:[\s·、，,：:.-]*)(.*)$/;

function createId(prefix: string, index: number): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`;
}

function isChapterTitle(line: string): boolean {
  const trimmed = line.trim();
  return chapterPattern.test(trimmed);
}

export function parseChapters(lines: string[], language: Language): Chapter[] {
  const indices: Array<{ index: number; title: string }> = [];
  lines.forEach((line, idx) => {
    if (isChapterTitle(line)) {
      const matched = line.trim().match(chapterPattern);
      const title = matched?.[0] ?? line.trim();
      indices.push({ index: idx, title });
    }
  });

  const chapters: Chapter[] = [];

  if (indices.length === 0) {
    chapters.push({
      id: createId("chapter", 0),
      title: language === "zh-CN" ? "正文" : "Content",
      lines,
    });
    return chapters;
  }

  // 简介章节
  const introLines = lines.slice(0, indices[0].index);
  if (hasMeaningfulContent(introLines)) {
    chapters.push({
      id: createId("intro", 0),
      title: language === "zh-CN" ? "简介" : "Introduction",
      lines: introLines,
      isIntro: true,
    });
  }

  indices.forEach((start, idx) => {
    const endIndex = idx === indices.length - 1 ? lines.length : indices[idx + 1].index;
    const body = lines.slice(start.index + 1, endIndex);
    chapters.push({
      id: createId("chapter", idx + 1),
      title: start.title,
      lines: body,
    });
  });

  return chapters;
}
