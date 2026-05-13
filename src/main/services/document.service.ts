import fs from 'fs';
import path from 'path';
import { getDB } from '../database';
import type { LegalDocument, CreateLegalDocumentData, DocType } from '../../shared/types';
import { generateMsaHtml } from './templates/msa.template';
import { generateSowHtml } from './templates/sow.template';
import { generateNdaHtml } from './templates/nda.template';
import { generateSlaHtml } from './templates/sla.template';
import { generatePDF } from './pdf.service';
import { AppPaths } from '../utils/paths';

interface TemplateContext {
  business: Record<string, string>;
  client: Record<string, string>;
  project: Record<string, string> | null;
  date: string;
  fieldValues: Record<string, unknown>;
}

export function getDocuments(filters: { clientId?: number; projectId?: number; docType?: string; businessId?: number }): LegalDocument[] {
  let query = 'SELECT * FROM legal_documents WHERE 1=1';
  const params: unknown[] = [];
  if (filters.businessId) { query += ' AND business_id = ?'; params.push(filters.businessId); }
  if (filters.clientId) { query += ' AND client_id = ?'; params.push(filters.clientId); }
  if (filters.projectId) { query += ' AND project_id = ?'; params.push(filters.projectId); }
  if (filters.docType) { query += ' AND doc_type = ?'; params.push(filters.docType); }
  query += ' ORDER BY created_at DESC';
  return getDB().prepare(query).all(...params) as LegalDocument[];
}

export function getDocumentById(id: number): LegalDocument | null {
  return (getDB().prepare('SELECT * FROM legal_documents WHERE id = ?').get(id) as LegalDocument) ?? null;
}

export function hasSignedMSA(clientId: number): boolean {
  const row = getDB()
    .prepare(`SELECT id FROM legal_documents WHERE client_id = ? AND doc_type = 'msa' AND status = 'signed' LIMIT 1`)
    .get(clientId);
  return !!row;
}

export function generateDocumentHtml(
  docType: DocType,
  clientId: number,
  projectId: number | null,
  businessId: number,
  fieldValues: Record<string, unknown>
): { html: string; title: string } {
  const db = getDB();
  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId) as Record<string, string>;
  const client = db.prepare('SELECT * FROM saved_clients WHERE id = ?').get(clientId) as Record<string, string>;
  const project = projectId
    ? (db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Record<string, string>)
    : null;
  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const ctx: TemplateContext = { business, client, project, date, fieldValues };

  switch (docType) {
    case 'msa':
      return { html: generateMsaHtml(ctx), title: `MSA – ${client.name}` };
    case 'sow':
      return { html: generateSowHtml(ctx), title: `SOW – ${project?.name || client.name}` };
    case 'nda':
      return { html: generateNdaHtml(ctx), title: `NDA – ${client.name}` };
    case 'sla':
      return { html: generateSlaHtml(ctx), title: `SLA – ${project?.name || client.name}` };
  }
}

export function saveDocument(data: CreateLegalDocumentData): LegalDocument {
  const db = getDB();
  const result = db.prepare(`
    INSERT INTO legal_documents (project_id, client_id, business_id, doc_type, title, content_html, metadata, expiry_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.project_id ?? null,
    data.client_id,
    data.business_id,
    data.doc_type,
    data.title,
    data.content_html,
    data.metadata,
    data.expiry_date ?? null
  );
  return db.prepare('SELECT * FROM legal_documents WHERE id = ?').get(result.lastInsertRowid) as LegalDocument;
}

export function markDocumentSigned(id: number): void {
  getDB()
    .prepare(`UPDATE legal_documents SET status='signed', signed_at=datetime('now'), updated_at=datetime('now') WHERE id=?`)
    .run(id);
}

export function deleteDocument(id: number): void {
  const doc = getDocumentById(id);
  if (doc?.pdf_path) {
    try { if (fs.existsSync(doc.pdf_path)) fs.unlinkSync(doc.pdf_path); } catch {}
  }
  getDB().prepare('DELETE FROM legal_documents WHERE id = ?').run(id);
}

export async function generateDocumentPDF(id: number): Promise<string> {
  const doc = getDocumentById(id);
  if (!doc) throw new Error('Document not found');

  const docsDir = path.join(AppPaths.dataDir, 'documents');
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

  const pdfPath = path.join(docsDir, `${doc.doc_type}-${id}-v${doc.version}.pdf`);

  // pdf.service.ts expects a file path to read HTML from
  const tmpHtmlPath = path.join(docsDir, `${doc.doc_type}-${id}-tmp.html`);
  fs.writeFileSync(tmpHtmlPath, doc.content_html, 'utf-8');

  try {
    await generatePDF(tmpHtmlPath, pdfPath);
  } finally {
    try { fs.unlinkSync(tmpHtmlPath); } catch {}
  }

  getDB()
    .prepare(`UPDATE legal_documents SET pdf_path=?, updated_at=datetime('now') WHERE id=?`)
    .run(pdfPath, id);

  return pdfPath;
}
