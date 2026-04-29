import { ipcMain } from 'electron';
import { getUpiForBusiness, addUpiId, updateUpiId, deleteUpiId } from '../services/upi.service';
import { generateQRCode } from '../services/qr.service';

export function registerUpiIPC(): void {
  ipcMain.handle('upi:getForBusiness', (_, businessId) => getUpiForBusiness(businessId));
  ipcMain.handle('upi:add', (_, data) => addUpiId(data));
  ipcMain.handle('upi:update', (_, id, data) => updateUpiId(id, data));
  ipcMain.handle('upi:delete', (_, id) => deleteUpiId(id));
  ipcMain.handle('upi:generateQR', async (_, upiId, amount, name, invoiceNumber) => {
    const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(invoiceNumber)}`;
    return generateQRCode(upiString);
  });
}
