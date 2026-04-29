import fs from 'fs';
import path from 'path';
import { getDB } from '../database/index';
import { AppPaths } from '../utils/paths';
import type { Business, CreateBusinessData } from '../../shared/types';

type DBBusiness = Omit<Business, 'is_active'> & { is_active: number };

function mapBusiness(row: DBBusiness): Business {
  return { ...row, is_active: row.is_active === 1 };
}

export function getAllBusinesses(): Business[] {
  const rows = getDB().prepare('SELECT * FROM businesses ORDER BY is_active DESC, created_at ASC').all() as DBBusiness[];
  return rows.map(mapBusiness);
}

export function getActiveBusiness(): Business | null {
  const row = getDB().prepare('SELECT * FROM businesses WHERE is_active = 1 LIMIT 1').get() as DBBusiness | undefined;
  return row ? mapBusiness(row) : null;
}

export function getBusinessById(id: number): Business | null {
  const row = getDB().prepare('SELECT * FROM businesses WHERE id = ?').get(id) as DBBusiness | undefined;
  return row ? mapBusiness(row) : null;
}

export function createBusiness(data: CreateBusinessData): Business {
  const db = getDB();
  const hasAny = db.prepare('SELECT COUNT(*) as count FROM businesses').get() as { count: number };
  const isFirst = hasAny.count === 0;

  const result = db.prepare(`
    INSERT INTO businesses (name, owner_name, address, phone, email, gst, pan, cin, invoice_prefix, default_tax, is_active, logo_path, template_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.name,
    data.owner_name,
    data.address || '',
    data.phone || '',
    data.email || '',
    data.gst || '',
    data.pan || '',
    data.cin || '',
    data.invoice_prefix || 'TBD/INV',
    data.default_tax ?? 18,
    isFirst ? 1 : 0,
    data.logo_path || '',
    data.template_id || 'modern-blue'
  );

  return getBusinessById(result.lastInsertRowid as number)!;
}

export function updateBusiness(id: number, data: Partial<CreateBusinessData>): Business {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.owner_name !== undefined) { fields.push('owner_name = ?'); values.push(data.owner_name); }
  if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address); }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
  if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
  if (data.gst !== undefined) { fields.push('gst = ?'); values.push(data.gst); }
  if (data.pan !== undefined) { fields.push('pan = ?'); values.push(data.pan); }
  if (data.cin !== undefined) { fields.push('cin = ?'); values.push(data.cin); }
  if (data.invoice_prefix !== undefined) { fields.push('invoice_prefix = ?'); values.push(data.invoice_prefix); }
  if (data.default_tax !== undefined) { fields.push('default_tax = ?'); values.push(data.default_tax); }
  if (data.logo_path !== undefined) { fields.push('logo_path = ?'); values.push(data.logo_path); }
  if (data.template_id !== undefined) { fields.push('template_id = ?'); values.push(data.template_id); }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  getDB().prepare(`UPDATE businesses SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getBusinessById(id)!;
}

export function deleteBusiness(id: number): void {
  const db = getDB();
  const business = getBusinessById(id);
  if (!business) return;

  db.prepare('DELETE FROM businesses WHERE id = ?').run(id);

  if (business.is_active) {
    const next = db.prepare('SELECT id FROM businesses LIMIT 1').get() as { id: number } | undefined;
    if (next) {
      db.prepare('UPDATE businesses SET is_active = 1 WHERE id = ?').run(next.id);
    }
  }
}

export function setActiveBusiness(id: number): void {
  const db = getDB();
  db.prepare('UPDATE businesses SET is_active = 0').run();
  db.prepare('UPDATE businesses SET is_active = 1 WHERE id = ?').run(id);
}

export function saveBusinessLogo(businessId: number, srcPath: string): string {
  const ext = path.extname(srcPath) || '.png';
  const destFileName = `business_${businessId}${ext}`;
  const destPath = path.join(AppPaths.logosDir, destFileName);

  fs.copyFileSync(srcPath, destPath);
  updateBusiness(businessId, { logo_path: destPath });
  return destPath;
}
