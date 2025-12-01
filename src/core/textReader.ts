import jschardet from "jschardet";
import type { ReadResult } from "../types";

const encodingAlias: Record<string, string> = {
  utf8: "utf-8",
  "utf-8": "utf-8",
  gbk: "gb18030",
  gb2312: "gb18030",
  gb18030: "gb18030",
  big5: "big5",
  "big-5": "big5",
  shift_jis: "shift_jis",
  sjis: "shift_jis",
};

function normalizeEncoding(label?: string): string {
  if (!label) return "utf-8";
  const key = label.toLowerCase();
  return encodingAlias[key] ?? key;
}

function isEncodingSupported(enc: string): boolean {
  try {
    new TextDecoder(enc);
    return true;
  } catch {
    return false;
  }
}

function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
}

function bufferToLatin1String(buffer: Uint8Array): string {
  try {
    // latin1/iso-8859-1 可以逐字节等值映射，适合做编码探测输入
    return new TextDecoder("latin1").decode(buffer);
  } catch {
    let result = "";
    const chunkSize = 0x4000;
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const slice = buffer.subarray(i, i + chunkSize);
      result += String.fromCharCode(...slice);
    }
    return result;
  }
}

function decodeBuffer(buffer: Uint8Array, encoding: string): { text: string; used: string } {
  const enc = isEncodingSupported(encoding) ? encoding : "utf-8";
  const decoder = new TextDecoder(enc, { fatal: false });
  return { text: decoder.decode(buffer), used: enc };
}

export async function readTextFile(
  file: File,
  encodingChoice: string | "auto" = "auto",
): Promise<ReadResult> {
  const rawBuffer = new Uint8Array(await file.arrayBuffer());
  const binaryString = bufferToLatin1String(rawBuffer);
  const detection = jschardet.detect(binaryString) ?? {};
  const detectedEncoding = normalizeEncoding(detection.encoding);
  const targetEncoding = encodingChoice === "auto" ? detectedEncoding : normalizeEncoding(encodingChoice);
  const decoded = decodeBuffer(rawBuffer, targetEncoding);
  const cleaned = stripBom(decoded.text);

  return {
    text: cleaned,
    detectedEncoding: detectedEncoding || "unknown",
    usedEncoding: decoded.used,
  };
}
