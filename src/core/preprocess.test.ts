import { describe, it, expect } from "vitest";
import { preprocessLines, hasMeaningfulContent } from "./preprocess";

describe("preprocessLines", () => {
  it("normalizes CRLF to LF and trims leading/trailing spaces", () => {
    const input = "  \u3000Hello world  \r\n\tSecond line   ";
    const result = preprocessLines(input);
    expect(result).toEqual(["Hello world", "Second line"]);
  });

  it("keeps empty lines (after trimming) for structure", () => {
    const input = "Line one\n   \n  Line two  ";
    const result = preprocessLines(input);
    expect(result).toEqual(["Line one", "", "Line two"]);
  });
});

describe("hasMeaningfulContent", () => {
  it("returns false when all lines are whitespace or empty", () => {
    expect(hasMeaningfulContent(["   ", "\t", ""])).toBe(false);
  });

  it("returns true when at least one line has non-space characters", () => {
    expect(hasMeaningfulContent(["   ", "内容", " "])).toBe(true);
  });
});
