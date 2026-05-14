import { ipcMain } from 'electron';
import { sendEmail, getMailLogs, deleteMailLog } from '../services/smtp.service';
import { getActiveBusiness } from '../services/business.service';

export function registerMailIPC(): void {
  ipcMain.handle('mail:send', async (_, data: {
    to: string; toName: string; subject: string; bodyHtml: string;
    businessId: number; relatedType?: string; relatedId?: number;
  }) => {
    const business = getActiveBusiness();
    return sendEmail({
      ...data,
      senderName: business?.name ?? 'BizDesk User',
    });
  });

  ipcMain.handle('mail:getLogs', (_, filters: { businessId?: number; status?: string } = {}) =>
    getMailLogs(filters));

  ipcMain.handle('mail:deleteLog', (_, id: number) => deleteMailLog(id));
}
