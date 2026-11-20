import { useStudio } from "../../../shared/useStudio";
import { isGridCurrent } from "../../../shared/grid";
import { textContent } from "../lib/text";
import { download, exportName } from "../lib/download";
import { drawGrid } from "../../preview";

export function useExport() {
  const { doc, notice, busy } = useStudio();

  /**
   * A retained previous grid is still a complete, self-consistent layout:
   * its width mode, font and replacements travel with it. Exporting it is
   * therefore safe even after a failed environment switch, as long as no
   * regeneration is in flight.
   */
  function ready() {
    return Boolean(doc.grid) && !busy.value;
  }

  /** Non-empty when the visible grid predates the current settings. */
  function retainedReason() {
    if (!doc.grid) return "";
    if (isGridCurrent(doc)) return "";
    return "当前设置未能生效，将导出上一版结果";
  }

  function saveText() {
    if (!ready()) return;
    download(
      new Blob([textContent(doc.grid!)], { type: "text/plain;charset=utf-8" }),
      exportName(doc.asset?.name ?? "art", "txt"),
    );
    notice.value =
      doc.grid!.widthMode === "preserve"
        ? "文本已导出（保留原始字符与完整尾部空白）"
        : "文本已导出";
  }

  async function copy() {
    if (!ready()) return;
    try {
      await navigator.clipboard.writeText(textContent(doc.grid!));
      notice.value =
        doc.grid!.widthMode === "preserve"
          ? "已复制原始字符布局（含尾部空白）"
          : "字符画已复制";
    } catch {
      notice.value = "无法访问剪贴板，请使用文本导出";
    }
  }

  function png() {
    if (!ready()) return;
    const c = document.createElement("canvas");
    drawGrid(c, doc.grid!, doc.settings.color, doc.settings.background);
    c.toBlob((b) => {
      if (b) download(b, exportName(doc.asset?.name ?? "art", "png"));
    }, "image/png");
  }

  return { doc, busy, ready, retainedReason, saveText, copy, png };
}
