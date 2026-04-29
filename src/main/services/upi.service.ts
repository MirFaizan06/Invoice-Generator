import { getDB } from '../database/index';
import type { UpiId } from '../../shared/types';

export function getUpiForBusiness(businessId: number): UpiId[] {
  return getDB().prepare('SELECT * FROM upi_ids WHERE business_id = ? ORDER BY is_primary DESC, id ASC').all(businessId) as UpiId[];
}

export function addUpiId(data: Omit<UpiId, 'id'>): UpiId {
  const db = getDB();
  if (data.is_primary) {
    db.prepare('UPDATE upi_ids SET is_primary = 0 WHERE business_id = ?').run(data.business_id);
  }
  const result = db.prepare('INSERT INTO upi_ids (business_id, label, upi_id, is_primary) VALUES (?, ?, ?, ?)').run(data.business_id, data.label, data.upi_id, data.is_primary ? 1 : 0);
  return db.prepare('SELECT * FROM upi_ids WHERE id = ?').get(result.lastInsertRowid) as UpiId;
}

export function updateUpiId(id: number, data: Partial<Omit<UpiId, 'id'>>): UpiId {
  const db = getDB();
  const existing = db.prepare('SELECT * FROM upi_ids WHERE id = ?').get(id) as UpiId;
  if (!existing) throw new Error('UPI ID not found');

  if (data.is_primary) {
    db.prepare('UPDATE upi_ids SET is_primary = 0 WHERE business_id = ?').run(existing.business_id);
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  if (data.label !== undefined) { fields.push('label = ?'); values.push(data.label); }
  if (data.upi_id !== undefined) { fields.push('upi_id = ?'); values.push(data.upi_id); }
  if (data.is_primary !== undefined) { fields.push('is_primary = ?'); values.push(data.is_primary ? 1 : 0); }

  values.push(id);
  db.prepare(`UPDATE upi_ids SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM upi_ids WHERE id = ?').get(id) as UpiId;
}

export function deleteUpiId(id: number): void {
  getDB().prepare('DELETE FROM upi_ids WHERE id = ?').run(id);
}
