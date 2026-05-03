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
  logo_path: string;
  template_id: string;
  created_at: string;
  updated_at: string;
}

export interface UpiId {
  id: number;
  business_id: number;
  label: string;
  upi_id: string;
  upi_name: string;
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
  hsn_sac: string;
  unit: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  business_id: number;
  client_name: string;
  client_address: string;
  client_email: string;
  client_phone: string;
  client_gst: string;
  project_name: string;
  po_number: string;
  place_of_supply: string;
  payment_terms: string;
  date: string;
  due_date: string;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  shipping_charges: number;
  tax_percent: number;
  tax_amount: number;
  total: number;
  currency: string;
  bank_account: string;
  bank_name: string;
  bank_ifsc: string;
  bank_holder: string;
  notes: string;
  status: 'draft' | 'unpaid' | 'paid' | 'cancelled';
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
  business_name?: string;
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
  status?: 'all' | 'draft' | 'paid' | 'unpaid' | 'cancelled';
  business_id?: number;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'date' | 'amount' | 'client';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface CreateInvoiceData {
  business_id: number;
  client_name: string;
  client_address: string;
  client_email: string;
  client_phone: string;
  client_gst: string;
  project_name: string;
  po_number: string;
  place_of_supply: string;
  payment_terms: string;
  date: string;
  due_date: string;
  tax_percent: number;
  discount_percent: number;
  discount_amount: number;
  shipping_charges: number;
  currency: string;
  bank_account: string;
  bank_name: string;
  bank_ifsc: string;
  bank_holder: string;
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
  logo_path?: string;
  template_id?: string;
}

export interface SavedClient {
  id: number;
  business_id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  gst: string;
  created_at: string;
  updated_at: string;
}

export interface AuthData {
  password_hash: string;
  hint: string;
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
    saveLogo: (businessId: number, srcPath: string) => Promise<string>;
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
    exportBackup: (destPath: string) => Promise<{ count: number; total: number; zipPath: string }>;
  };
  finance: {
    getSummary: (year?: number) => Promise<FinanceSummary>;
    getTransactions: (filters?: { type?: string; year?: number; month?: number; business_id?: number }) => Promise<Transaction[]>;
    addExpense: (data: AddExpenseData) => Promise<Transaction>;
    deleteTransaction: (id: number) => Promise<void>;
  };
  settings: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<void>;
    getAll: () => Promise<Record<string, string>>;
    factoryReset: () => Promise<void>;
  };
  upi: {
    getForBusiness: (businessId: number) => Promise<UpiId[]>;
    add: (data: Omit<UpiId, 'id'>) => Promise<UpiId>;
    update: (id: number, data: Partial<Omit<UpiId, 'id'>>) => Promise<UpiId>;
    delete: (id: number) => Promise<void>;
    generateQR: (upiId: string, amount: number, name: string, invoiceNumber: string) => Promise<string>;
    parseUpiId: (upiId: string) => Promise<{ suggested_name: string; vpa: string; bank: string }>;
  };
  auth: {
    isSetup: () => Promise<boolean>;
    setup: (password: string, hint: string) => Promise<void>;
    verify: (password: string) => Promise<boolean>;
    changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
    getHint: () => Promise<string>;
    reset: () => Promise<void>;
  };
  clients: {
    getForBusiness: (businessId: number) => Promise<SavedClient[]>;
    save: (data: Omit<SavedClient, 'id' | 'created_at' | 'updated_at'>) => Promise<SavedClient>;
    update: (id: number, data: Partial<Omit<SavedClient, 'id' | 'created_at' | 'updated_at'>>) => Promise<SavedClient>;
    delete: (id: number) => Promise<void>;
  };
  shell: {
    openPath: (filePath: string) => Promise<void>;
    showInFolder: (filePath: string) => Promise<void>;
    readFile: (filePath: string) => Promise<string | null>;
    pickFile: (options: { title?: string; filters?: Array<{ name: string; extensions: string[] }> }) => Promise<string | null>;
    pickFolder: (title?: string) => Promise<string | null>;
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
