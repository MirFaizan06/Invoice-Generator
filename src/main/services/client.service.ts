import { getDB } from '../database/index';
import type { SavedClient } from '../../shared/types';

function rowToClient(row: any): SavedClient {
  return {
    id: row.id,
    business_id: row.business_id,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    gst: row.gst || '',
    pan: row.pan || '',
    website: row.website || '',
    notes: row.notes || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function getClientById(id: number): SavedClient | null {
  const row = getDB().prepare('SELECT * FROM saved_clients WHERE id = ?').get(id) as any;
  if (!row) return null;
  return rowToClient(row);
}

export const ClientService = {
  getForBusiness(businessId: number): SavedClient[] {
    const db = getDB();
    const rows = db.prepare('SELECT * FROM saved_clients WHERE business_id = ? ORDER BY name ASC').all(businessId) as any[];
    return rows.map(rowToClient);
  },

  save(data: Omit<SavedClient, 'id' | 'created_at' | 'updated_at'>): SavedClient {
    const db = getDB();
    const result = db.prepare(
      'INSERT INTO saved_clients (business_id, name, email, phone, address, gst, pan, website, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(data.business_id, data.name, data.email, data.phone, data.address, data.gst, data.pan || '', data.website || '', data.notes || '');
    const row = db.prepare('SELECT * FROM saved_clients WHERE id = ?').get(result.lastInsertRowid) as any;
    return rowToClient(row);
  },

  update(id: number, data: Partial<Omit<SavedClient, 'id' | 'created_at' | 'updated_at'>>): SavedClient {
    const db = getDB();
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    db.prepare(`UPDATE saved_clients SET ${fields}, updated_at = datetime('now') WHERE id = ?`).run([...values, id]);
    const row = db.prepare('SELECT * FROM saved_clients WHERE id = ?').get(id) as any;
    return rowToClient(row);
  },

  delete(id: number): void {
    const db = getDB();
    db.prepare('DELETE FROM saved_clients WHERE id = ?').run(id);
  },
};
