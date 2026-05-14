import { ipcMain } from 'electron';
import {
  getAllInvoices, getInvoiceById, createInvoice, updateInvoice, deleteInvoice,
  markInvoicePaid, markInvoiceUnpaid, duplicateInvoice, getNextInvoiceNumber,
} from '../services/invoice.service';
import { generatePDF } from '../services/pdf.service';
import { createBackupZip } from '../services/backup.service';
import { importInvoiceFromHtml } from '../services/import-invoice.service';

export function registerInvoiceIPC(): void {
  ipcMain.handle('invoice:getAll', (_, filters) => getAllInvoices(filters));
  ipcMain.handle('invoice:getById', (_, id) => getInvoiceById(id));
  ipcMain.handle('invoice:create', (_, data) => createInvoice(data));
  ipcMain.handle('invoice:update', (_, id, data) => updateInvoice(id, data));
  ipcMain.handle('invoice:delete', (_, id) => deleteInvoice(id));
  ipcMain.handle('invoice:markPaid', (_, id) => markInvoicePaid(id));
  ipcMain.handle('invoice:markUnpaid', (_, id) => markInvoiceUnpaid(id));
  ipcMain.handle('invoice:duplicate', (_, id) => duplicateInvoice(id));
  ipcMain.handle('invoice:getNextNumber', (_, businessId) => getNextInvoiceNumber(businessId));
  ipcMain.handle('invoice:generatePDF', async (_, id) => {
    const invoice = getInvoiceById(id);
    if (!invoice) throw new Error('Invoice not found');
    if (!invoice.html_path) throw new Error('Invoice HTML not found');
    const pdfPath = await generatePDF(invoice.html_path, invoice.pdf_path);
    return pdfPath;
  });
  ipcMain.handle('invoice:exportBackup', async (_, destPath: string) => createBackupZip(destPath));
  ipcMain.handle('invoice:importFromHTML', (_, htmlContent: string) => importInvoiceFromHtml(htmlContent));
}
