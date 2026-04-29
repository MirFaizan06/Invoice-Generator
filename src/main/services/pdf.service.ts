import { BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

export async function generatePDF(htmlPath: string, pdfPath: string): Promise<string> {
  const html = fs.readFileSync(htmlPath, 'utf-8');

  const win = new BrowserWindow({
    show: false,
    width: 794,
    height: 1123,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  await new Promise<void>((resolve) => setTimeout(resolve, 800));

  const pdfBuffer = await win.webContents.printToPDF({
    pageSize: 'A4',
    printBackground: true,
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  win.close();

  const dir = path.dirname(pdfPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(pdfPath, pdfBuffer);

  return pdfPath;
}
