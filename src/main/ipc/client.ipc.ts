import { ipcMain } from 'electron';
import { ClientService, getClientById } from '../services/client.service';

export function registerClientHandlers(): void {
  ipcMain.handle('clients:getForBusiness', (_, businessId: number) => ClientService.getForBusiness(businessId));
  ipcMain.handle('clients:getById', (_, id: number) => getClientById(id));
  ipcMain.handle('clients:save', (_, data: any) => ClientService.save(data));
  ipcMain.handle('clients:update', (_, id: number, data: any) => ClientService.update(id, data));
  ipcMain.handle('clients:delete', (_, id: number) => ClientService.delete(id));
}
