import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export const AppPaths = {
  get dataDir() {
    const dir = path.join(app.getPath('documents'), 'InvoDesk');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  },
  get database() {
    return path.join(this.dataDir, 'invodessk.db');
  },
  get logosDir() {
    return path.join(this.dataDir, 'logos');
  },
};

export function migrateDataIfNeeded(): void {
  const oldDb = path.join(app.getPath('userData'), 'invodessk.db');
  const newDb = AppPaths.database;
  if (fs.existsSync(oldDb) && !fs.existsSync(newDb)) {
    try { fs.copyFileSync(oldDb, newDb); } catch {}
  }

  const oldLogos = path.join(app.getPath('userData'), 'logos');
  const newLogos = AppPaths.logosDir;
  if (fs.existsSync(oldLogos) && !fs.existsSync(newLogos)) {
    try { fs.cpSync(oldLogos, newLogos, { recursive: true }); } catch {}
  }
}

export function ensureDirectories(): void {
  [AppPaths.logosDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}
