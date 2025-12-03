import { describe, it, expect } from "vitest";
import { buildEpub } from "./epubBuilder";
import type { BookMeta, Chapter } from "../types";

describe("lines to paragraphs for zh-CN", () => {
  it("keeps one line per paragraph for typical Chinese novel text", async () => {
    const lines: string[] = [
      "　　第一行内容。",
      "　　第二行内容。",
      "　　第三行内容？",
    ];

    const chapter: Chapter = {
      id: "ch1",
      title: "第1章 测试",
      lines,
    };

    const meta: BookMeta = {
      title: "测试小说",
      author: "测试作者",
      language: "zh-CN",
    };

    const blob = await buildEpub(meta, [chapter]);
    const arrayBuffer = await blob.arrayBuffer();
    const text = new TextDecoder("utf-8").decode(arrayBuffer);

    // 只要能看到三个 <p> 标签，大概率说明并没有把三行合并成一个段落。
    const pCount = (text.match(/<p>/g) || []).length;
    expect(pCount).toBeGreaterThanOrEqual(3);
  });
});
