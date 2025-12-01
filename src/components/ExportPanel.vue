<script setup lang="ts">
const props = defineProps<{
  chapterCount: number;
  wordCount: number;
  busy?: boolean;
}>();

const emit = defineEmits<{
  (e: "export"): void;
}>();
</script>

<template>
  <div class="card">
    <div class="flex-between">
      <h3 class="section-title">生成 EPUB</h3>
      <div class="flex" style="align-items: center; gap: 8px">
        <span class="pill">{{ chapterCount }} 章</span>
        <span class="pill">{{ wordCount }} 字</span>
      </div>
    </div>
    <div class="flex-between" style="align-items: center">
      <div class="muted">
        将当前章节和元信息打包为 EPUB。点击后浏览器会直接下载。
      </div>
      <button class="primary-btn" :disabled="busy || chapterCount === 0" @click="emit('export')">
        {{ busy ? "生成中…" : "生成并下载" }}
      </button>
    </div>
  </div>
</template>
