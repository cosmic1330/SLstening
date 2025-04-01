import { Store } from "@tauri-apps/plugin-store";
import { nanoid } from "nanoid";
import { create } from "zustand";
import { PromptsMap, PromptType, PromptValue } from "../types";

export enum ChartType {
  HOURLY_OBV = "小時OBV",
  HOURLY_KD = "小時KD",
  HOURLY_RSI = "小時RSI",
  HOURLY_OSC = "小時OSC",
  HOURLY_BOLL = "小時BOLL",
  DAILY_OBV = "日OBV",
  DAILY_KD = "日KD",
  DAILY_RSI = "日RSI",
  DAILY_OSC = "日OSC",
  DAILY_BOLL = "日BOLL",
  WEEKLY_KD = "週KD",
  WEEKLY_OBV = "週OBV",
  WEEKLY_RSI = "週RSI",
  WEEKLY_BOLL = "週BOLL",
  WEEKLY_OSC = "週OSC",
}

interface SchoiceState {
  dataCount: number;
  using: PromptType;
  todayDate: number;
  bulls: PromptsMap;
  bears: PromptsMap;
  select: {
    id: string;
    name: string;
    value: PromptValue;
    type: PromptType;
  } | null;
  theme: string;
  sqliteUpdateDate: string;
  chartType: ChartType;
  changeChartType: (type: ChartType) => void;
  changeSqliteUpdateDate: (date: string) => void;
  changeTheme: (theme: string) => void;
  changeDataCount: (count: number) => void;
  changeUsing: (type: PromptType) => void;
  increase: (
    name: string,
    prompts: PromptValue,
    type: PromptType
  ) => Promise<string | undefined>;
  edit: (
    id: string,
    name: string,
    prompts: PromptValue,
    type: PromptType
  ) => void;
  remove: (name: string, type: PromptType) => void;
  reload: () => void;
  clear: () => void;
  clearSeleted: () => void;
  selectObj: (id: string, type: PromptType) => void;
  changeTodayDate: (date: number) => void;
}

const useSchoiceStore = create<SchoiceState>((set, get) => ({
  dataCount: 0,
  using: PromptType.BULLS,
  todayDate: 0,
  theme: localStorage.getItem("slitenting-theme") || "",
  bulls: {},
  bears: {},
  select: null,
  sqliteUpdateDate: "N/A",
  chartType:
    (localStorage.getItem("slitenting-chartType") as ChartType) ||
    ChartType.WEEKLY_BOLL,
  changeChartType: (type: ChartType) => {
    localStorage.setItem("slitenting-chartType", type);
    set({ chartType: type });
  },
  changeSqliteUpdateDate: (date: string) => {
    set({ sqliteUpdateDate: date });
  },
  changeTheme: (theme: string) => {
    localStorage.setItem("slitenting-theme", theme);
    set({ theme });
  },
  changeDataCount: (count: number) => {
    set({ dataCount: count });
  },
  changeUsing: (type: PromptType) => {
    set({ using: type });
  },
  increase: async (name: string, prompts: PromptValue, type: PromptType) => {
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
    prompts: PromptValue,
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
    const bulls = ((await store.get("bulls")) as PromptsMap) || {};
    const bears = ((await store.get("bears")) as PromptsMap) || {};
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
  clearSeleted: () => {
    set({ select: null });
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
