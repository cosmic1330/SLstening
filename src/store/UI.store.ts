import { create } from 'zustand';

interface UIState {
  isBottomBarVisible: boolean;
  setBottomBarVisible: (visible: boolean) => void;
  stockBoxChartType: "tick" | "mak";
  setStockBoxChartType: (type: "tick" | "mak") => void;
}

const useUIStore = create<UIState>((set) => ({
  isBottomBarVisible: true,
  setBottomBarVisible: (visible) => set({ isBottomBarVisible: visible }),
  stockBoxChartType: (localStorage.getItem("slitenting-stockbox-chart") as "tick" | "mak") || "tick",
  setStockBoxChartType: (type) => {
    localStorage.setItem("slitenting-stockbox-chart", type);
    set({ stockBoxChartType: type });
  },
}));

export default useUIStore;
