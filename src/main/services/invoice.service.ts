import fs from 'fs';
import { getDB } from '../database/index';
import { getHtmlPath, getPdfPath } from '../utils/paths';
import { generateInvoiceHTML } from './template.service';
import type { Invoice, InvoiceItem, CreateInvoiceData, InvoiceFilters } from '../../shared/types';
import { getBusinessById } from './business.service';
import { getUpiForBusiness } from './upi.service';
import { generateQRCode } from './qr.service';

type DBInvoice = Invoice;

function getItems(invoiceId: number): InvoiceItem[] {
  return getDB().prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY order_index').all(invoiceId) as InvoiceItem[];
}

function getInvoiceById(id: number): Invoice | null {
  const row = getDB().prepare('SELECT * FROM invoices WHERE id = ?').get(id) as DBInvoice | undefined;
  if (!row) return null;
  row.items = getItems(row.id);
  return row;
}

export { getInvoiceById };

export function getAllInvoices(filters: InvoiceFilters = {}): Invoice[] {
  let query = 'SELECT * FROM invoices WHERE 1=1';
  const params: unknown[] = [];

  if (filters.status && filters.status !== 'all') {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.search) {
    query += ' AND (client_name LIKE ? OR invoice_number LIKE ? OR project_name LIKE ?)';
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }
  if (filters.dateFrom) {
    query += ' AND date >= ?';
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    query += ' AND date <= ?';
    params.push(filters.dateTo);
  }

  const sortMap: Record<string, string> = { date: 'date', amount: 'total', client: 'client_name' };
  const sortCol = sortMap[filters.sortBy || 'date'] || 'date';
  const sortDir = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
  query += ` ORDER BY ${sortCol} ${sortDir}`;

  const rows = getDB().prepare(query).all(...params) as DBInvoice[];
  return rows.map((row) => ({ ...row, items: getItems(row.id) }));
}

export function getNextInvoiceNumber(businessId: number): string {
  const db = getDB();
  const business = getBusinessById(businessId);
  const prefix = business?.invoice_prefix || 'TBD/INV';
  const year = new Date().getFullYear();

  const existing = db.prepare('SELECT last_number FROM invoice_counters WHERE business_id = ? AND year = ?').get(businessId, year) as { last_number: number } | undefined;
  const nextNum = (existing?.last_number ?? 0) + 1;

  return `${prefix}/${year}/${String(nextNum).padStart(4, '0')}`;
}

export async function createInvoice(data: CreateInvoiceData): Promise<Invoice> {
  const db = getDB();
  const business = getBusinessById(data.business_id);
  if (!business) throw new Error('Business not found');

  const year = new Date().getFullYear();
  const existing = db.prepare('SELECT last_number FROM invoice_counters WHERE business_id = ? AND year = ?').get(data.business_id, year) as { last_number: number } | undefined;
  const nextNum = (existing?.last_number ?? 0) + 1;
  const invoiceNumber = `${business.invoice_prefix}/${year}/${String(nextNum).padStart(4, '0')}`;

  db.prepare(`
    INSERT INTO invoice_counters (business_id, year, last_number)
    VALUES (?, ?, ?)
    ON CONFLICT(business_id, year) DO UPDATE SET last_number = excluded.last_number
  `).run(data.business_id, year, nextNum);

  const subtotal = data.items.reduce((s, i) => s + i.amount, 0);
  const taxAmount = (subtotal * data.tax_percent) / 100;
  const total = subtotal + taxAmount;

  const htmlPath = getHtmlPath(invoiceNumber);
  const pdfPath = getPdfPath(invoiceNumber);

  const upiIds = getUpiForBusiness(data.business_id);
  const primaryUpi = upiIds.find((u) => u.is_primary) || upiIds[0];
  let qrDataUrl = '';
  if (primaryUpi) {
    const upiString = `upi://pay?pa=${primaryUpi.upi_id}&pn=${encodeURIComponent(business.name)}&am=${total}&cu=INR&tn=${encodeURIComponent(invoiceNumber)}`;
    qrDataUrl = await generateQRCode(upiString);
  }

  const html = generateInvoiceHTML({ business, invoice: { ...data, invoice_number: invoiceNumber, subtotal, tax_amount: taxAmount, total, id: 0, status: 'unpaid', created_at: '', updated_at: '' }, items: data.items, qrDataUrl, upiId: primaryUpi?.upi_id || '' });
  fs.writeFileSync(htmlPath, html, 'utf-8');

  const result = db.prepare(`
    INSERT INTO invoices (invoice_number, business_id, client_name, client_address, client_email, client_phone, project_name, date, due_date, subtotal, tax_percent, tax_amount, total, notes, html_path, pdf_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    invoiceNumber, data.business_id, data.client_name, data.client_address, data.client_email, data.client_phone,
    data.project_name, data.date, data.due_date, subtotal, data.tax_percent, taxAmount, total, data.notes, htmlPath, pdfPath
  );

  const invoiceId = result.lastInsertRowid as number;
  const stmt = db.prepare('INSERT INTO invoice_items (invoice_id, title, description, quantity, unit_price, amount, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)');
  data.items.forEach((item, idx) => {
    stmt.run(invoiceId, item.title, item.description, item.quantity, item.unit_price, item.amount, idx);
  });

  return getInvoiceById(invoiceId)!;
}

export function updateInvoice(id: number, data: Partial<CreateInvoiceData>): Invoice {
  const db = getDB();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.client_name !== undefined) { fields.push('client_name = ?'); values.push(data.client_name); }
  if (data.client_address !== undefined) { fields.push('client_address = ?'); values.push(data.client_address); }
  if (data.client_email !== undefined) { fields.push('client_email = ?'); values.push(data.client_email); }
  if (data.client_phone !== undefined) { fields.push('client_phone = ?'); values.push(data.client_phone); }
  if (data.project_name !== undefined) { fields.push('project_name = ?'); values.push(data.project_name); }
  if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date); }
  if (data.due_date !== undefined) { fields.push('due_date = ?'); values.push(data.due_date); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }

  if (data.items !== undefined) {
    const subtotal = data.items.reduce((s, i) => s + i.amount, 0);
    const taxPercent = data.tax_percent ?? (getInvoiceById(id)?.tax_percent || 18);
    const taxAmount = (subtotal * taxPercent) / 100;
    const total = subtotal + taxAmount;
    fields.push('subtotal = ?', 'tax_percent = ?', 'tax_amount = ?', 'total = ?');
    values.push(subtotal, taxPercent, taxAmount, total);

    db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id);
    const stmt = db.prepare('INSERT INTO invoice_items (invoice_id, title, description, quantity, unit_price, amount, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)');
    data.items.forEach((item, idx) => stmt.run(id, item.title, item.description, item.quantity, item.unit_price, item.amount, idx));
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE invoices SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  return getInvoiceById(id)!;
}

export function deleteInvoice(id: number): void {
  const invoice = getInvoiceById(id);
  if (invoice) {
    if (invoice.html_path && fs.existsSync(invoice.html_path)) fs.unlinkSync(invoice.html_path);
    if (invoice.pdf_path && fs.existsSync(invoice.pdf_path)) fs.unlinkSync(invoice.pdf_path);
  }
  getDB().prepare('DELETE FROM invoices WHERE id = ?').run(id);
}

export function markInvoicePaid(id: number): void {
  const db = getDB();
  const invoice = getInvoiceById(id);
  if (!invoice || invoice.status === 'paid') return;

  db.prepare("UPDATE invoices SET status = 'paid', updated_at = datetime('now') WHERE id = ?").run(id);
  db.prepare('INSERT INTO transactions (invoice_id, business_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, invoice.business_id, 'revenue', invoice.total,
    `Payment from ${invoice.client_name}`, invoice.date
  );
}

export function markInvoiceUnpaid(id: number): void {
  const db = getDB();
  const invoice = getInvoiceById(id);
  if (!invoice || invoice.status !== 'paid') return;

  db.prepare("UPDATE invoices SET status = 'unpaid', updated_at = datetime('now') WHERE id = ?").run(id);
  db.prepare('DELETE FROM transactions WHERE invoice_id = ? AND type = ?').run(id, 'revenue');
}

export async function duplicateInvoice(id: number): Promise<Invoice> {
  const original = getInvoiceById(id);
  if (!original) throw new Error('Invoice not found');

  const data: CreateInvoiceData = {
    business_id: original.business_id,
    client_name: original.client_name,
    client_address: original.client_address,
    client_email: original.client_email,
    client_phone: original.client_phone,
    project_name: original.project_name,
    date: new Date().toISOString().split('T')[0],
    due_date: original.due_date,
    tax_percent: original.tax_percent,
    notes: original.notes,
    items: (original.items || []).map(({ title, description, quantity, unit_price, amount, order_index }) => ({ title, description, quantity, unit_price, amount, order_index })),
  };

  return createInvoice(data);
}
