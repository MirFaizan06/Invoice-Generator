import { ipcMain } from 'electron';
import { getSetting, setSetting, getAllSettings } from '../services/settings.service';
import { factoryReset } from '../services/factoryReset.service';

export function registerSettingsIPC(): void {
  ipcMain.handle('settings:get', (_, key) => getSetting(key));
  ipcMain.handle('settings:set', (_, key, value) => setSetting(key, value));
  ipcMain.handle('settings:getAll', () => getAllSettings());
  ipcMain.handle('settings:factoryReset', () => factoryReset());
}
