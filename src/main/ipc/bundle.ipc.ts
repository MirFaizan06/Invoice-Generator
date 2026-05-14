import { ipcMain } from 'electron';
import { createClientBundle } from '../services/bundle.service';

export function registerBundleIPC(): void {
  ipcMain.handle('bundle:createForClient',
    (_, clientId: number, businessId: number, format: 'zip' | 'rar', destFolder: string) =>
      createClientBundle(clientId, businessId, format, destFolder)
  );
}
