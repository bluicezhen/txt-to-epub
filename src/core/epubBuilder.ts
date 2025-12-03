import JSZip from "jszip";
import type { BookMeta, Chapter, Cover } from "../types";

interface ManifestItem {
  id: string;
  href: string;
  title: string;
}

interface BuildEpubOptions {
  cover?: Cover | null;
}

function sanitizeFileName(name: string, fallback: string): string {
  const cleaned = name.split(/[\\/]/).pop() || fallback;
  const safe = cleaned.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return safe || fallback;
}

function guessExtensionFromMime(mimeType: string): string {
  const normalized = (mimeType || "").toLowerCase();
  if (normalized.includes("jpeg") || normalized.includes("jpg")) {
    return "jpg";
  }
  if (normalized.includes("png")) {
    return "png";
  }
  if (normalized.includes("gif")) {
    return "gif";
  }
  if (normalized.includes("webp")) {
    return "webp";
  }
  return "img";
}

function ensureExtension(fileName: string, mimeType: string): string {
  if (/\.[a-zA-Z0-9]+$/.test(fileName)) {
    return fileName;
  }
  return `${fileName}.${guessExtensionFromMime(mimeType)}`;
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
  const paragraphs = lines.map((line) => line.trim());
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

function buildCoverXhtml(meta: BookMeta, coverHref: string): string {
  const title = escapeXml(meta.title || "未命名");
  const label = meta.language === "zh-CN" ? "封面" : "Cover";

  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${meta.language}">
  <head>
    <meta charset="utf-8" />
    <title>${title} - ${label}</title>
  </head>
  <body style="margin: 0; padding: 0;">
    <section id="cover" aria-label="${label}">
      <h1 style="display:none">${title}</h1>
      <div style="display:flex; align-items:center; justify-content:center; min-height: 100vh; padding: 24px;">
        <img src="${coverHref}" alt="${title}" style="max-width: 100%; max-height: 100vh; object-fit: contain;" />
      </div>
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

function buildContentOpf(
  meta: BookMeta,
  items: ManifestItem[],
  uuid: string,
  extras?: { coverImage?: { href: string; mediaType: string }; coverPageHref?: string },
): string {
  const manifestEntries: string[] = [
    `    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
  ];

  if (extras?.coverImage) {
    manifestEntries.push(
      `    <item id="cover-image" href="${escapeXml(extras.coverImage.href)}" media-type="${escapeXml(extras.coverImage.mediaType || "image/jpeg")}" properties="cover-image"/>`,
    );
  }

  if (extras?.coverPageHref) {
    manifestEntries.push(
      `    <item id="cover-page" href="${escapeXml(extras.coverPageHref)}" media-type="application/xhtml+xml"/>`,
    );
  }

  manifestEntries.push(
    ...items.map(
      (item) =>
        `    <item id="${escapeXml(item.id)}" href="${escapeXml(item.href)}" media-type="application/xhtml+xml"/>`,
    ),
  );

  const spineEntries: string[] = [];
  if (extras?.coverPageHref) {
    spineEntries.push(`    <itemref idref="cover-page"/>`);
  }
  spineEntries.push(...items.map((item) => `    <itemref idref="${escapeXml(item.id)}"/>`));

  return `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${meta.language}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${uuid}</dc:identifier>
    <dc:title>${escapeXml(meta.title || "未命名")}</dc:title>
    ${meta.author ? `<dc:creator>${escapeXml(meta.author)}</dc:creator>` : ""}
    <dc:language>${meta.language}</dc:language>
    ${extras?.coverImage ? `<meta name="cover" content="cover-image"/>` : ""}
  </metadata>
  <manifest>
${manifestEntries.join("\n")}
  </manifest>
  <spine>
${spineEntries.join("\n")}
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

export async function buildEpub(
  meta: BookMeta,
  chapters: Chapter[],
  options: BuildEpubOptions = {},
): Promise<Blob> {
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

  let coverImageInfo: { href: string; mediaType: string } | undefined;
  let coverPageHref: string | undefined;

  if (options.cover) {
    const safeName = sanitizeFileName(options.cover.fileName || "cover", "cover");
    const coverHref = ensureExtension(safeName, options.cover.mimeType || "image/jpeg");
    coverImageInfo = { href: coverHref, mediaType: options.cover.mimeType || "image/jpeg" };
    coverPageHref = "cover.xhtml";

    oebps.file(coverHref, options.cover.data);
    oebps.file(coverPageHref, buildCoverXhtml(meta, coverHref));
  }

  const uuid = makeUuid();
  oebps.file("nav.xhtml", buildNavXhtml(meta, manifestItems));
  oebps.file(
    "content.opf",
    buildContentOpf(meta, manifestItems, uuid, {
      coverImage: coverImageInfo,
      coverPageHref,
    }),
  );

  return zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
}
