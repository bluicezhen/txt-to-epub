import { describe, it, expect } from "vitest";
import { parseChapters } from "./chapterParser";
import type { Chapter, Language } from "../types";

function titles(chapters: Chapter[]): string[] {
  return chapters.map((c) => c.title);
}

describe("parseChapters", () => {
  const lang: Language = "zh-CN";

  it("falls back to single chapter when no titles detected", () => {
    const lines = ["这是第一行", "这是第二行"]; 
    const chapters = parseChapters(lines, lang);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].title).toBe("正文");
    expect(chapters[0].lines).toEqual(lines);
  });

  it("detects numeric chinese chapter titles and splits correctly", () => {
    const lines = [
      "第1章 开始",
      "这一章的内容一",
      "这一章的内容二",
      "第2章 继续",
      "下一章内容",
    ];
    const chapters = parseChapters(lines, lang);
    expect(titles(chapters)).toEqual(["第1章 开始", "第2章 继续"]);
    expect(chapters[0].lines).toEqual(["这一章的内容一", "这一章的内容二"]);
    expect(chapters[1].lines).toEqual(["下一章内容"]);
  });

  it("creates intro chapter when there is content before first title", () => {
    const lines = [
      "书名：测试小说",
      "作者：某人",
      "",
      "第十章 正文开始",
      "正文内容……",
    ];
    const chapters = parseChapters(lines, lang);
    expect(chapters[0].isIntro).toBe(true);
    expect(chapters[0].title).toBe("简介");
    expect(chapters[0].lines).toEqual(["书名：测试小说", "作者：某人", ""]);
    expect(chapters[1].title).toBe("第十章 正文开始");
  });
});
