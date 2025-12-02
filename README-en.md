# TXT to EPUB Converter (Frontend SPA)

[简体中文](README.md)

A pure frontend TXT-to-EPUB converter built with Vue 3, TypeScript, and Vite. It supports both Simplified Chinese and English text, automatically detects chapters and generates an EPUB with a table of contents. Everything runs in your browser and no file is uploaded, which helps protect user privacy.

Live demo: https://txt2epub.bluice.xyz/

## Features

- Single Page Application (SPA), can be deployed as static files
- Read local TXT files via the browser File API
- Auto-detect text encoding using `jschardet` (supports common encodings such as UTF-8 / GB18030 / Big5)
- Chapter splitting:
  - Remove leading whitespace (including full-width spaces) from each line
  - Treat lines starting with `第 x 章` as chapter titles, where `x` can be Arabic digits or Chinese numerals
  - Content between two `第 x 章` lines becomes the body of the previous chapter
  - Non-empty content before the first chapter becomes an “Introduction” chapter
- Simple chapter preview and editing:
  - Preview chapter titles, character counts and line counts
  - Rename chapter titles
  - Merge a chapter into its previous one

## Tech Stack

- Framework: Vue 3 (Composition API)
- Language: TypeScript
- Bundler: Vite

## Development

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

Then open the URL printed by the terminal (usually `http://localhost:5173`) in your browser.

3. Build for production:

```bash
npm run build
```

The compiled files are in the `dist/` directory. You can deploy them to any static hosting service (GitHub Pages, Vercel, Cloudflare Pages, etc.).

## Testing

- Test runner: [Vitest](https://vitest.dev/)
- Run all tests once (unit + integration):

```bash
npm test -- --run
```

Fixture TXT files for integration tests are placed under `tests/fixtures/`.

## Chapter Detection Rules

1. **Strip leading whitespace**  
   For each line, remove all leading whitespace characters (spaces, tabs, full-width spaces, etc.).

2. **Chapter title recognition**  
   - A line is considered a chapter title if it starts with:
     - `第` + number/Chinese numerals + `章`
   - The numeric part can be:
     - Arabic digits: `0-9`
     - Chinese numerals: `零一二三四五六七八九十百千万两〇○` etc.
   - Any text following `第 x 章` is treated as part of the chapter title, e.g. `第一章 重逢`, `第12章 序幕`.

3. **Body splitting**  
   - Text between two chapter-title lines belongs to the previous chapter’s body.
   - The last chapter’s body extends to the end of the file.
   - Non-empty text before the first chapter is turned into a dedicated “Introduction” chapter.

4. **Fallback**  
   - If no `第 x 章` line is found in the entire file, the whole document is treated as a single chapter (with a default title “正文” / “Content”).
