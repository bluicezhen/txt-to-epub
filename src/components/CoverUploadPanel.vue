<script setup lang="ts">
import { ref } from "vue";
import type { Cover } from "../types";

const props = defineProps<{
  fileName: string | null;
  previewUrl: string | null;
  busy?: boolean;
}>();

const emit = defineEmits<{
  (e: "select", payload: { cover: Cover; previewUrl: string }): void;
  (e: "clear"): void;
}>();

const allowedTypes = ["image/jpeg", "image/png"];
const maxSize = 5 * 1024 * 1024;
const error = ref("");

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  error.value = "";

  if (file.size > maxSize) {
    error.value = "图片过大，请选择不超过 5MB 的文件";
    input.value = "";
    return;
  }

  const mimeType = file.type || "image/jpeg";
  if (!allowedTypes.includes(mimeType)) {
    error.value = "仅支持 JPG 或 PNG 图片";
    input.value = "";
    return;
  }

  try {
    const data = await file.arrayBuffer();
    const previewUrl = URL.createObjectURL(file);
    emit("select", {
      cover: {
        data,
        mimeType,
        fileName: file.name || "cover",
      },
      previewUrl,
    });
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    input.value = "";
  }
}

function handleClear() {
  emit("clear");
  error.value = "";
}
</script>

<template>
  <div class="card">
    <div class="flex-between" style="align-items: center">
      <h3 class="section-title">封面图片（可选）</h3>
      <button v-if="previewUrl || fileName" class="ghost-btn" type="button" :disabled="busy" @click="handleClear">
        清除封面
      </button>
    </div>
    <div class="grid" style="gap: 12px">
      <div class="muted">
        <div>支持 JPG / PNG，建议尺寸 1400x2100 左右，大小 &lt; 5MB。</div>
        <div>当前封面：<strong>{{ fileName || "未选择" }}</strong></div>
      </div>
      <div class="flex" style="gap: 12px; align-items: center; flex-wrap: wrap">
        <input class="input" type="file" accept="image/jpeg,image/png" :disabled="busy" @change="handleFileChange" />
        <div v-if="previewUrl" style="display: flex; align-items: center; gap: 8px">
          <div class="muted">预览：</div>
          <img
            :src="previewUrl"
            alt="封面预览"
            style="height: 120px; width: auto; border-radius: 4px; box-shadow: 0 0 0 1px #e5e7eb;"
          />
        </div>
      </div>
      <div v-if="error" class="error">{{ error }}</div>
    </div>
  </div>
</template>
