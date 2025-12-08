import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { preprocessLines } from "../src/core/preprocess";
import { parseChapters } from "../src/core/chapterParser";
import { buildEpub } from "../src/core/epubBuilder";
import type { BookMeta } from "../src/types";

function loadFixture(name: string): string {
  const p = path.resolve(process.cwd(), "tests/fixtures", name);
  return readFileSync(p, "utf8");
}

describe("TXT fixtures integration", () => {
  it("parses 测试小说_001.txt and builds a non-empty EPUB", async () => {
    const raw = loadFixture("测试小说_001.txt");
    const lines = preprocessLines(raw);

    const chapters = parseChapters(lines, "zh-CN");
    expect(chapters.length).toBeGreaterThan(0);

    const titles = chapters.map((c) => c.title);
    expect(titles.some((t) => t.includes("第1章"))).toBe(true);

    const meta: BookMeta = {
      title: "测试小说 001",
      author: "测试作者 001",
      language: "zh-CN",
    };

    const blob = await buildEpub(meta, chapters);
    const arrayBuffer = await blob.arrayBuffer();
    expect(arrayBuffer.byteLength).toBeGreaterThan(0);
  });

  it("parses 测试小说_002.txt and builds a non-empty EPUB", async () => {
    const raw = loadFixture("测试小说_002.txt");
    const lines = preprocessLines(raw);

    const chapters = parseChapters(lines, "zh-CN");
    expect(chapters.length).toBeGreaterThan(0);

    const titles = chapters.map((c) => c.title);
    expect(titles.length).toBeGreaterThan(0);

    const meta: BookMeta = {
      title: "测试小说 002",
      author: "测试作者 002",
      language: "zh-CN",
    };

    const blob = await buildEpub(meta, chapters);
    const arrayBuffer = await blob.arrayBuffer();
    expect(arrayBuffer.byteLength).toBeGreaterThan(0);
  });
});
