import { ipcMain } from 'electron';
import { getTransactions, addExpense, deleteTransaction, getFinanceSummary } from '../services/finance.service';

export function registerFinanceIPC(): void {
  ipcMain.handle('finance:getSummary', (_, year) => getFinanceSummary(year));
  ipcMain.handle('finance:getTransactions', (_, filters) => getTransactions(filters));
  ipcMain.handle('finance:addExpense', (_, data) => addExpense(data));
  ipcMain.handle('finance:deleteTransaction', (_, id) => deleteTransaction(id));
}
