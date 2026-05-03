import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { app } from 'electron';
import { getDB } from '../database/index';
import { generatePDF } from './pdf.service';
import { getSetting } from './settings.service';

type InvoiceRow = { id: number; invoice_number: string; pdf_path: string; html_path: string };

export async function createBackupZip(destPath: string): Promise<{ count: number; total: number; zipPath: string }> {
  const db = getDB();
  const rows = db.prepare(
    "SELECT id, invoice_number, pdf_path, html_path FROM invoices WHERE (is_deleted = 0 OR is_deleted IS NULL)"
  ).all() as InvoiceRow[];

  const tempDir = path.join(os.tmpdir(), `invodesk-backup-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  let count = 0;
  const total = rows.length;

  for (const row of rows) {
    try {
      let pdfPath = row.pdf_path;

      // Generate PDF on the fly if it doesn't exist but HTML does
      if ((!pdfPath || !fs.existsSync(pdfPath)) && row.html_path && fs.existsSync(row.html_path)) {
        const defaultRoot = path.join(app.getPath('documents'), 'InvoDesk', 'Invoices');
        const saveRoot = getSetting('invoice_save_path') || defaultRoot;
        const safe = row.invoice_number.replace(/\//g, '-');
        const newPdfPath = path.join(saveRoot, 'Backup-PDF', `${safe}.pdf`);
        pdfPath = await generatePDF(row.html_path, newPdfPath);
      }

      if (pdfPath && fs.existsSync(pdfPath)) {
        const safeName = row.invoice_number.replace(/\//g, '-').replace(/[<>:"|?*\\]/g, '_');
        fs.copyFileSync(pdfPath, path.join(tempDir, `${safeName}.pdf`));
        count++;
      }
    } catch {
      // Skip failed invoices silently
    }
  }

  if (count === 0) {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
    throw new Error('No invoices with PDFs found. Open each invoice and click Download PDF first, then try backup again.');
  }

  const zipPath = destPath.endsWith('.zip') ? destPath : `${destPath}.zip`;

  try {
    execSync('powershell -NoProfile -Command "Compress-Archive -Path $env:ZIP_SRC -DestinationPath $env:ZIP_DEST -Force"', {
      windowsHide: true,
      env: {
        ...process.env,
        ZIP_SRC: `${tempDir}\\*`,
        ZIP_DEST: zipPath,
      },
    });
  } catch (err) {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
    throw new Error(`Failed to create ZIP archive: ${String(err)}`);
  }

  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}

  return { count, total, zipPath };
}
