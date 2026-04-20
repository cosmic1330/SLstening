import { create } from 'zustand';

interface UIState {
  isBottomBarVisible: boolean;
  setBottomBarVisible: (visible: boolean) => void;
}

const useUIStore = create<UIState>((set) => ({
  isBottomBarVisible: true,
  setBottomBarVisible: (visible) => set({ isBottomBarVisible: visible }),
}));

export default useUIStore;
