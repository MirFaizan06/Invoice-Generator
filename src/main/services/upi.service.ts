import { getDB } from '../database/index';
import type { UpiId } from '../../shared/types';

function rowToUpi(row: any): UpiId {
  return {
    id: row.id,
    business_id: row.business_id,
    label: row.label,
    upi_id: row.upi_id,
    upi_name: row.upi_name || '',
    is_primary: row.is_primary === 1 || row.is_primary === true,
  };
}

export function getUpiForBusiness(businessId: number): UpiId[] {
  const rows = getDB().prepare('SELECT * FROM upi_ids WHERE business_id = ? ORDER BY is_primary DESC, id ASC').all(businessId) as any[];
  return rows.map(rowToUpi);
}

export function addUpiId(data: Omit<UpiId, 'id'>): UpiId {
  const db = getDB();
  if (data.is_primary) {
    db.prepare('UPDATE upi_ids SET is_primary = 0 WHERE business_id = ?').run(data.business_id);
  }
  const result = db.prepare(
    'INSERT INTO upi_ids (business_id, label, upi_id, upi_name, is_primary) VALUES (?, ?, ?, ?, ?)'
  ).run(data.business_id, data.label, data.upi_id, data.upi_name || '', data.is_primary ? 1 : 0);
  const row = db.prepare('SELECT * FROM upi_ids WHERE id = ?').get(result.lastInsertRowid) as any;
  return rowToUpi(row);
}

export function updateUpiId(id: number, data: Partial<Omit<UpiId, 'id'>>): UpiId {
  const db = getDB();
  const existing = db.prepare('SELECT * FROM upi_ids WHERE id = ?').get(id) as any;
  if (!existing) throw new Error('UPI ID not found');

  if (data.is_primary) {
    db.prepare('UPDATE upi_ids SET is_primary = 0 WHERE business_id = ?').run(existing.business_id);
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  if (data.label !== undefined) { fields.push('label = ?'); values.push(data.label); }
  if (data.upi_id !== undefined) { fields.push('upi_id = ?'); values.push(data.upi_id); }
  if (data.upi_name !== undefined) { fields.push('upi_name = ?'); values.push(data.upi_name); }
  if (data.is_primary !== undefined) { fields.push('is_primary = ?'); values.push(data.is_primary ? 1 : 0); }

  values.push(id);
  db.prepare(`UPDATE upi_ids SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const row = db.prepare('SELECT * FROM upi_ids WHERE id = ?').get(id) as any;
  return rowToUpi(row);
}

export function deleteUpiId(id: number): void {
  getDB().prepare('DELETE FROM upi_ids WHERE id = ?').run(id);
}

export function parseUpiId(upiId: string): { suggested_name: string; vpa: string; bank: string } {
  const trimmed = upiId.trim().toLowerCase();
  const parts = trimmed.split('@');
  const handle = parts[0] || '';
  const bank = parts[1] || '';

  const suggested_name = handle
    .replace(/[0-9._-]/g, ' ')
    .trim()
    .split(' ')
    .filter((w: string) => w.length > 1)
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || handle;

  return { suggested_name, vpa: trimmed, bank };
}
