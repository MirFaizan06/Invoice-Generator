import { getDB } from '../database';
import { getActiveBusiness } from './business.service';
import type { Invoice } from '../../shared/types';

function extractText(html: string, classOrPattern: string): string {
  const m = html.match(new RegExp(`class="${classOrPattern}"[^>]*>\\s*([^<]+)\\s*<`));
  return m ? m[1].trim() : '';
}

function stripCurrency(val: string): number {
  return parseFloat(val.replace(/[^\d.]/g, '')) || 0;
}

export interface ImportResult {
  success: boolean;
  invoice?: Invoice;
  error?: string;
}

interface ParsedItem {
  title: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

function extractItems(html: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  // Match each table row in the tbody that has col-desc
  const rowRegex = /<tr[^>]*class="row-(?:even|odd)"[^>]*>([\s\S]*?)<\/tr>/g;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const row = rowMatch[1];

    const titleMatch = row.match(/class="item-title"[^>]*>\s*([^<]+)\s*</);
    const descMatch = row.match(/class="item-desc"[^>]*>\s*([^<]+)\s*</);
    const qtyMatch = row.match(/class="col-qty"[^>]*>\s*([^<]+)\s*</);
    const priceMatch = row.match(/class="col-(?:rate|price)"[^>]*>\s*([^<]+)\s*</);
    const amountMatch = row.match(/class="col-amount"[^>]*>\s*([^<]+)\s*</);

    if (!titleMatch) continue;

    const quantity = qtyMatch ? parseFloat(qtyMatch[1].trim()) || 1 : 1;
    const unit_price = priceMatch ? stripCurrency(priceMatch[1].trim()) : 0;
    const amount = amountMatch ? stripCurrency(amountMatch[1].trim()) : unit_price * quantity;

    items.push({
      title: titleMatch[1].trim(),
      description: descMatch ? descMatch[1].trim() : '',
      quantity,
      unit_price,
      amount,
    });
  }

  return items;
}

function extractInvoiceNumber(html: string): string {
  // Try the invoice-number class first
  const byClass = extractText(html, 'invoice-number');
  if (byClass) return byClass;
  // Fallback: look for TBD/INV pattern
  const m = html.match(/([A-Z]+\/INV\/\d{4}\/\d+)/);
  return m ? m[1].trim() : '';
}

function extractBusinessName(html: string): string {
  const m = html.match(/<div class="business-info"[^>]*>\s*<h1[^>]*>\s*([^<]+)\s*<\/h1>/);
  return m ? m[1].trim() : '';
}

function extractClientName(html: string): string {
  // The client name appears as class="name" inside the bill-box (Bill To section)
  // It is the first .name element in the HTML
  const m = html.match(/class="name"[^>]*>\s*([^<]+)\s*</);
  return m ? m[1].trim() : '';
}

function extractDate(html: string): string {
  // Looks for: Date: DD Mon YYYY in the invoice-date div
  const m = html.match(/class="invoice-date"[^>]*>\s*Date:\s*([^<]+)\s*</);
  return m ? m[1].trim() : '';
}

function extractDueDate(html: string): string {
  // Looks for: Due: DD Mon YYYY in an invoice-date div
  const m = html.match(/class="invoice-date"[^>]*>\s*Due:\s*([^<]+)\s*</);
  return m ? m[1].trim() : '';
}

function extractTotal(html: string): number {
  // The totals-total div contains: <span>Total Amount</span><span>₹X,XX,XXX.XX</span>
  const m = html.match(/class="totals-total"[^>]*>[\s\S]*?<span>Total Amount<\/span>\s*<span>([^<]+)<\/span>/);
  return m ? stripCurrency(m[1]) : 0;
}

function extractNotes(html: string): string {
  // Notes section: <div class="notes-section">...<p>NOTES</p>
  const m = html.match(/class="notes-section"[\s\S]*?<p>\s*([\s\S]*?)\s*<\/p>/);
  return m ? m[1].trim() : '';
}

function extractProjectName(html: string): string {
  // project name is the first .name inside the second bill-box (Invoice Details)
  // We can look for the second occurrence of class="name"
  const allNames = [...html.matchAll(/class="name"[^>]*>\s*([^<]+)\s*</g)];
  return allNames.length >= 2 ? allNames[1][1].trim() : '';
}

function parseInvoiceNumberParts(invoiceNumber: string): { year: number; seq: number } | null {
  // Format: PREFIX/INV/YEAR/NNNN or PREFIX/YEAR/NNNN
  const m = invoiceNumber.match(/\/(\d{4})\/(\d+)$/);
  if (!m) return null;
  return { year: parseInt(m[1], 10), seq: parseInt(m[2], 10) };
}

export function importInvoiceFromHtml(html: string): ImportResult {
  try {
    const invoiceNumber = extractInvoiceNumber(html);
    if (!invoiceNumber) {
      return { success: false, error: 'Could not extract invoice number from HTML.' };
    }

    const db = getDB();

    // Check for duplicate
    const existing = db.prepare('SELECT id FROM invoices WHERE invoice_number = ?').get(invoiceNumber) as { id: number } | undefined;
    if (existing) {
      return { success: false, error: 'Invoice already imported.' };
    }

    const business = getActiveBusiness();
    if (!business) {
      return { success: false, error: 'No active business found.' };
    }

    const clientName = extractClientName(html) || 'Unknown Client';
    const projectName = extractProjectName(html) || 'Imported Project';
    const dateStr = extractDate(html);
    const dueDateStr = extractDueDate(html);
    const total = extractTotal(html);
    const notes = extractNotes(html);
    const items = extractItems(html);

    // Compute subtotal from items; fall back to total if no items
    const subtotal = items.length > 0
      ? items.reduce((s, i) => s + i.amount, 0)
      : total;

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
      invoiceNumber, business.id, clientName, '', '', '',
      '', projectName, '', '', '',
      dateStr, dueDateStr, subtotal, 0, 0, 0,
      0, 0, total, 'INR',
      '', '', '', '',
      notes, '', ''
    );

    const invoiceId = result.lastInsertRowid as number;

    if (items.length > 0) {
      const stmt = db.prepare(
        'INSERT INTO invoice_items (invoice_id, title, description, quantity, unit_price, amount, order_index, hsn_sac, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      items.forEach((item, idx) => {
        stmt.run(invoiceId, item.title, item.description, item.quantity, item.unit_price, item.amount, idx, '', '');
      });
    }

    // Update invoice_counters if needed
    const parts = parseInvoiceNumberParts(invoiceNumber);
    if (parts) {
      const counter = db.prepare('SELECT last_number FROM invoice_counters WHERE business_id = ? AND year = ?')
        .get(business.id, parts.year) as { last_number: number } | undefined;
      if (!counter || counter.last_number < parts.seq) {
        db.prepare(`
          INSERT INTO invoice_counters (business_id, year, last_number)
          VALUES (?, ?, ?)
          ON CONFLICT(business_id, year) DO UPDATE SET last_number = excluded.last_number
        `).run(business.id, parts.year, parts.seq);
      }
    }

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as Invoice;
    invoice.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY order_index').all(invoiceId) as Invoice['items'];

    return { success: true, invoice };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
