import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { initializeDatabase } from './database/index';
import { ensureDirectories } from './utils/paths';
import { registerBusinessIPC } from './ipc/business.ipc';
import { registerInvoiceIPC } from './ipc/invoice.ipc';
import { registerFinanceIPC } from './ipc/finance.ipc';
import { registerSettingsIPC } from './ipc/settings.ipc';
import { registerUpiIPC } from './ipc/upi.ipc';

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    frame: false,
    backgroundColor: '#F8F9FA',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.handle('window:close', () => mainWindow?.close());
  ipcMain.handle('shell:openPath', async (_, filePath: string) => { await shell.openPath(filePath); });
  ipcMain.handle('shell:showInFolder', (_, filePath: string) => { shell.showItemInFolder(filePath); });
  ipcMain.handle('shell:readFile', (_, filePath: string) => {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
  });
}

app.whenReady().then(async () => {
  ensureDirectories();
  await initializeDatabase();
  registerBusinessIPC();
  registerInvoiceIPC();
  registerFinanceIPC();
  registerSettingsIPC();
  registerUpiIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
