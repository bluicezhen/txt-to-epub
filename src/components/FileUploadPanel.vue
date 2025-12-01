<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  detectedEncoding: string;
  usedEncoding: string;
  busy?: boolean;
}>();

const emit = defineEmits<{
  (e: "parse", payload: { file: File; encoding: string | "auto" }): void;
}>();

const encodingOptions = [
  { label: "自动检测", value: "auto" },
  { label: "UTF-8", value: "utf-8" },
  { label: "GB18030 / GBK", value: "gb18030" },
  { label: "Big5", value: "big5" },
];
const allowedValues = new Set(encodingOptions.map((item) => item.value));

const encodingChoice = ref<string | "auto">("auto");
const selectedFile = ref<File | null>(null);
const fileName = ref("");

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  selectedFile.value = file ?? null;
  fileName.value = file?.name ?? "";
}

function handleParse() {
  if (!selectedFile.value) {
    alert("请先选择 txt 文件");
    return;
  }
  emit("parse", { file: selectedFile.value, encoding: encodingChoice.value });
}

watch(
  () => props.detectedEncoding,
  (next) => {
    if (next && encodingChoice.value === "auto" && allowedValues.has(next)) {
      encodingChoice.value = next;
    }
  },
);
</script>

<template>
  <div class="card">
    <div class="flex-between">
      <h2 class="section-title">上传 TXT</h2>
      <span class="muted">所有处理均在本地浏览器完成，文件不出本机，保护隐私</span>
    </div>
    <div class="grid" style="gap: 12px">
      <label class="muted" style="display: block">
        选择文件
        <input class="input" type="file" accept=".txt,text/plain" @change="onFileChange" />
      </label>
      <div class="flex-between" style="align-items: flex-start; gap: 12px">
        <div class="muted">
          <div>当前文件：<strong>{{ fileName || "未选择" }}</strong></div>
          <div>检测编码：<strong>{{ detectedEncoding || "未知" }}</strong> / 实际使用：{{ usedEncoding || "待解析" }}</div>
        </div>
        <div class="flex" style="align-items: center; flex-wrap: wrap; gap: 8px">
          <label class="muted">编码：</label>
          <select v-model="encodingChoice" class="input" style="width: 160px">
            <option v-for="item in encodingOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
          <button class="primary-btn" :disabled="busy" @click="handleParse">
            {{ busy ? "解析中…" : "读取并解析" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
