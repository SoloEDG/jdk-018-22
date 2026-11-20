import { reactive, ref, provide, watch } from "vue";
import { createDocument } from "../shared/defaults";
import { studioKey } from "../shared/context";
import { generate } from "../features/mapping";

export function useWorkspace() {
  const doc = reactive(createDocument());
  const busy = ref(false),
    notice = ref("所有处理均在你的浏览器中完成"),
    layoutError = ref("");
  let timer: ReturnType<typeof setTimeout>;
  /** Increases per scheduled generation; stale callbacks are discarded. */
  let generation = 0;

  function invalidate() {
    doc.revision++;
    busy.value = true;
    clearTimeout(timer);
    const ticket = ++generation;
    // Snapshot the layout-defining settings so a pending generation cannot
    // observe a newer environment than the one it measured.
    const snapshot = { ...doc.settings };
    const revision = doc.revision;
    timer = setTimeout(() => {
      if (ticket !== generation) return;
      layoutError.value = "";
      const result = generate({ ...doc, settings: snapshot, revision });
      if (ticket !== generation) return;
      if (result.error || !result.grid) {
        // Keep the previous grid untouched; only surface the reason. The old
        // grid keeps its own measurement id, so nothing is half-updated.
        layoutError.value = result.error ?? "生成失败，已保留上一次结果";
        notice.value = layoutError.value;
      } else {
        doc.grid = result.grid;
        layoutError.value = "";
        const replaced = result.grid.replacements.reduce(
          (n, item) => n + item.occurrences,
          0,
        );
        notice.value = replaced
          ? `已生成 · ${replaced} 个字符被替换`
          : "字符画已同步";
      }
      busy.value = false;
    }, 60);
  }

  watch(
    () => [
      doc.settings.background,
      doc.settings.environment,
      doc.settings.widthMode,
      doc.settings.fontFamily,
    ],
    invalidate,
  );
  provide(studioKey, { doc, busy, notice, layoutError, invalidate });
  return { doc, busy, notice, layoutError };
}
