import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  business: {
    getAll: () => ipcRenderer.invoke('business:getAll'),
    getActive: () => ipcRenderer.invoke('business:getActive'),
    create: (data: unknown) => ipcRenderer.invoke('business:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('business:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('business:delete', id),
    setActive: (id: number) => ipcRenderer.invoke('business:setActive', id),
  },
  invoice: {
    getAll: (filters?: unknown) => ipcRenderer.invoke('invoice:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('invoice:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('invoice:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('invoice:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('invoice:delete', id),
    markPaid: (id: number) => ipcRenderer.invoke('invoice:markPaid', id),
    markUnpaid: (id: number) => ipcRenderer.invoke('invoice:markUnpaid', id),
    duplicate: (id: number) => ipcRenderer.invoke('invoice:duplicate', id),
    generatePDF: (id: number) => ipcRenderer.invoke('invoice:generatePDF', id),
    getNextNumber: (businessId: number) => ipcRenderer.invoke('invoice:getNextNumber', businessId),
  },
  finance: {
    getSummary: (year?: number) => ipcRenderer.invoke('finance:getSummary', year),
    getTransactions: (filters?: unknown) => ipcRenderer.invoke('finance:getTransactions', filters),
    addExpense: (data: unknown) => ipcRenderer.invoke('finance:addExpense', data),
    deleteTransaction: (id: number) => ipcRenderer.invoke('finance:deleteTransaction', id),
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
  },
  upi: {
    getForBusiness: (businessId: number) => ipcRenderer.invoke('upi:getForBusiness', businessId),
    add: (data: unknown) => ipcRenderer.invoke('upi:add', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('upi:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('upi:delete', id),
    generateQR: (upiId: string, amount: number, name: string, invoiceNumber: string) =>
      ipcRenderer.invoke('upi:generateQR', upiId, amount, name, invoiceNumber),
  },
  shell: {
    openPath: (filePath: string) => ipcRenderer.invoke('shell:openPath', filePath),
    showInFolder: (filePath: string) => ipcRenderer.invoke('shell:showInFolder', filePath),
    readFile: (filePath: string) => ipcRenderer.invoke('shell:readFile', filePath),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
});
