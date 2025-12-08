import type { Chapter, Language } from "../types";
import { hasMeaningfulContent } from "./preprocess";

const chapterPatterns: Array<{ regex: RegExp; capture?: number }> = [
  {
    // 中文“第X章”
    regex: /^第([0-9０-９零一二三四五六七八九十百千万两〇○]+)章(?:[\s·、，,：:.-]*)(.*)$/,
  },
  {
    // 英文/混排格式，例如 “1.Chapter0---1序” / “Chapter 25---2”
    regex: /^(?:\d+[\s.]*\s*)?(Chapter\s*[0-9０-９]+(?:\s*[-—–]{2,}\s*[0-9０-９]+)?(?:.*))$/i,
    capture: 1, // 去掉前缀序号，仅保留 Chapter... 部分
  },
];

function createId(prefix: string, index: number): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`;
}

function extractChapterTitle(line: string): string | null {
  const trimmed = line.trim();
  for (const pattern of chapterPatterns) {
    const matched = trimmed.match(pattern.regex);
    if (matched) {
      const title = matched[pattern.capture ?? 0] ?? matched[0];
      return title.trim();
    }
  }
  return null;
}

export function parseChapters(lines: string[], language: Language): Chapter[] {
  const indices: Array<{ index: number; title: string }> = [];
  lines.forEach((line, idx) => {
    const title = extractChapterTitle(line);
    if (title) {
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
