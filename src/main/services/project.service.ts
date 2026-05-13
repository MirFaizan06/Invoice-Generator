import { getDB } from '../database';
import type { Project, CreateProjectData } from '../../shared/types';

export function getProjectsForClient(clientId: number): Project[] {
  return getDB().prepare('SELECT * FROM projects WHERE client_id = ? ORDER BY created_at DESC').all(clientId) as Project[];
}

export function getProjectsForBusiness(businessId: number): Project[] {
  return getDB().prepare('SELECT * FROM projects WHERE business_id = ? ORDER BY created_at DESC').all(businessId) as Project[];
}

export function createProject(data: CreateProjectData): Project {
  const db = getDB();
  const result = db.prepare(`
    INSERT INTO projects (client_id, business_id, name, description, status, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(data.client_id, data.business_id, data.name, data.description, data.status, data.start_date, data.end_date);
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid) as Project;
}

export function updateProject(id: number, data: Partial<CreateProjectData>): Project {
  const db = getDB();
  db.prepare(`
    UPDATE projects SET name=?, description=?, status=?, start_date=?, end_date=?, updated_at=datetime('now')
    WHERE id=?
  `).run(data.name, data.description, data.status, data.start_date, data.end_date, id);
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project;
}

export function deleteProject(id: number): void {
  getDB().prepare('DELETE FROM projects WHERE id = ?').run(id);
}
