import { Store } from "@tauri-apps/plugin-store";
import { nanoid } from "nanoid";
import { create } from "zustand";

export type Prompt = {
  day1: string;
  indicator1: string;
  operator: string;
  day2: string;
  indicator2: string;
};
export enum PromptType {
  BULLS = "bulls",
  BEAR = "bear",
}
export type Prompts = Prompt[];
export type PromptsObj = {
  name: string;
  value: {
    daily: Prompts;
    weekly: Prompts;
  };
};
type PromptsObjs = {
  [key: string]: PromptsObj;
};

interface SchoiceState {
  dataCount: number;
  using: PromptType;
  todayDate: number;
  bulls: PromptsObjs;
  bears: PromptsObjs;
  select: {
    id: string;
    name: string;
    value: {
      daily: Prompts;
      weekly: Prompts;
    };
    type: PromptType;
  } | null;
  theme: string;
  sqliteUpdateDate: string;
  changeSqliteUpdateDate: (date: string) => void;
  changeTheme: (theme: string) => void
  changeDataCount: (count: number) => void;
  changeUsing: (type: PromptType) => void;
  increase: (
    name: string,
    prompts: { daily: Prompts; weekly: Prompts },
    type: PromptType
  ) => Promise<string | undefined>;
  edit: (
    id: string,
    name: string,
    prompts: { daily: Prompts; weekly: Prompts },
    type: PromptType
  ) => void;
  remove: (name: string, type: PromptType) => void;
  reload: () => void;
  clear: () => void;
  selectObj: (id: string, type: PromptType) => void;
  changeTodayDate: (date: number) => void;
}

const useSchoiceStore = create<SchoiceState>((set, get) => ({
  dataCount: parseInt(localStorage.getItem("slitenting-dataCount") || "0"),
  using: PromptType.BULLS,
  todayDate: 0,
  theme: localStorage.getItem("slitenting-theme") || "",
  bulls: {},
  bears: {},
  select: null,
  sqliteUpdateDate: localStorage.getItem("slitenting-sqliteUpdateDate") || "N/A",
  changeSqliteUpdateDate: (date: string) => {
    localStorage.setItem("slitenting-sqliteUpdateDate", date);
    set({ sqliteUpdateDate: date });
  },
  changeTheme: (theme: string) => {
    localStorage.setItem("slitenting-theme", theme);
    set({ theme });
  },
  changeDataCount: (count: number) => {
    localStorage.setItem("slitenting-dataCount", count.toString());
    set({ dataCount: count });
  },
  changeUsing: (type: PromptType) => {
    set({ using: type });
  },
  increase: async (
    name: string,
    prompts: { daily: Prompts; weekly: Prompts },
    type: PromptType
  ) => {
    const store = await Store.load("schoice.json");
    const id = nanoid();
    switch (type) {
      case PromptType.BULLS:
        const uniqueDataBulls = {
          ...get().bulls,
          [id]: {
            name,
            value: prompts,
          },
        };
        await store.set("bulls", uniqueDataBulls);
        await store.save();
        set(() => ({
          bulls: uniqueDataBulls,
        }));
        return id;
      case PromptType.BEAR:
        const uniqueDataBears = {
          ...get().bears,
          [id]: {
            name,
            value: prompts,
          },
        };
        await store.set("bears", uniqueDataBears);
        await store.save();
        set(() => ({
          bears: uniqueDataBears,
        }));
        return id;
      default:
        return undefined;
    }
  },
  edit: async (
    id: string,
    name: string,
    prompts: { daily: Prompts; weekly: Prompts },
    type: PromptType
  ) => {
    const store = await Store.load("schoice.json");
    switch (type) {
      case PromptType.BULLS:
        const uniqueDataBulls = {
          ...get().bulls,
          [id]: {
            name,
            value: prompts,
          },
        };
        await store.set("bulls", uniqueDataBulls);
        await store.save();
        set(() => {
          return {
            bulls: uniqueDataBulls,
          };
        });
        break;
      case PromptType.BEAR:
        const uniqueDataBears = {
          ...get().bears,
          [id]: {
            name,
            value: prompts,
          },
        };
        await store.set("bears", uniqueDataBears);
        await store.save();
        set(() => {
          return {
            bears: uniqueDataBears,
          };
        });
        break;
      default:
        break;
    }
  },
  remove: async (id: string, type: PromptType) => {
    const store = await Store.load("schoice.json");
    switch (type) {
      case PromptType.BULLS:
        const { [id]: _, ...dataBulls } = get().bulls;
        await store.set("bulls", dataBulls);
        await store.save();
        set(() => {
          return {
            bulls: dataBulls,
          };
        });
        break;
      case PromptType.BEAR:
        const { [id]: __, ...dataBears } = get().bears;
        await store.set("bears", dataBears);
        await store.save();
        set(() => {
          return {
            bears: dataBears,
          };
        });
        break;
      default:
        break;
    }
  },
  reload: async () => {
    const store = await Store.load("schoice.json");
    const bulls = ((await store.get("bulls")) as PromptsObjs) || {};
    const bears = ((await store.get("bears")) as PromptsObjs) || {};
    await store.save();
    set(() => ({ bulls, bears }));
  },
  clear: async () => {
    const store = await Store.load("schoice.json");
    await store.delete("bulls");
    await store.delete("bears");
    await store.save();
    set({ bulls: {}, bears: {} });
  },
  selectObj: (id: string, type: PromptType) => {
    switch (type) {
      case PromptType.BULLS:
        const selectBulls = get().bulls[id];
        set({
          select: {
            id,
            type,
            name: selectBulls.name,
            value: selectBulls.value,
          },
        });
        break;
      case PromptType.BEAR:
        const selectBears = get().bears[id];
        set({
          select: {
            id,
            type,
            name: selectBears.name,
            value: selectBears.value,
          },
        });
        break;
      default:
        break;
    }
  },
  changeTodayDate: (date: number) => {
    set({ todayDate: date });
  },
}));

export default useSchoiceStore;
