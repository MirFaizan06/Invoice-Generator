import { ipcMain } from 'electron';
import {
  getAllBusinesses,
  getActiveBusiness,
  createBusiness,
  updateBusiness,
  deleteBusiness,
  setActiveBusiness,
  saveBusinessLogo,
} from '../services/business.service';

export function registerBusinessIPC(): void {
  ipcMain.handle('business:getAll', () => getAllBusinesses());
  ipcMain.handle('business:getActive', () => getActiveBusiness());
  ipcMain.handle('business:create', (_, data) => createBusiness(data));
  ipcMain.handle('business:update', (_, id, data) => updateBusiness(id, data));
  ipcMain.handle('business:delete', (_, id) => deleteBusiness(id));
  ipcMain.handle('business:setActive', (_, id) => setActiveBusiness(id));
  ipcMain.handle('business:saveLogo', (_, businessId: number, srcPath: string) => saveBusinessLogo(businessId, srcPath));
}
