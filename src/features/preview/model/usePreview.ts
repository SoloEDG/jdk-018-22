import { ref, computed } from "vue";
import { useStudio } from "../../../shared/useStudio";
import { logicalGlyphCount } from "../../../shared/grid";

export function usePreview() {
  const { doc, busy, layoutError } = useStudio();
  const mode = ref<"art" | "text">("art");
  const zoom = ref(100);
  const count = computed(() =>
    doc.grid ? logicalGlyphCount(doc.grid).toLocaleString() : "0",
  );
  const status = computed(() => {
    if (busy.value) return "生成中";
    if (layoutError.value) return "已保留上一次结果";
    if (doc.grid?.revision === doc.revision) return "已同步";
    return "待重新生成";
  });
  return { doc, busy, layoutError, mode, zoom, count, status };
}
