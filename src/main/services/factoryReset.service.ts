import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { getDB } from '../database/index';
import { AppPaths } from '../utils/paths';
import { getSetting } from './settings.service';

export function factoryReset(): void {
  const db = getDB();

  // Delete all invoice files
  const defaultRoot = path.join(app.getPath('documents'), 'BizDesk', 'Invoices');
  const saveRoot = getSetting('invoice_save_path') || defaultRoot;
  if (fs.existsSync(saveRoot)) {
    try { fs.rmSync(saveRoot, { recursive: true, force: true }); } catch {}
  }

  // Delete all logos
  if (fs.existsSync(AppPaths.logosDir)) {
    try { fs.rmSync(AppPaths.logosDir, { recursive: true, force: true }); } catch {}
  }

  // Clear all tables in correct FK order
  db.exec(`
    DELETE FROM transactions;
    DELETE FROM invoice_items;
    DELETE FROM invoices;
    DELETE FROM invoice_counters;
    DELETE FROM saved_clients;
    DELETE FROM upi_ids;
    DELETE FROM businesses;
    DELETE FROM auth;
    DELETE FROM settings;
  `);

  // Reset auto-increment sequences so next IDs start from 1
  try {
    db.exec(`DELETE FROM sqlite_sequence WHERE name IN (
      'businesses','invoices','invoice_items','transactions',
      'saved_clients','upi_ids','invoice_counters'
    )`);
  } catch {}
}
