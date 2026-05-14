import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { initializeDatabase } from './database/index';
import { ensureDirectories, migrateDataIfNeeded } from './utils/paths';
import { registerBusinessIPC } from './ipc/business.ipc';
import { registerInvoiceIPC } from './ipc/invoice.ipc';
import { registerFinanceIPC } from './ipc/finance.ipc';
import { registerSettingsIPC } from './ipc/settings.ipc';
import { registerUpiIPC } from './ipc/upi.ipc';
import { registerAuthHandlers } from './ipc/auth.ipc';
import { registerClientHandlers } from './ipc/client.ipc';
import { registerProjectsIPC } from './ipc/projects.ipc';
import { registerDocumentsIPC } from './ipc/documents.ipc';
import { registerMailIPC } from './ipc/mail.ipc';
import { registerSystemIPC } from './ipc/system.ipc';
import { registerBundleIPC } from './ipc/bundle.ipc';
import { runReminderCheck } from './services/reminder.service';

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    frame: false,
    title: 'BizDesk',
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
  ipcMain.handle('shell:pickFile', async (_, options: { title?: string; filters?: Array<{ name: string; extensions: string[] }> }) => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: options.title,
      filters: options.filters,
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
  ipcMain.handle('shell:pickFolder', async (_, title?: string) => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: title || 'Select Folder',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
}

app.whenReady().then(async () => {
  migrateDataIfNeeded();
  ensureDirectories();
  await initializeDatabase();
  registerBusinessIPC();
  registerInvoiceIPC();
  registerFinanceIPC();
  registerSettingsIPC();
  registerUpiIPC();
  registerAuthHandlers();
  registerClientHandlers();
  registerProjectsIPC();
  registerDocumentsIPC();
  registerMailIPC();
  registerSystemIPC();
  registerBundleIPC();
  createWindow();

  // Payment reminder worker — runs 10s after startup, then every 24h
  setTimeout(() => {
    runReminderCheck().catch(() => {});
    setInterval(() => runReminderCheck().catch(() => {}), 24 * 60 * 60 * 1000);
  }, 10000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
