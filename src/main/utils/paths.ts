import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export const AppPaths = {
  get dataDir() {
    const dir = path.join(app.getPath('documents'), 'BizDesk');
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
  const newDb = AppPaths.database;

  // Migrate from old InvoDesk folder (renamed to BizDesk in v2.0.0)
  const invoDeskDb = path.join(app.getPath('documents'), 'InvoDesk', 'invodessk.db');
  if (fs.existsSync(invoDeskDb) && !fs.existsSync(newDb)) {
    try { fs.copyFileSync(invoDeskDb, newDb); } catch {}
  }

  // Migrate from legacy userData location
  const oldDb = path.join(app.getPath('userData'), 'invodessk.db');
  if (fs.existsSync(oldDb) && !fs.existsSync(newDb)) {
    try { fs.copyFileSync(oldDb, newDb); } catch {}
  }

  const newLogos = AppPaths.logosDir;

  // Migrate logos from old InvoDesk folder
  const invoDeskLogos = path.join(app.getPath('documents'), 'InvoDesk', 'logos');
  if (fs.existsSync(invoDeskLogos) && !fs.existsSync(newLogos)) {
    try { fs.cpSync(invoDeskLogos, newLogos, { recursive: true }); } catch {}
  }

  // Migrate logos from legacy userData location
  const oldLogos = path.join(app.getPath('userData'), 'logos');
  if (fs.existsSync(oldLogos) && !fs.existsSync(newLogos)) {
    try { fs.cpSync(oldLogos, newLogos, { recursive: true }); } catch {}
  }
}

export function ensureDirectories(): void {
  [AppPaths.logosDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}
