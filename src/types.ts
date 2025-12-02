export type Language = "zh-CN" | "en";

export interface BookMeta {
  title: string;
  author: string;
  language: Language;
}

export interface Chapter {
  id: string;
  title: string;
  lines: string[];
  isIntro?: boolean;
}

export interface ReadResult {
  text: string;
  detectedEncoding: string;
  usedEncoding: string;
}

export interface Cover {
  data: ArrayBuffer;
  mimeType: string;
  fileName: string;
}
