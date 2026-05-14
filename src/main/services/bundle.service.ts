import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { getDB } from '../database';
import { generatePDF } from './pdf.service';
import type { SavedClient, LegalDocument } from '../../shared/types';

interface InvoiceRow {
  id: number;
  invoice_number: string;
  pdf_path: string;
  html_path: string;
  date: string;
  total: number;
  status: string;
  project_name: string;
}

const DOC_TYPE_LABEL: Record<string, string> = {
  msa: 'Master Services Agreement',
  sow: 'Statement of Work',
  nda: 'Non-Disclosure Agreement',
  sla: 'Service Level Agreement',
};

function safeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/\s+/g, '_');
}

function tryFindRarExecutable(): string | null {
  const candidates = [
    'C:\\Program Files\\WinRAR\\WinRAR.exe',
    'C:\\Program Files (x86)\\WinRAR\\WinRAR.exe',
    'C:\\Program Files\\7-Zip\\7z.exe',
    'C:\\Program Files (x86)\\7-Zip\\7z.exe',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  try {
    const which = execSync('where 7z', { windowsHide: true, stdio: 'pipe' }).toString().trim().split('\n')[0];
    if (which && fs.existsSync(which.trim())) return which.trim();
  } catch {}
  try {
    const which = execSync('where rar', { windowsHide: true, stdio: 'pipe' }).toString().trim().split('\n')[0];
    if (which && fs.existsSync(which.trim())) return which.trim();
  } catch {}
  return null;
}

export interface BundleResult {
  filePath: string;
  fileCount: number;
  format: 'zip' | 'rar';
  warning?: string;
}

export async function createClientBundle(
  clientId: number,
  businessId: number,
  format: 'zip' | 'rar',
  destFolder: string
): Promise<BundleResult> {
  const db = getDB();

  const client = db.prepare('SELECT * FROM saved_clients WHERE id = ?').get(clientId) as SavedClient | undefined;
  if (!client) throw new Error('Client not found');

  const tempDir = path.join(os.tmpdir(), `bizdesk-bundle-${clientId}-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const readmeLines: string[] = [
    `CLIENT DOCUMENT BUNDLE`,
    `======================`,
    `Client:    ${client.name}`,
    `Email:     ${client.email || '—'}`,
    `Phone:     ${client.phone || '—'}`,
    `Generated: ${new Date().toLocaleString('en-IN')}`,
    ``,
    `This bundle was prepared by BizDesk — Complete Business Suite.`,
    `All documents are confidential and intended only for the named client.`,
    ``,
    `CONTENTS`,
    `--------`,
    ``,
  ];

  let fileCount = 0;

  // Invoices for this client
  const invoices = db.prepare(
    "SELECT id, invoice_number, pdf_path, html_path, date, total, status, project_name FROM invoices WHERE client_name = ? AND business_id = ? AND is_deleted = 0 ORDER BY date DESC"
  ).all(client.name, businessId) as InvoiceRow[];

  if (invoices.length > 0) {
    readmeLines.push('INVOICES', '--------');
  }

  for (const inv of invoices) {
    let pdfPath = inv.pdf_path;

    // Generate PDF if missing
    if ((!pdfPath || !fs.existsSync(pdfPath)) && inv.html_path && fs.existsSync(inv.html_path)) {
      try {
        const tempPdf = path.join(tempDir, `${safeFileName(inv.invoice_number)}.pdf`);
        pdfPath = await generatePDF(inv.html_path, tempPdf);
      } catch { continue; }
    }

    if (!pdfPath || !fs.existsSync(pdfPath)) continue;

    const destName = `Invoice_${safeFileName(inv.invoice_number)}.pdf`;
    fs.copyFileSync(pdfPath, path.join(tempDir, destName));
    fileCount++;

    const amount = Number(inv.total).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    readmeLines.push(
      `• ${destName}`,
      `  Invoice #: ${inv.invoice_number}`,
      `  Project:   ${inv.project_name || '—'}`,
      `  Date:      ${inv.date}`,
      `  Amount:    ₹${amount}`,
      `  Status:    ${inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}`,
      ``
    );
  }

  // Legal documents for this client
  const docs = db.prepare(
    "SELECT * FROM legal_documents WHERE client_id = ? AND pdf_path != '' ORDER BY created_at DESC"
  ).all(clientId) as LegalDocument[];

  if (docs.length > 0) {
    readmeLines.push('', 'LEGAL DOCUMENTS', '---------------');
  }

  for (const doc of docs) {
    if (!doc.pdf_path || !fs.existsSync(doc.pdf_path)) continue;
    const typeLabel = DOC_TYPE_LABEL[doc.doc_type] || doc.doc_type.toUpperCase();
    const destName = `${doc.doc_type.toUpperCase()}_${safeFileName(doc.title || client.name)}_v${doc.version}.pdf`;
    fs.copyFileSync(doc.pdf_path, path.join(tempDir, destName));
    fileCount++;
    readmeLines.push(
      `• ${destName}`,
      `  Type:    ${typeLabel}`,
      `  Version: ${doc.version}`,
      `  Status:  ${doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}`,
      `  Date:    ${doc.generated_at?.split('T')[0] || doc.created_at?.split('T')[0] || '—'}`,
      ``
    );
  }

  if (fileCount === 0) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new Error('No PDF files found for this client. Generate PDFs for invoices and documents first.');
  }

  readmeLines.push('', '---', 'Generated by BizDesk — Complete Business Suite', 'https://github.com/MirFaizan06/Invoice-Generator');
  fs.writeFileSync(path.join(tempDir, 'README.txt'), readmeLines.join('\r\n'), 'utf-8');

  const safeName = safeFileName(client.name);
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);

  let usedFormat: 'zip' | 'rar' = format;
  let warning: string | undefined;

  if (format === 'rar') {
    const rarExe = tryFindRarExecutable();
    if (!rarExe) {
      usedFormat = 'zip';
      warning = 'WinRAR / 7-Zip not found on this system — exported as ZIP instead.';
    } else {
      const rarPath = path.join(destFolder, `${safeName}_Bundle_${ts}.rar`);
      try {
        if (rarExe.toLowerCase().includes('7z')) {
          execSync(`"${rarExe}" a "${rarPath}" "${tempDir}\\*"`, { windowsHide: true });
        } else {
          execSync(`"${rarExe}" a -ep1 "${rarPath}" "${tempDir}\\*"`, { windowsHide: true });
        }
        fs.rmSync(tempDir, { recursive: true, force: true });
        return { filePath: rarPath, fileCount, format: 'rar', warning };
      } catch {
        usedFormat = 'zip';
        warning = 'RAR export failed — exported as ZIP instead.';
      }
    }
  }

  // ZIP via PowerShell
  const zipPath = path.join(destFolder, `${safeName}_Bundle_${ts}.zip`);
  execSync(
    'powershell -NoProfile -Command "Compress-Archive -Path $env:ZIP_SRC -DestinationPath $env:ZIP_DEST -Force"',
    { windowsHide: true, env: { ...process.env, ZIP_SRC: `${tempDir}\\*`, ZIP_DEST: zipPath } }
  );

  fs.rmSync(tempDir, { recursive: true, force: true });
  return { filePath: zipPath, fileCount, format: usedFormat, warning };
}
