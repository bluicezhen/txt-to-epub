export function preprocessLines(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, "\n");
  const lines = normalized
    .split("\n")
    .map((line) => line.replace(/^[\s\u3000]+/, "")) // 删除行首空白（包含全角空格）
    .map((line) => line.replace(/\s+$/, "")); // 去掉行尾零碎空格，避免影响比对

  return lines;
}

export function hasMeaningfulContent(lines: string[]): boolean {
  return lines.some((line) => line.trim().length > 0);
}
