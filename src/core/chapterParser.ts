import type { Chapter, Language } from "../types";
import { hasMeaningfulContent } from "./preprocess";
import { compileRule, type ChapterRule, type CompiledRule } from "./customRules";

// 章节序号可用字符：阿拉伯数字 0-9 / 全角数字 ０-９ / 中文数字
const NUM = "0-9０-９零一二三四五六七八九十百千万两〇○";

const presetPatterns: CompiledRule[] = [
  {
    // 中文“第X章 / 第X节 / 第X集 / 第X卷 / 第X辑”：X 前后可有空格，标题可紧贴或以空格分隔
    // 覆盖：第X章sadhjbcck / 第X章 adsxcz / 第 X 章 xxx / 第 X 章xxx（节、集、卷、辑同理）
    regex: new RegExp(`^第\\s*[${NUM}]+\\s*[章节集卷辑].*$`),
  },
  {
    // 中文“第X + 文字”（无“章/节/集”单位）：靠空格与正文区分，
    // 要求“第与数字之间”或“数字与标题之间”至少有一个空格，避免误判如“第二天”等正文。
    // 覆盖：第X 文字 / 第 X文字 / 第 X 文字
    regex: new RegExp(`^第(?:\\s+[${NUM}]+|[${NUM}]+\\s+).*$`),
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
