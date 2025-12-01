<script setup lang="ts">
import type { Chapter } from "../types";

const props = defineProps<{
  chapters: Chapter[];
  selectedId: string | null;
}>();

const emit = defineEmits<{
  (e: "select", id: string): void;
}>();
</script>

<template>
  <div class="card">
    <div class="flex-between">
      <h3 class="section-title">章节列表</h3>
      <span class="muted">{{ chapters.length }} 章</span>
    </div>
    <ul class="list grid" style="gap: 8px; max-height: 460px; overflow: auto; padding-right: 4px">
      <li
        v-for="(chapter, idx) in chapters"
        :key="chapter.id"
        class="list-item"
        :class="{ active: selectedId === chapter.id }"
        @click="emit('select', chapter.id)"
      >
        <div class="flex-between" style="align-items: flex-start">
          <div>
            <div style="font-weight: 700; margin-bottom: 4px">
              {{ idx + 1 }}. {{ chapter.title || "未命名章节" }}
            </div>
            <div class="muted">{{ chapter.lines.join("").length }} 字 · {{ chapter.lines.length }} 行</div>
          </div>
          <span v-if="chapter.isIntro" class="badge">简介</span>
        </div>
      </li>
    </ul>
  </div>
</template>
