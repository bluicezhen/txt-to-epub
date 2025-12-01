<script setup lang="ts">
import type { BookMeta, Language } from "../types";

const props = defineProps<{
  meta: BookMeta;
}>();

const emit = defineEmits<{
  (e: "update:meta", meta: BookMeta): void;
}>();

function updateField(key: keyof BookMeta, value: string | Language) {
  emit("update:meta", { ...props.meta, [key]: value });
}
</script>

<template>
  <div class="card">
    <h3 class="section-title">书籍元信息</h3>
    <div class="grid" style="gap: 12px">
      <label class="muted">
        书名
        <input
          class="input"
          type="text"
          :value="meta.title"
          placeholder="默认使用文件名"
          @input="updateField('title', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="muted">
        作者
        <input
          class="input"
          type="text"
          :value="meta.author"
          placeholder="可选"
          @input="updateField('author', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="muted">
        语言
        <select
          class="input"
          :value="meta.language"
          @change="updateField('language', ($event.target as HTMLSelectElement).value as Language)"
        >
          <option value="zh-CN">简体中文</option>
          <option value="en">English</option>
        </select>
      </label>
    </div>
  </div>
</template>
