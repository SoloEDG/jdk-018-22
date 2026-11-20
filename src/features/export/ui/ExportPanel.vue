<script setup lang="ts">
import { computed } from "vue";
import { Download, Copy, ArrowUpRight } from "lucide-vue-next";
import { useExport } from "../model/useExport";

const e = useExport();
const summary = computed(() => {
  const grid = e.doc.grid;
  if (!grid) return "文本保留完整字符布局，PNG 保留当前配色。";
  const mode =
    grid.widthMode === "preserve" ? "保留原始字符（双宽占两列）" : "单列安全";
  const repl = grid.replacements.length
    ? `，${grid.replacements.length} 类字符被替换`
    : "";
  const retained = e.retainedReason()
    ? `（${e.retainedReason()}）`
    : "";
  return `${grid.environmentName} · ${mode}${repl}；复制、TXT 与 PNG 使用同一布局${retained}。`;
});
</script>
<template>
  <section class="export-bar">
    <div>
      <span class="eyebrow">READY TO SHARE</span>
      <h3>带走你的字符作品</h3>
      <small>{{ summary }}</small>
    </div>
    <div class="export-actions">
      <button class="secondary" :disabled="!e.ready()" @click="e.copy">
        <Copy :size="15" /> 复制字符</button
      ><button class="secondary" :disabled="!e.ready()" @click="e.png">
        PNG <ArrowUpRight :size="15" /></button
      ><button class="primary" :disabled="!e.ready()" @click="e.saveText">
        <Download :size="16" /> 导出 .TXT
      </button>
    </div>
  </section>
</template>
