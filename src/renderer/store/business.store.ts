import { create } from 'zustand';
import type { Business } from '@shared/types';

interface BusinessState {
  businesses: Business[];
  activeBusiness: Business | null;
  isLoaded: boolean;
  fetchAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useBusinessStore = create<BusinessState>((set) => ({
  businesses: [],
  activeBusiness: null,
  isLoaded: false,
  fetchAll: async () => {
    const [all, active] = await Promise.all([
      window.electronAPI.business.getAll(),
      window.electronAPI.business.getActive(),
    ]);
    set({ businesses: all, activeBusiness: active, isLoaded: true });
  },
  refresh: async () => {
    const [all, active] = await Promise.all([
      window.electronAPI.business.getAll(),
      window.electronAPI.business.getActive(),
    ]);
    set({ businesses: all, activeBusiness: active });
  },
}));
