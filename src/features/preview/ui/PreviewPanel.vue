<script setup lang="ts">
import { computed } from "vue";
import { Code2, Scan, Minus, Plus } from "lucide-vue-next";
import { usePreview } from "../model/usePreview";
import { gridText } from "../../../shared/grid";
import ArtCanvas from "./ArtCanvas.vue";

const p = usePreview();
const text = computed(() => (p.doc.grid ? gridText(p.doc.grid) : ""));
</script>
<template>
  <main class="workspace">
    <div class="preview-toolbar">
      <div class="tabs">
        <button
          :class="{ active: p.mode.value === 'art' }"
          @click="p.mode.value = 'art'"
        >
          <Scan :size="14" /> 字符预览</button
        ><button
          :class="{ active: p.mode.value === 'text' }"
          @click="p.mode.value = 'text'"
        >
          <Code2 :size="14" /> 纯文本
        </button>
      </div>
      <label class="color-toggle"
        ><span class="color-dot" /> 彩色<input
          aria-label="彩色预览"
          type="checkbox"
          v-model="p.doc.settings.color"
      /></label>
    </div>
    <div class="art-stage">
      <div class="stage-label">OUTPUT / LIVE RENDER <span>●</span></div>
      <div class="art-scroll">
        <ArtCanvas
          v-if="p.doc.grid && p.mode.value === 'art'"
          :grid="p.doc.grid"
          :color="p.doc.settings.color"
          :background="p.doc.settings.background"
          :zoom="p.zoom.value"
        />
        <pre
          v-else-if="p.doc.grid"
          data-testid="text-preview"
          :style="{
            fontFamily: p.doc.grid.fontFamily,
            fontSize: (14 * p.zoom.value) / 100 + 'px',
            lineHeight: (16 * p.zoom.value) / 100 + 'px',
          }"
          >{{ text }}</pre>
        <span v-else>正在准备字符画…</span>
      </div>
      <p
        v-if="p.layoutError.value && p.doc.grid"
        class="stage-notice"
        role="status"
        data-testid="layout-error"
      >
        {{ p.layoutError.value }}
      </p>
      <div class="stage-corner">
        {{ p.doc.grid?.columns }} COL × {{ p.doc.grid?.rows }} ROW ·
        {{ p.doc.grid?.widthMode === "preserve" ? "原始字符" : "单列安全" }}
        <template v-if="p.doc.grid"> · {{ p.doc.grid.environmentName }}</template>
      </div>
    </div>
    <div class="preview-bottom">
      <span class="mono"
        ><i class="status-dot" :class="{ warn: p.layoutError.value }" />{{
          p.status.value
        }}
        <span class="muted">/ {{ p.count.value }} 个逻辑字符</span></span
      >
      <div class="zoom">
        <button
          aria-label="缩小"
          @click="p.zoom.value = Math.max(25, p.zoom.value - 25)"
        >
          <Minus :size="14" /></button
        ><span>{{ p.zoom.value }}%</span
        ><button
          aria-label="放大"
          @click="p.zoom.value = Math.min(200, p.zoom.value + 25)"
        >
          <Plus :size="14" />
        </button>
      </div>
    </div>
    <div class="workspace-note">
      <span>从像素，到字符。</span
      ><small>每一个符号，都是光影的另一种表达。</small
      ><span class="note-symbol">{ Aa }</span>
    </div>
  </main>
</template>
