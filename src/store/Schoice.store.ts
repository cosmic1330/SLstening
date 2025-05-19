import { Store } from "@tauri-apps/plugin-store";
import { nanoid } from "nanoid";
import { create } from "zustand";
import {
  FilterStock,
  PromptItem,
  Prompts,
  PromptsMap,
  PromptType,
  PromptValue,
  TrashPrompt,
} from "../types";

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
  alarms: PromptsMap;
  select: {
    id: string;
    name: string;
    value: PromptValue;
    type: PromptType;
  } | null;
  theme: string;
  sqliteUpdateDate: string;
  chartType: ChartType;
  trash: TrashPrompt[];
  filterStocks?: FilterStock[];
  filterConditions?: Prompts;
  backtestPersent: number;
  addAlarm: (alarm: PromptItem, id: string) => void;
  removeAlarm: (id: string) => void;
  setBacktestPersent: (persent: number) => void;
  addFilterStocks: (
    stocks: FilterStock[] | undefined,
    prompts: Prompts | undefined
  ) => void;
  removeFilterStocks: () => void;
  recover: (id: string) => Promise<void>;
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
  removeFromTrash: (id: string) => void;
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
  alarms: {},
  select: null,
  sqliteUpdateDate: "N/A",
  chartType:
    (localStorage.getItem("slitenting-chartType") as ChartType) ||
    ChartType.WEEKLY_BOLL,
  trash: [],
  filterConditions: undefined,
  filterStocks: undefined,
  backtestPersent: 0,
  addAlarm: async (alarm: PromptItem, id: string) => {
    const store = await Store.load("schoice.json");
    const alarms = get().alarms as PromptsMap;
    const data = {
      ...alarms,
      [id]: alarm,
    };
    set(() => ({
      alarms: data,
    }));
    await store.set("alarms", data);
    await store.save();
  },
  removeAlarm: async (id: string) => {
    const store = await Store.load("schoice.json");
    const alarms = get().alarms as PromptsMap;
    const { [id]: _, ...dataAlarm } = alarms;
    set(() => ({
      alarms: dataAlarm,
    }));
    await store.set("alarms", dataAlarm);
    await store.save();
  },
  setBacktestPersent: (persent: number) => {
    set({ backtestPersent: persent });
  },
  addFilterStocks: async (stocks, prompts) => {
    const store = await Store.load("schoice.json");
    set(() => ({
      filterStocks: stocks,
      filterConditions: prompts,
    }));
    store.set("filterStocks", stocks);
    store.set("filterConditions", prompts);
    await store.save();
  },
  removeFilterStocks: async () => {
    const store = await Store.load("schoice.json");
    set(() => ({
      filterStocks: undefined,
      filterConditions: undefined,
    }));
    store.delete("filterStocks");
    store.delete("filterConditions");
    await store.save();
  },
  recover: async (id: string) => {
    const store = await Store.load("schoice.json");
    const trash = get().trash;
    const index = trash.findIndex((item) => item.id === id);
    if (index !== -1) {
      const { id, type, value } = trash[index];
      switch (type) {
        case PromptType.BULLS:
          set((state) => ({
            bulls: {
              ...state.bulls,
              [id]: value,
            },
          }));
          await store.set("bulls", get().bulls);
          break;
        case PromptType.BEAR:
          set((state) => ({
            bears: {
              ...state.bears,
              [id]: value,
            },
          }));
          await store.set("bears", get().bears);
          break;
        default:
          break;
      }
      trash.splice(index, 1);
      set({ trash });
      await store.set("trash", trash);
      await store.save();
    }
  },
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
        set((state) => ({
          bulls: {
            ...state.bulls,
            [id]: {
              name,
              value: prompts,
            },
          },
        }));
        await store.set("bulls", get().bulls);
        await store.save();
        return id;
      case PromptType.BEAR:
        set((state) => ({
          bears: {
            ...state.bears,
            [id]: {
              name,
              value: prompts,
            },
          },
        }));
        await store.set("bears", get().bears);
        await store.save();
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
        set((state) => {
          return {
            bulls: {
              ...state.bulls,
              [id]: {
                name,
                value: prompts,
              },
            },
          };
        });
        await store.set("bulls", get().bulls);
        await store.save();
        break;
      case PromptType.BEAR:
        set((state) => {
          return {
            bears: {
              ...state.bears,
              [id]: {
                name,
                value: prompts,
              },
            },
          };
        });
        await store.set("bears", get().bears);
        await store.save();
        break;
      default:
        break;
    }
  },
  remove: async (id: string, type: PromptType) => {
    const store = await Store.load("schoice.json");
    switch (type) {
      case PromptType.BULLS:
        const { [id]: bull_value, ...dataBulls } = get().bulls;
        const removeBull = {
          time: Date.now(),
          id,
          type,
          value: bull_value,
        };
        set((state) => {
          return {
            bulls: dataBulls,
            trash: [...state.trash, removeBull],
          };
        });
        await store.set("bulls", get().bulls);
        await store.set("trash", get().trash);
        await store.save();
        break;
      case PromptType.BEAR:
        const { [id]: bear_value, ...dataBears } = get().bears;
        const removeBear = {
          time: Date.now(),
          id,
          type,
          value: bear_value,
        };
        set((state) => {
          return {
            bears: dataBears,
            trash: [...state.trash, removeBear],
          };
        });
        await store.set("bears", get().bears);
        await store.set("trash", get().trash);
        await store.save();
        break;
      default:
        break;
    }
  },
  removeFromTrash: async (id: string) => {
    const store = await Store.load("schoice.json");
    set((state) => {
      return {
        trash: state.trash.filter((item) => item.id !== id),
      };
    });
    await store.set("trash", get().trash);
    await store.save();
  },
  reload: async () => {
    const store = await Store.load("schoice.json");
    const bulls = ((await store.get("bulls")) as PromptsMap) || {};
    const bears = ((await store.get("bears")) as PromptsMap) || {};
    const alarms = ((await store.get("alarms")) as PromptsMap) || {};
    const trash = ((await store.get("trash")) as TrashPrompt[]) || [];
    const filterStocks =
      ((await store.get("filterStocks")) as FilterStock[]) || undefined;
    const filterConditions =
      ((await store.get("filterConditions")) as Prompts) || undefined;
    set(() => ({
      bulls,
      bears,
      alarms,
      trash,
      filterStocks,
      filterConditions,
    }));
  },
  clear: async () => {
    const store = await Store.load("schoice.json");
    await store.delete("bulls");
    await store.delete("bears");
    await store.delete("alarms");
    await store.delete("trash");
    await store.delete("filterStocks");
    await store.delete("filterConditions");
    await store.save();
    set({
      bulls: {},
      bears: {},
      alarms: {},
      trash: [],
      filterStocks: undefined,
      filterConditions: undefined,
    });
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
