import { create } from 'zustand';
import type { LegalDocument, DocType } from '@shared/types';

interface DocumentStoreState {
  documents: LegalDocument[];
  isLoaded: boolean;
  fetchAll: (filters?: { businessId?: number; clientId?: number; projectId?: number; docType?: DocType }) => Promise<void>;
  refresh: (filters?: { businessId?: number; clientId?: number; projectId?: number; docType?: DocType }) => Promise<void>;
}

export const useDocumentStore = create<DocumentStoreState>((set) => ({
  documents: [],
  isLoaded: false,
  fetchAll: async (filters) => {
    const documents = await window.electronAPI.document.getAll(filters);
    set({ documents, isLoaded: true });
  },
  refresh: async (filters) => {
    const documents = await window.electronAPI.document.getAll(filters);
    set({ documents });
  },
}));
