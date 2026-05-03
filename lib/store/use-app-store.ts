"use client";

import { create } from "zustand";

type ThemeMode = "light" | "dark";

type AppStore = {
  theme: ThemeMode;
  liveNotifications: number;
  setTheme: (theme: ThemeMode) => void;
  incrementNotifications: () => void;
  clearNotifications: () => void;
};

export const useAppStore = create<AppStore>((set) => ({
  theme: "light",
  liveNotifications: 0,
  setTheme: (theme) => set({ theme }),
  incrementNotifications: () => set((state) => ({ liveNotifications: state.liveNotifications + 1 })),
  clearNotifications: () => set({ liveNotifications: 0 })
}));
