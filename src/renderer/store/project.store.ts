import { create } from 'zustand';
import type { Project } from '@shared/types';

interface ProjectStoreState {
  projects: Project[];
  isLoaded: boolean;
  fetchForBusiness: (businessId: number) => Promise<void>;
  refresh: (businessId: number) => Promise<void>;
}

export const useProjectStore = create<ProjectStoreState>((set) => ({
  projects: [],
  isLoaded: false,
  fetchForBusiness: async (businessId) => {
    const projects = await window.electronAPI.project.getForBusiness(businessId);
    set({ projects, isLoaded: true });
  },
  refresh: async (businessId) => {
    const projects = await window.electronAPI.project.getForBusiness(businessId);
    set({ projects });
  },
}));
