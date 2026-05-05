import { ipcMain } from 'electron';
import { getUpiForBusiness, addUpiId, updateUpiId, deleteUpiId, parseUpiId, isValidUpiFormat } from '../services/upi.service';
import { generateQRCode } from '../services/qr.service';

export function registerUpiIPC(): void {
  ipcMain.handle('upi:getForBusiness', (_, businessId) => getUpiForBusiness(businessId));
  ipcMain.handle('upi:add', (_, data) => addUpiId(data));
  ipcMain.handle('upi:update', (_, id, data) => updateUpiId(id, data));
  ipcMain.handle('upi:delete', (_, id) => deleteUpiId(id));
  ipcMain.handle('upi:generateQR', async (_, upiId: string, amount: number, name: string, invoiceNumber: string) => {
    const cleanVpa = upiId.trim().toLowerCase().replace(/\s+/g, '');
    const cleanName = (name || '').trim().replace(/\s+/g, ' ');
    if (!isValidUpiFormat(cleanVpa)) {
      console.warn(`[UPI] Invalid UPI format: ${cleanVpa}`);
    }
    const upiString =
      `upi://pay?` +
      `pa=${cleanVpa}` +
      `&pn=${encodeURIComponent(cleanName)}` +
      `&am=${Number(amount).toFixed(2)}` +
      `&cu=INR` +
      `&tn=${encodeURIComponent(invoiceNumber)}` +
      `&tr=${encodeURIComponent(invoiceNumber)}`;
    return generateQRCode(upiString);
  });
  ipcMain.handle('upi:parseUpiId', (_, upiId: string) => parseUpiId(upiId));
}
