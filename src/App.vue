<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import BookMetaForm from "./components/BookMetaForm.vue";
import ChapterDetail from "./components/ChapterDetail.vue";
import ChapterList from "./components/ChapterList.vue";
import CoverUploadPanel from "./components/CoverUploadPanel.vue";
import ExportPanel from "./components/ExportPanel.vue";
import FileUploadPanel from "./components/FileUploadPanel.vue";
import { mergeWithPrevious, renameChapter } from "./core/chapterOps";
import { parseChapters } from "./core/chapterParser";
import { preprocessLines } from "./core/preprocess";
import { buildEpub } from "./core/epubBuilder";
import { readTextFile } from "./core/textReader";
import type { BookMeta, Chapter, Cover } from "./types";

const detectedEncoding = ref("未知");
const usedEncoding = ref("待解析");
const chapters = ref<Chapter[]>([]);
const selectedChapterId = ref<string | null>(null);
const statusMessage = ref("");
const errorMessage = ref("");
const busy = ref(false);
const lastFileName = ref("");
const cover = ref<Cover | null>(null);
const coverPreviewUrl = ref<string | null>(null);

const bookMeta = reactive<BookMeta>({
  title: "",
  author: "",
  language: "zh-CN",
});

const selectedChapter = computed(() =>
  chapters.value.find((ch) => ch.id === selectedChapterId.value),
);

const totalWords = computed(() =>
  chapters.value.reduce((sum, ch) => sum + ch.lines.join("").length, 0),
);

watch(
  chapters,
  (next) => {
    if (next.length && !next.find((c) => c.id === selectedChapterId.value)) {
      selectedChapterId.value = next[0].id;
    }
  },
  { deep: true },
);

function updateMeta(meta: BookMeta) {
  Object.assign(bookMeta, meta);
}

function handleCoverSelect(payload: { cover: Cover; previewUrl: string }) {
  if (coverPreviewUrl.value) {
    URL.revokeObjectURL(coverPreviewUrl.value);
  }
  cover.value = payload.cover;
  coverPreviewUrl.value = payload.previewUrl;
}

function handleCoverClear() {
  if (coverPreviewUrl.value) {
    URL.revokeObjectURL(coverPreviewUrl.value);
  }
  coverPreviewUrl.value = null;
  cover.value = null;
}

async function handleParse(payload: { file: File; encoding: string | "auto" }) {
  busy.value = true;
  statusMessage.value = "读取文件中…";
  errorMessage.value = "";
  try {
    const read = await readTextFile(payload.file, payload.encoding);
    detectedEncoding.value = read.detectedEncoding || "未知";
    usedEncoding.value = read.usedEncoding || "utf-8";

    const lines = preprocessLines(read.text);
    const parsed = parseChapters(lines, bookMeta.language);

    chapters.value = parsed;
    selectedChapterId.value = parsed[0]?.id ?? null;
    lastFileName.value = payload.file.name.replace(/\.txt$/i, "") || payload.file.name;
    if (!bookMeta.title) {
      bookMeta.title = lastFileName.value;
    }
    statusMessage.value = `已解析 ${parsed.length} 个章节`;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    busy.value = false;
  }
}

function handleSelectChapter(id: string) {
  selectedChapterId.value = id;
}

function handleRename(payload: { id: string; title: string }) {
  chapters.value = renameChapter(chapters.value, payload.id, payload.title || "未命名章节");
}

function handleMergePrev(id: string) {
  chapters.value = mergeWithPrevious(chapters.value, id);
}

async function handleExport() {
  if (!chapters.value.length) {
    errorMessage.value = "请先解析并确认章节";
    return;
  }
  busy.value = true;
  statusMessage.value = "生成 EPUB 中…";
  errorMessage.value = "";

  try {
    const meta: BookMeta = {
      ...bookMeta,
      title: bookMeta.title || lastFileName.value || "未命名",
    };
    const blob = await buildEpub(meta, chapters.value, {
      cover: cover.value || undefined,
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${meta.title || "book"}.epub`;
    link.click();
    URL.revokeObjectURL(url);
    statusMessage.value = "已生成 EPUB，可在本地阅读器打开验证。";
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    busy.value = false;
  }
}

onBeforeUnmount(() => {
  if (coverPreviewUrl.value) {
    URL.revokeObjectURL(coverPreviewUrl.value);
  }
});
</script>

<template>
  <main class="page grid" style="gap: 20px">
    <header class="flex-between" style="align-items: baseline">
      <div>
        <h1 style="margin: 0; font-size: 28px; letter-spacing: 0.5px">TXT 转 EPUB</h1>
      </div>
      <div class="flex" style="flex-wrap: wrap; justify-content: flex-end">
        <a
          class="ghost-btn"
          href="https://github.com/bluicezhen/txt-to-epub"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub · Star
        </a>
        <a
          class="ghost-btn"
          href="https://blog.bluice.xyz/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Blog
        </a>
      </div>
    </header>

    <FileUploadPanel
      :detected-encoding="detectedEncoding"
      :used-encoding="usedEncoding"
      :busy="busy"
      @parse="handleParse"
    />

    <section class="grid two-col" style="align-items: start">
      <ChapterList
        :chapters="chapters"
        :selected-id="selectedChapterId"
        @select="handleSelectChapter"
      />
      <div class="grid" style="gap: 12px">
        <BookMetaForm :meta="bookMeta" @update:meta="updateMeta" />
        <CoverUploadPanel
          :file-name="cover?.fileName || null"
          :preview-url="coverPreviewUrl"
          :busy="busy"
          @select="handleCoverSelect"
          @clear="handleCoverClear"
        />
        <ChapterDetail
          :chapter="selectedChapter"
          :can-merge="Boolean(selectedChapter && chapters.indexOf(selectedChapter) > 0)"
          :busy="busy"
          @rename="handleRename"
          @merge-prev="handleMergePrev"
        />
        <ExportPanel :chapter-count="chapters.length" :word-count="totalWords" :busy="busy" @export="handleExport" />
        <div class="card" v-if="statusMessage || errorMessage">
          <div v-if="statusMessage" class="success">{{ statusMessage }}</div>
          <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
        </div>
      </div>
    </section>
  </main>
</template>
