import { ipcMain } from 'electron';
import { AuthService } from '../services/auth.service';

export function registerAuthHandlers(): void {
  ipcMain.handle('auth:isSetup', () => AuthService.isSetup());
  ipcMain.handle('auth:setup', (_, password: string, hint: string) => AuthService.setup(password, hint));
  ipcMain.handle('auth:verify', (_, password: string) => AuthService.verify(password));
  ipcMain.handle('auth:changePassword', (_, oldPassword: string, newPassword: string) => AuthService.changePassword(oldPassword, newPassword));
  ipcMain.handle('auth:getHint', () => AuthService.getHint());
  ipcMain.handle('auth:reset', () => AuthService.reset());
}
