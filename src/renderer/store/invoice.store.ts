import { create } from 'zustand';
import type { InvoiceItem } from '@shared/types';

interface DraftInvoice {
  client_name: string;
  client_address: string;
  client_email: string;
  client_phone: string;
  project_name: string;
  date: string;
  due_date: string;
  tax_percent: number;
  notes: string;
  items: Omit<InvoiceItem, 'id' | 'invoice_id'>[];
}

interface InvoiceStoreState {
  draft: DraftInvoice;
  editingId: number | null;
  setDraft: (data: Partial<DraftInvoice>) => void;
  setItem: (index: number, item: Partial<Omit<InvoiceItem, 'id' | 'invoice_id'>>) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  reset: () => void;
  setEditingId: (id: number | null) => void;
}

const defaultItem = (): Omit<InvoiceItem, 'id' | 'invoice_id'> => ({
  title: '',
  description: '',
  quantity: 1,
  unit_price: 0,
  amount: 0,
  order_index: 0,
});

const defaultDraft = (): DraftInvoice => ({
  client_name: '',
  client_address: '',
  client_email: '',
  client_phone: '',
  project_name: '',
  date: new Date().toISOString().split('T')[0],
  due_date: '',
  tax_percent: 18,
  notes: '',
  items: [defaultItem()],
});

export const useInvoiceStore = create<InvoiceStoreState>((set) => ({
  draft: defaultDraft(),
  editingId: null,
  setDraft: (data) => set((s) => ({ draft: { ...s.draft, ...data } })),
  setItem: (index, item) =>
    set((s) => {
      const items = [...s.draft.items];
      items[index] = { ...items[index], ...item };
      if (item.quantity !== undefined || item.unit_price !== undefined) {
        const qty = item.quantity ?? items[index].quantity;
        const price = item.unit_price ?? items[index].unit_price;
        items[index].amount = parseFloat((qty * price).toFixed(2));
      }
      return { draft: { ...s.draft, items } };
    }),
  addItem: () =>
    set((s) => ({
      draft: {
        ...s.draft,
        items: [...s.draft.items, { ...defaultItem(), order_index: s.draft.items.length }],
      },
    })),
  removeItem: (index) =>
    set((s) => ({
      draft: {
        ...s.draft,
        items: s.draft.items.filter((_, i) => i !== index).map((item, i) => ({ ...item, order_index: i })),
      },
    })),
  reset: () => set({ draft: defaultDraft(), editingId: null }),
  setEditingId: (id) => set({ editingId: id }),
}));
