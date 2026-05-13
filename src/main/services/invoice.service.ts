import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { getDB } from '../database/index';
import { generateInvoiceHTML } from './template.service';
import type { Invoice, InvoiceItem, CreateInvoiceData, InvoiceFilters } from '../../shared/types';
import { getBusinessById } from './business.service';
import { getUpiForBusiness } from './upi.service';
import { generateQRCode } from './qr.service';
import { getSetting } from './settings.service';

function getInvoicePaths(businessName: string, invoiceNumber: string): { htmlPath: string; pdfPath: string } {
  const defaultRoot = path.join(app.getPath('documents'), 'BizDesk', 'Invoices');
  const saveRoot = getSetting('invoice_save_path') || defaultRoot;
  const safeName = businessName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/\s+/g, ' ').trim();
  const businessFolder = path.join(saveRoot, `${safeName} - Invoices`);
  const htmlDir = path.join(businessFolder, 'HTML');
  const pdfDir = path.join(businessFolder, 'PDF');
  [htmlDir, pdfDir].forEach((d) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });
  const safe = invoiceNumber.replace(/\//g, '-');
  return { htmlPath: path.join(htmlDir, `${safe}.html`), pdfPath: path.join(pdfDir, `${safe}.pdf`) };
}

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
  let query = 'SELECT * FROM invoices WHERE (is_deleted = 0 OR is_deleted IS NULL)';
  const params: unknown[] = [];

  if (filters.status && filters.status !== 'all') {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.business_id) {
    query += ' AND business_id = ?';
    params.push(filters.business_id);
  }
  if (filters.search) {
    query += ' AND (client_name LIKE ? OR invoice_number LIKE ? OR project_name LIKE ? OR client_email LIKE ? OR client_gst LIKE ?)';
    const s = `%${filters.search}%`;
    params.push(s, s, s, s, s);
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

  if (filters.limit && filters.limit > 0) {
    query += ` LIMIT ${Math.floor(filters.limit)}`;
  }

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
  const discountAmount = data.discount_amount ?? 0;
  const shippingCharges = data.shipping_charges ?? 0;
  const taxAmount = ((subtotal - discountAmount) * data.tax_percent) / 100;
  const total = subtotal - discountAmount + shippingCharges + taxAmount;

  const { htmlPath, pdfPath } = getInvoicePaths(business.name, invoiceNumber);

  const upiIds = getUpiForBusiness(data.business_id);
  const primaryUpi = upiIds.find((u) => u.is_primary) || upiIds[0];
  let qrDataUrl = '';
  const upiName = (primaryUpi?.upi_name || business.name).trim();
  if (primaryUpi) {
    const cleanVpa = primaryUpi.upi_id.trim().toLowerCase().replace(/\s+/g, '');
    const cleanName = (primaryUpi.upi_name || business.name || '').trim().replace(/\s+/g, ' ');
    const upiString =
      `upi://pay?` +
      `pa=${cleanVpa}` +
      `&pn=${encodeURIComponent(cleanName)}` +
      `&am=${total.toFixed(2)}` +
      `&cu=INR` +
      `&tn=${encodeURIComponent(invoiceNumber)}` +
      `&tr=${encodeURIComponent(invoiceNumber)}`;
    qrDataUrl = await generateQRCode(upiString);
  }

  let logoDataUrl = '';
  if (business.logo_path && fs.existsSync(business.logo_path)) {
    const ext = business.logo_path.split('.').pop()?.toLowerCase() || 'png';
    const mimeMap: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp' };
    const mime = mimeMap[ext] || 'image/png';
    logoDataUrl = `data:${mime};base64,${fs.readFileSync(business.logo_path).toString('base64')}`;
  }

  const html = generateInvoiceHTML({
    business,
    invoice: {
      ...data,
      invoice_number: invoiceNumber,
      subtotal,
      tax_amount: taxAmount,
      total,
      id: 0,
      status: 'unpaid',
      created_at: '',
      updated_at: '',
      client_gst: data.client_gst || '',
      po_number: data.po_number || '',
      place_of_supply: data.place_of_supply || '',
      payment_terms: data.payment_terms || '',
      bank_account: data.bank_account || '',
      bank_name: data.bank_name || '',
      bank_ifsc: data.bank_ifsc || '',
      bank_holder: data.bank_holder || '',
      discount_percent: data.discount_percent ?? 0,
      discount_amount: discountAmount,
      shipping_charges: shippingCharges,
      currency: data.currency || 'INR',
      html_path: htmlPath,
      pdf_path: pdfPath,
    },
    items: data.items,
    qrDataUrl,
    upiId: primaryUpi?.upi_id || '',
    upiName,
    logoDataUrl,
  });
  fs.writeFileSync(htmlPath, html, 'utf-8');

  const result = db.prepare(`
    INSERT INTO invoices (
      invoice_number, business_id, client_name, client_address, client_email, client_phone,
      client_gst, project_name, po_number, place_of_supply, payment_terms,
      date, due_date, subtotal, discount_percent, discount_amount, shipping_charges,
      tax_percent, tax_amount, total, currency,
      bank_account, bank_name, bank_ifsc, bank_holder,
      notes, html_path, pdf_path
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    invoiceNumber, data.business_id, data.client_name, data.client_address, data.client_email, data.client_phone,
    data.client_gst || '', data.project_name, data.po_number || '', data.place_of_supply || '', data.payment_terms || '',
    data.date, data.due_date, subtotal, data.discount_percent ?? 0, discountAmount, shippingCharges,
    data.tax_percent, taxAmount, total, data.currency || 'INR',
    data.bank_account || '', data.bank_name || '', data.bank_ifsc || '', data.bank_holder || '',
    data.notes, htmlPath, pdfPath
  );

  const invoiceId = result.lastInsertRowid as number;
  const stmt = db.prepare(
    'INSERT INTO invoice_items (invoice_id, title, description, quantity, unit_price, amount, order_index, hsn_sac, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  data.items.forEach((item, idx) => {
    stmt.run(invoiceId, item.title, item.description, item.quantity, item.unit_price, item.amount, idx, item.hsn_sac || '', item.unit || '');
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
  if (data.client_gst !== undefined) { fields.push('client_gst = ?'); values.push(data.client_gst); }
  if (data.project_name !== undefined) { fields.push('project_name = ?'); values.push(data.project_name); }
  if (data.po_number !== undefined) { fields.push('po_number = ?'); values.push(data.po_number); }
  if (data.place_of_supply !== undefined) { fields.push('place_of_supply = ?'); values.push(data.place_of_supply); }
  if (data.payment_terms !== undefined) { fields.push('payment_terms = ?'); values.push(data.payment_terms); }
  if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date); }
  if (data.due_date !== undefined) { fields.push('due_date = ?'); values.push(data.due_date); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
  if (data.currency !== undefined) { fields.push('currency = ?'); values.push(data.currency); }
  if (data.bank_account !== undefined) { fields.push('bank_account = ?'); values.push(data.bank_account); }
  if (data.bank_name !== undefined) { fields.push('bank_name = ?'); values.push(data.bank_name); }
  if (data.bank_ifsc !== undefined) { fields.push('bank_ifsc = ?'); values.push(data.bank_ifsc); }
  if (data.bank_holder !== undefined) { fields.push('bank_holder = ?'); values.push(data.bank_holder); }

  if (data.items !== undefined) {
    const subtotal = data.items.reduce((s, i) => s + i.amount, 0);
    const taxPercent = data.tax_percent ?? (getInvoiceById(id)?.tax_percent || 18);
    const discountAmount = data.discount_amount ?? (getInvoiceById(id)?.discount_amount || 0);
    const shippingCharges = data.shipping_charges ?? (getInvoiceById(id)?.shipping_charges || 0);
    const discountPercent = data.discount_percent ?? (getInvoiceById(id)?.discount_percent || 0);
    const taxAmount = ((subtotal - discountAmount) * taxPercent) / 100;
    const total = subtotal - discountAmount + shippingCharges + taxAmount;

    fields.push('subtotal = ?', 'tax_percent = ?', 'tax_amount = ?', 'total = ?');
    fields.push('discount_percent = ?', 'discount_amount = ?', 'shipping_charges = ?');
    values.push(subtotal, taxPercent, taxAmount, total, discountPercent, discountAmount, shippingCharges);

    db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id);
    const stmt = db.prepare(
      'INSERT INTO invoice_items (invoice_id, title, description, quantity, unit_price, amount, order_index, hsn_sac, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    data.items.forEach((item, idx) =>
      stmt.run(id, item.title, item.description, item.quantity, item.unit_price, item.amount, idx, item.hsn_sac || '', item.unit || '')
    );
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE invoices SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  return getInvoiceById(id)!;
}

export function deleteInvoice(id: number): void {
  const invoice = getInvoiceById(id);
  if (invoice) {
    try { if (invoice.html_path && fs.existsSync(invoice.html_path)) fs.unlinkSync(invoice.html_path); } catch {}
    try { if (invoice.pdf_path && fs.existsSync(invoice.pdf_path)) fs.unlinkSync(invoice.pdf_path); } catch {}
    // Remove associated revenue transaction if paid
    if (invoice.status === 'paid') {
      getDB().prepare('DELETE FROM transactions WHERE invoice_id = ? AND type = ?').run(id, 'revenue');
    }
  }
  // Soft delete: mark as deleted but keep the row so the invoice number slot is preserved
  getDB().prepare("UPDATE invoices SET is_deleted = 1, html_path = '', pdf_path = '', updated_at = datetime('now') WHERE id = ?").run(id);
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
    client_gst: original.client_gst || '',
    project_name: original.project_name,
    po_number: original.po_number || '',
    place_of_supply: original.place_of_supply || '',
    payment_terms: original.payment_terms || '',
    date: new Date().toISOString().split('T')[0],
    due_date: original.due_date,
    tax_percent: original.tax_percent,
    discount_percent: original.discount_percent ?? 0,
    discount_amount: original.discount_amount ?? 0,
    shipping_charges: original.shipping_charges ?? 0,
    currency: original.currency || 'INR',
    bank_account: original.bank_account || '',
    bank_name: original.bank_name || '',
    bank_ifsc: original.bank_ifsc || '',
    bank_holder: original.bank_holder || '',
    notes: original.notes,
    items: (original.items || []).map(({ title, description, quantity, unit_price, amount, order_index, hsn_sac, unit }) => ({
      title, description, quantity, unit_price, amount, order_index,
      hsn_sac: hsn_sac || '',
      unit: unit || '',
    })),
  };

  return createInvoice(data);
}
