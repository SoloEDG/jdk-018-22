<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import type { Grid } from "../../../shared/document";
import { CELL_HEIGHT, CELL_WIDTH } from "../../../shared/metrics";
import { drawGrid } from "../lib/draw";

const props = defineProps<{
  grid: Grid;
  color: boolean;
  background: string;
  zoom: number;
}>();
const canvas = ref<HTMLCanvasElement>();
function draw() {
  if (canvas.value)
    drawGrid(canvas.value, props.grid, props.color, props.background);
}
onMounted(draw);
watch(() => [props.grid, props.color, props.background], draw);
</script>
<template>
  <canvas
    ref="canvas"
    aria-label="字符画预览"
    :style="{
      width: (grid.columns * CELL_WIDTH * zoom) / 100 + 'px',
      height: (grid.rows * CELL_HEIGHT * zoom) / 100 + 'px',
    }"
  />
</template>
