import JSZip from "jszip";
import type { BookMeta, Chapter } from "../types";

interface ManifestItem {
  id: string;
  href: string;
  title: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function makeUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `urn:uuid:${crypto.randomUUID()}`;
  }
  return `urn:uuid:${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function linesToParagraphs(lines: string[]): string[] {
  const paragraphs: string[] = [];
  let buffer: string[] = [];

  const pushBuffer = () => {
    if (buffer.length) {
      paragraphs.push(buffer.join(" "));
      buffer = [];
    }
  };

  lines.forEach((line) => {
    if (line.trim() === "") {
      pushBuffer();
    } else {
      buffer.push(line.trim());
    }
  });
  pushBuffer();

  if (!paragraphs.length) {
    paragraphs.push("");
  }
  return paragraphs;
}

function buildChapterXhtml(chapter: Chapter, language: string, index: number): string {
  const paragraphs = linesToParagraphs(chapter.lines)
    .map((p) => `      <p>${escapeXml(p)}</p>`)
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${language}">
  <head>
    <meta charset="utf-8" />
    <title>${escapeXml(chapter.title)}</title>
  </head>
  <body>
    <section id="chap-${index}">
      <h1>${escapeXml(chapter.title)}</h1>
${paragraphs}
    </section>
  </body>
</html>
`;
}

function buildNavXhtml(meta: BookMeta, items: ManifestItem[]): string {
  const list = items
    .map(
      (item, idx) =>
        `        <li><a href="${item.href}#chap-${idx + 1}">${escapeXml(item.title)}</a></li>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${meta.language}">
  <head>
    <meta charset="utf-8" />
    <title>${escapeXml(meta.title || "未命名")}</title>
  </head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>${meta.language === "zh-CN" ? "目录" : "Contents"}</h1>
      <ol>
${list}
      </ol>
    </nav>
  </body>
</html>
`;
}

function buildContentOpf(meta: BookMeta, items: ManifestItem[], uuid: string): string {
  const manifestList = items
    .map((item) => `    <item id="${item.id}" href="${item.href}" media-type="application/xhtml+xml"/>`)
    .join("\n");

  const spineList = items.map((item) => `    <itemref idref="${item.id}"/>`).join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${meta.language}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${uuid}</dc:identifier>
    <dc:title>${escapeXml(meta.title || "未命名")}</dc:title>
    ${meta.author ? `<dc:creator>${escapeXml(meta.author)}</dc:creator>` : ""}
    <dc:language>${meta.language}</dc:language>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
${manifestList}
  </manifest>
  <spine>
${spineList}
  </spine>
</package>
`;
}

const containerXml = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`;

export async function buildEpub(meta: BookMeta, chapters: Chapter[]): Promise<Blob> {
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.folder("META-INF")?.file("container.xml", containerXml);

  const oebps = zip.folder("OEBPS");
  if (!oebps) {
    throw new Error("无法创建 EPUB 结构");
  }

  const manifestItems: ManifestItem[] = chapters.map((chapter, idx) => {
    const href = `chapter-${idx + 1}.xhtml`;
    oebps.file(href, buildChapterXhtml(chapter, meta.language, idx + 1));
    return { id: `chapter-${idx + 1}`, href, title: chapter.title };
  });

  const uuid = makeUuid();
  oebps.file("nav.xhtml", buildNavXhtml(meta, manifestItems));
  oebps.file("content.opf", buildContentOpf(meta, manifestItems, uuid));

  return zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
}
