import type { Chapter, Language } from "../types";
import { hasMeaningfulContent } from "./preprocess";
import { compileRule, type ChapterRule, type CompiledRule } from "./customRules";

const presetPatterns: CompiledRule[] = [
  {
    // 中文“第X集”
    regex: /^第([0-9０-９零一二三四五六七八九十百千万两〇○]+)集(?:[\s·、，,：:.-]*)(.*)$/,
  },
  {
    // 英文/混排格式，例如 “1.Chapter0---1序” / “Chapter 25---2”
    regex:
      /^(?:\d+[\s.]*\s*)?(Chapter\s*[0-9０-９]+(?:\s*[-—–]{2,}\s*[0-9０-９]+)?(?:.*))$/i,
    capture: 1,
  },
];

function createId(prefix: string, index: number): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`;
}

function compileUserRules(userRules: ChapterRule[]): CompiledRule[] {
  const out: CompiledRule[] = [];
  for (const rule of userRules) {
    if (!rule.enabled) continue;
    try {
      out.push(compileRule(rule));
    } catch {
      // malformed rule — skip so one bad entry can't break parsing
    }
  }
  return out;
}

function extractChapterTitle(
  line: string,
  patterns: CompiledRule[],
): string | null {
  const trimmed = line.trim();
  for (const pattern of patterns) {
    try {
      const matched = trimmed.match(pattern.regex);
      if (matched) {
        const title = matched[pattern.capture ?? 0] ?? matched[0];
        return title.trim();
      }
    } catch {
      // runtime match error — skip this pattern, continue with the next
    }
  }
  return null;
}

export function parseChapters(
  lines: string[],
  language: Language,
  userRules: ChapterRule[] = [],
): Chapter[] {
  const patterns = [...presetPatterns, ...compileUserRules(userRules)];
  const indices: Array<{ index: number; title: string }> = [];
  lines.forEach((line, idx) => {
    const title = extractChapterTitle(line, patterns);
    if (title) {
      indices.push({ index: idx, title });
    }
  });

  const chapters: Chapter[] = [];

  if (indices.length === 0) {
    const title = language === "zh-CN" ? "正文" : "Content";
    chapters.push({
      id: createId("chapter", 0),
      title,
      originalTitle: title,
      lines,
    });
    return chapters;
  }

  // 简介章节
  const introLines = lines.slice(0, indices[0].index);
  if (hasMeaningfulContent(introLines)) {
    const title = language === "zh-CN" ? "简介" : "Introduction";
    chapters.push({
      id: createId("intro", 0),
      title,
      originalTitle: title,
      lines: introLines,
      isIntro: true,
    });
  }

  indices.forEach((start, idx) => {
    const endIndex =
      idx === indices.length - 1 ? lines.length : indices[idx + 1].index;
    const body = lines.slice(start.index + 1, endIndex);
    chapters.push({
      id: createId("chapter", idx + 1),
      title: start.title,
      originalTitle: start.title,
      lines: body,
    });
  });

  return chapters;
}
