import { create } from "zustand";

const DEBUG_MODE_STORAGE_KEY = "slitenting-debugMode";
const getStorage = () => typeof globalThis.localStorage === "undefined" ? undefined : globalThis.localStorage;

interface DebugState {
  counts: {
    wtx: number;
    twse: number;
    nasdaq: number;
    otc: number;
    conditional: number;
  };
  isVisible: boolean;
  activeInstanceCounts: number;
  increment: (key: keyof DebugState["counts"]) => void;
  toggleVisibility: () => void;
  updateActiveInstances: (delta: number) => void;
}

const useDebugStore = create<DebugState>((set) => ({
  counts: {
    wtx: 0,
    twse: 0,
    nasdaq: 0,
    otc: 0,
    conditional: 0,
  },
  isVisible: getStorage()?.getItem(DEBUG_MODE_STORAGE_KEY) === "true",
  activeInstanceCounts: 0,
  increment: (key) =>
    set((state) => ({
      counts: {
        ...state.counts,
        [key]: state.counts[key] + 1,
      },
    })),
  toggleVisibility: () =>
    set((state) => {
      const nextVisible = !state.isVisible;
      getStorage()?.setItem(DEBUG_MODE_STORAGE_KEY, nextVisible.toString());
      return { isVisible: nextVisible };
    }),
  updateActiveInstances: (delta) =>
    set((state) => ({
      activeInstanceCounts: Math.max(0, state.activeInstanceCounts + delta),
    })),
}));

export default useDebugStore;
