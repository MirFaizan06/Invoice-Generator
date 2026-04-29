export interface Business {
  id: number;
  name: string;
  owner_name: string;
  address: string;
  phone: string;
  email: string;
  gst: string;
  pan: string;
  cin: string;
  invoice_prefix: string;
  default_tax: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpiId {
  id: number;
  business_id: number;
  label: string;
  upi_id: string;
  is_primary: boolean;
}

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  title: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  order_index: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  business_id: number;
  client_name: string;
  client_address: string;
  client_email: string;
  client_phone: string;
  project_name: string;
  date: string;
  due_date: string;
  subtotal: number;
  tax_percent: number;
  tax_amount: number;
  total: number;
  notes: string;
  status: 'unpaid' | 'paid' | 'cancelled';
  html_path: string;
  pdf_path: string;
  items?: InvoiceItem[];
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  invoice_id: number | null;
  business_id: number;
  type: 'revenue' | 'expense';
  amount: number;
  description: string;
  date: string;
  created_at: string;
}

export interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface FinanceSummary {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  invoice_count: number;
  paid_count: number;
  unpaid_count: number;
  monthly_data: MonthlyData[];
}

export interface InvoiceFilters {
  search?: string;
  status?: 'all' | 'paid' | 'unpaid' | 'cancelled';
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'date' | 'amount' | 'client';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateInvoiceData {
  business_id: number;
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

export interface CreateBusinessData {
  name: string;
  owner_name: string;
  address: string;
  phone: string;
  email: string;
  gst: string;
  pan: string;
  cin: string;
  invoice_prefix: string;
  default_tax: number;
}

export interface AddExpenseData {
  business_id: number;
  amount: number;
  description: string;
  date: string;
}

export interface ElectronAPI {
  business: {
    getAll: () => Promise<Business[]>;
    getActive: () => Promise<Business | null>;
    create: (data: CreateBusinessData) => Promise<Business>;
    update: (id: number, data: Partial<CreateBusinessData>) => Promise<Business>;
    delete: (id: number) => Promise<void>;
    setActive: (id: number) => Promise<void>;
  };
  invoice: {
    getAll: (filters?: InvoiceFilters) => Promise<Invoice[]>;
    getById: (id: number) => Promise<Invoice | null>;
    create: (data: CreateInvoiceData) => Promise<Invoice>;
    update: (id: number, data: Partial<CreateInvoiceData>) => Promise<Invoice>;
    delete: (id: number) => Promise<void>;
    markPaid: (id: number) => Promise<void>;
    markUnpaid: (id: number) => Promise<void>;
    duplicate: (id: number) => Promise<Invoice>;
    generatePDF: (id: number) => Promise<string>;
    getNextNumber: (businessId: number) => Promise<string>;
  };
  finance: {
    getSummary: (year?: number) => Promise<FinanceSummary>;
    getTransactions: (filters?: { type?: string; year?: number; month?: number }) => Promise<Transaction[]>;
    addExpense: (data: AddExpenseData) => Promise<Transaction>;
    deleteTransaction: (id: number) => Promise<void>;
  };
  settings: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<void>;
    getAll: () => Promise<Record<string, string>>;
  };
  upi: {
    getForBusiness: (businessId: number) => Promise<UpiId[]>;
    add: (data: Omit<UpiId, 'id'>) => Promise<UpiId>;
    update: (id: number, data: Partial<Omit<UpiId, 'id'>>) => Promise<UpiId>;
    delete: (id: number) => Promise<void>;
    generateQR: (upiId: string, amount: number, name: string, invoiceNumber: string) => Promise<string>;
  };
  shell: {
    openPath: (filePath: string) => Promise<void>;
    showInFolder: (filePath: string) => Promise<void>;
    readFile: (filePath: string) => Promise<string | null>;
  };
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
