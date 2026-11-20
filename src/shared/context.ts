import type { InjectionKey, Ref } from "vue";
import type { StudioDocument } from "./document";
export interface StudioContext {
  doc: StudioDocument;
  busy: Ref<boolean>;
  notice: Ref<string>;
  /** Set when the latest attempt failed and the previous grid was retained. */
  layoutError: Ref<string>;
  invalidate: () => void;
}
export const studioKey: InjectionKey<StudioContext> = Symbol("studio");
