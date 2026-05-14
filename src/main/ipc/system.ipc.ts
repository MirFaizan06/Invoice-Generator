import { ipcMain, app } from 'electron';
import dns from 'dns';

export function registerSystemIPC(): void {
  ipcMain.handle('system:restartApp', () => {
    app.relaunch();
    app.exit(0);
  });

  ipcMain.handle('system:getNetworkStatus', () =>
    new Promise<boolean>((resolve) => {
      dns.resolve('google.com', (err) => resolve(!err));
    })
  );
}
