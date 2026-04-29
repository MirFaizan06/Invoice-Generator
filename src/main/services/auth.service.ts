import crypto from 'crypto';
import { getDB } from '../database/index';

function hashPassword(password: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export const AuthService = {
  isSetup(): boolean {
    const db = getDB();
    const row = db.prepare('SELECT id FROM auth LIMIT 1').get() as any;
    return !!row;
  },

  setup(password: string, hint: string = ''): void {
    const db = getDB();
    const salt = generateSalt();
    const hash = hashPassword(password, salt);
    const stored = `${salt}:${hash}`;
    db.prepare('INSERT OR REPLACE INTO auth (id, password_hash, hint) VALUES (1, ?, ?)').run(stored, hint);
  },

  verify(password: string): boolean {
    const db = getDB();
    const row = db.prepare('SELECT password_hash FROM auth LIMIT 1').get() as any;
    if (!row) return true; // no auth setup = open access
    const [salt, hash] = row.password_hash.split(':');
    return hashPassword(password, salt) === hash;
  },

  changePassword(oldPassword: string, newPassword: string): boolean {
    if (!this.verify(oldPassword)) return false;
    this.setup(newPassword);
    return true;
  },

  getHint(): string {
    const db = getDB();
    const row = db.prepare('SELECT hint FROM auth LIMIT 1').get() as any;
    return row?.hint || '';
  },

  reset(): void {
    const db = getDB();
    db.prepare('DELETE FROM auth').run();
  },
};
