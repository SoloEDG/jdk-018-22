<script setup lang="ts">
import { computed } from "vue";
import { SlidersHorizontal, AlertTriangle } from "lucide-vue-next";
import { useStudio } from "../../../shared/useStudio";
import { isGridCurrent } from "../../../shared/grid";
import type { Replacement } from "../../../shared/document";
import { environments, findEnvironment } from "../../typesetting";
import { charsets, glyphs } from "../lib/charsets";
import { planGlyphs } from "../lib/layout";

const { doc, invalidate } = useStudio();

const current = computed(() => isGridCurrent(doc));
/**
 * The strip previews the same planner the generator uses, so a replacement
 * shown here is the one that lands in the grid. Measurement is skipped here;
 * the grid's replacement list remains the authoritative record.
 */
const strip = computed(() => {
  const env = findEnvironment(doc.settings.environment);
  if (!env) return [];
  // When the visible grid is current, its measured replacement list wins over
  // the Unicode prediction, so the strip never promises a glyph the grid
  // actually swapped out.
  const measured = new Map(
    (current.value ? (doc.grid?.replacements ?? []) : []).map((r) => [r.from, r]),
  );
  return planGlyphs(
    glyphs(doc.settings.charset, doc.settings.custom),
    env,
    doc.settings.widthMode,
  ).map((plan) => {
    const actual = measured.get(plan.source);
    const replaced = actual?.to ?? plan.replacement?.to ?? null;
    const reason = actual?.reason ?? plan.replacement?.reason;
    return {
      text: replaced ?? plan.text,
      span: plan.span,
      replaced,
      title: replaced
        ? reason === "zero-width"
          ? `「${plan.source}」是零宽字符，无法单独占位，替换为空白`
          : `「${plan.source}」无法占用一列，替换为「${replaced}」`
        : plan.source,
    };
  });
});
const envUnsupported = computed(() => {
  const env = findEnvironment(doc.settings.environment);
  return Boolean(env && doc.settings.widthMode === "preserve" && !env.supportsWide);
});
/** Choosing an environment declares its typography, so reset the font stack. */
function chooseEnvironment(value: string) {
  const env = findEnvironment(value);
  if (!env) return;
  // Environment and font are one declaration; change both before generating,
  // so no generation sees a new environment with the old font.
  doc.settings.environment = env.id;
  doc.settings.fontFamily = env.fontFamily;
  invalidate();
}
/** The visible grid's list, even when it is a retained previous result. */
const replacements = computed<Replacement[]>(
  () => doc.grid?.replacements ?? [],
);
const replacementTotal = computed(() =>
  replacements.value.reduce((n, item) => n + item.occurrences, 0),
);
function replacementLabel(r: Replacement) {
  return (
    {
      width: "宽度不符",
      "zero-width": "零宽字符",
      overflow: "行末溢出",
    } as Record<string, string>
  )[r.reason];
}
</script>
<template>
  <section class="panel">
    <div class="section-title">
      <span>03 / CHARACTER LAB</span><SlidersHorizontal :size="15" />
    </div>
    <label class="field"
      >字符密度 <b>{{ doc.settings.columns }} 屏幕列</b
      ><input
        aria-label="字符密度"
        type="range"
        min="30"
        max="220"
        step="1"
        v-model.number="doc.settings.columns"
        @input="invalidate"
    /></label>
    <div class="range-ends"><span>疏朗</span><span>精细</span></div>
    <label class="field"
      >目标显示环境<select
        aria-label="目标显示环境"
        :value="doc.settings.environment"
        @change="chooseEnvironment(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="env in environments" :key="env.id" :value="env.id">
          {{ env.name }}
        </option>
      </select></label
    >
    <small class="hint">
      {{
        environments.find((e) => e.id === doc.settings.environment)?.detail
      }}
    </small>
    <label class="field"
      >字体栈<input
        aria-label="字体栈"
        class="custom"
        v-model="doc.settings.fontFamily"
    /></label>
    <div class="field">
      宽度安全策略
      <div class="segmented" role="radiogroup" aria-label="宽度安全策略">
        <button
          role="radio"
          :aria-checked="doc.settings.widthMode === 'safe'"
          :class="{ active: doc.settings.widthMode === 'safe' }"
          @click="doc.settings.widthMode = 'safe'"
        >
          单列安全
        </button>
        <button
          role="radio"
          :aria-checked="doc.settings.widthMode === 'preserve'"
          :class="{ active: doc.settings.widthMode === 'preserve' }"
          @click="doc.settings.widthMode = 'preserve'"
        >
          保留原始字符
        </button>
      </div>
    </div>
    <small class="hint">
      {{
        doc.settings.widthMode === "safe"
          ? "无法占据一列的字符会被替换为同色阶的单列占位符，并列出替换清单。"
          : "保留原始字符簇，双宽字符占用两列真实网格，行末不会覆盖后续列。"
      }}
    </small>
    <label class="field"
      >字符集<select
        aria-label="字符集"
        v-model="doc.settings.charset"
        @change="invalidate"
      >
        <option v-for="c in charsets" :key="c.id" :value="c.id">
          {{ c.name }}
        </option>
        <option value="custom">自定义字符集</option>
      </select></label
    ><input
      v-if="doc.settings.charset === 'custom'"
      aria-label="自定义字符"
      class="custom"
      maxlength="100"
      v-model="doc.settings.custom"
      @input="invalidate"
    />
    <div
      v-if="envUnsupported"
      class="hint env-warning"
      data-testid="env-warning"
    >
      该环境的宽度规则不支持双宽占位；切换到「单列安全」，或换一个支持双宽的环境。
    </div>
    <div class="glyph-strip" aria-label="字符集预览">
      <span
        v-for="(item, i) in strip"
        :key="i"
        class="glyph-cell"
        :class="{ replaced: item.replaced !== null }"
        :style="{ width: item.span + 'ch' }"
        :title="item.title"
        >{{ item.text }}</span
      >
    </div>
    <div
      v-if="replacements.length"
      class="replacement-list"
      data-testid="replacement-list"
    >
      <div class="replacement-title">
        <AlertTriangle :size="12" /> 已替换字符（{{
          replacements.length
        }}
        类 / {{ replacementTotal }} 个）
        <span class="muted">
          {{
            doc.grid?.widthMode === "safe" ? "单列占位" : "行末双宽字符"
          }}{{ current ? "" : " · 上一版结果" }}
        </span>
      </div>
      <ul>
        <li v-for="(r, i) in replacements" :key="i">
          <code>{{ r.from }}</code> → <code>{{ r.to }}</code>
          <span class="muted"
            >{{ r.width }} 列 · {{ replacementLabel(r) }} ×{{ r.occurrences }}</span
          >
        </li>
      </ul>
    </div>
    <label class="field"
      >对比度 <b>{{ doc.settings.contrast.toFixed(2) }}</b><input
        aria-label="对比度"
        type="range"
        min="0.3"
        max="2.5"
        step="0.05"
        v-model.number="doc.settings.contrast"
        @input="invalidate" /></label
    ><label class="field"
      >伽马 <b>{{ doc.settings.gamma.toFixed(2) }}</b><input
        aria-label="伽马"
        type="range"
        min="0.3"
        max="2.5"
        step="0.05"
        v-model.number="doc.settings.gamma"
        @input="invalidate" /></label
    ><label class="toggle-row"
      ><span>反转明暗</span
      ><input
        aria-label="反转明暗"
        type="checkbox"
        v-model="doc.settings.invert"
        @change="invalidate"
    /></label>
  </section>
</template>
