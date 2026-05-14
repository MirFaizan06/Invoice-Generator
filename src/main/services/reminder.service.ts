import { getDB } from '../database';
import { sendEmail } from './smtp.service';
import type { Invoice } from '../../shared/types';

function parseTermsDays(terms: string): number {
  const lower = (terms || '').toLowerCase().trim();
  if (lower === 'due on receipt') return 0;
  const m = lower.match(/net\s*(\d+)/);
  return m ? parseInt(m[1]) : -1;
}

function daysBetween(dateA: string, dateB: string): number {
  return Math.floor((new Date(dateB).getTime() - new Date(dateA).getTime()) / 86400000);
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function buildReminderHtml(invoice: Invoice, businessName: string, businessEmail: string, ownerName: string, reminderType: 'overdue' | 'partial_due'): string {
  const isPartial = reminderType === 'partial_due';
  const outstanding = isPartial
    ? (invoice.total - (invoice.amount_paid ?? 0)).toFixed(2)
    : invoice.total.toFixed(2);
  const dueLabel = isPartial && invoice.full_payment_due_date
    ? `Full payment due: ${invoice.full_payment_due_date}`
    : `Invoice date: ${invoice.date}`;

  return `<!DOCTYPE html><html><head><style>
body{font-family:'Segoe UI',Arial,sans-serif;color:#1E293B;background:#F1F5F9;margin:0}
.wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
.hdr{background:${isPartial ? '#78350F' : '#7F1D1D'};padding:24px 32px}
.hdr h1{color:#fff;font-size:18px;margin:0 0 4px}.hdr p{color:rgba(255,255,255,.7);font-size:12px;margin:0}
.body{padding:32px}
.tag{display:inline-block;background:${isPartial ? '#FEF3C7' : '#FEE2E2'};color:${isPartial ? '#92400E' : '#991B1B'};font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;margin-bottom:16px}
table{width:100%;border-collapse:collapse;margin:14px 0}
td{padding:7px 0;font-size:13px;border-bottom:1px solid #F1F5F9}tr:last-child td{border-bottom:none}
.lbl{color:#64748B;width:45%}.val{font-weight:600;color:#0F172A}
.outstanding{font-size:22px;font-weight:800;color:${isPartial ? '#D97706' : '#DC2626'};margin:12px 0 4px}
.footer{background:#F8FAFC;padding:16px 32px;border-top:1px solid #E2E8F0;font-size:11px;color:#94A3B8;text-align:center}
</style></head><body><div class="wrap">
<div class="hdr"><h1>${businessName}</h1><p>${businessEmail}</p></div>
<div class="body">
  <div class="tag">${isPartial ? '⚡ Partial Payment Reminder' : '⚠ Payment Overdue'}</div>
  <p style="font-size:14px;color:#334155;margin:0 0 8px">Dear ${invoice.client_name},</p>
  <p style="font-size:14px;color:#475569;margin:0 0 16px">
    ${isPartial
      ? `This is a reminder that your partial payment for invoice <strong>${invoice.invoice_number}</strong> is pending. The remaining balance is due soon.`
      : `Our records show that invoice <strong>${invoice.invoice_number}</strong> is overdue for payment. Please arrange the payment at your earliest convenience.`}
  </p>
  <div class="outstanding">₹${outstanding}</div>
  <div style="font-size:12px;color:#64748B;margin-bottom:12px">${isPartial ? 'Remaining balance' : 'Total outstanding'}</div>
  <table>
    <tr><td class="lbl">Invoice Number</td><td class="val">${invoice.invoice_number}</td></tr>
    <tr><td class="lbl">Invoice Total</td><td class="val">₹${invoice.total.toLocaleString('en-IN')}</td></tr>
    ${isPartial ? `<tr><td class="lbl">Amount Paid</td><td class="val" style="color:#10B981">₹${(invoice.amount_paid ?? 0).toLocaleString('en-IN')}</td></tr>` : ''}
    <tr><td class="lbl">${isPartial ? 'Full Payment Due' : 'Invoice Date'}</td><td class="val" style="color:${isPartial ? '#D97706' : '#DC2626'}">${isPartial && invoice.full_payment_due_date ? invoice.full_payment_due_date : invoice.due_date || invoice.date}</td></tr>
  </table>
  <p style="font-size:13px;color:#475569;margin-top:16px">Please process the payment or reach out to us if you have any questions. We appreciate your prompt attention.</p>
  <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:10px 14px;margin:16px 0;font-size:12px;color:#64748B;font-style:italic">
    If you have already made this payment, please disregard this notice and accept our apologies for the inconvenience. Payments can take 1–2 business days to reflect in our records.
  </div>
  <p style="font-size:14px;color:#334155;margin-top:16px">Best regards,<br><strong>${ownerName}</strong><br><span style="color:#64748B">${businessName}</span></p>
</div>
<div class="footer">⚙ This is a system-generated automated reminder sent by BizDesk on behalf of ${businessName}. Please do not reply directly to this email.</div>
</div></body></html>`;
}

export async function runReminderCheck(): Promise<void> {
  const db = getDB();
  const today = todayStr();

  // Get active business + gmail credentials
  const business = db.prepare("SELECT * FROM businesses WHERE is_active = 1 LIMIT 1").get() as Record<string, string | number> | undefined;
  if (!business) return;

  const gmailUser = (db.prepare("SELECT value FROM settings WHERE key = 'gmail_user'").get() as { value: string } | undefined)?.value ?? '';
  if (!gmailUser) return; // email not configured, skip

  // Fetch unpaid + partial invoices that have a client email
  const invoices = db.prepare(`
    SELECT * FROM invoices
    WHERE business_id = ? AND is_deleted = 0 AND client_email != ''
      AND status IN ('unpaid', 'partial')
  `).all(business.id) as Invoice[];

  for (const inv of invoices) {
    const lastSent = inv.last_reminder_sent ?? '';

    // Rate limit: 2-day gap between reminders
    if (lastSent && daysBetween(lastSent, today) < 2) continue;

    let shouldSend = false;
    let reminderType: 'overdue' | 'partial_due' = 'overdue';

    if (inv.status === 'unpaid') {
      // Check if overdue based on due_date or payment_terms
      if (inv.due_date) {
        shouldSend = daysBetween(inv.due_date, today) >= 0; // due_date has passed
      } else {
        const termDays = parseTermsDays(inv.payment_terms ?? '');
        if (termDays >= 0) {
          const effectiveDue = new Date(inv.date);
          effectiveDue.setDate(effectiveDue.getDate() + termDays);
          shouldSend = daysBetween(effectiveDue.toISOString().split('T')[0], today) >= 0;
        }
      }
      reminderType = 'overdue';
    } else if (inv.status === 'partial') {
      // Check if full_payment_due_date is today or past
      if (inv.full_payment_due_date) {
        shouldSend = daysBetween(inv.full_payment_due_date, today) >= 0;
        reminderType = 'partial_due';
      }
    }

    if (!shouldSend) continue;

    const subject = reminderType === 'partial_due'
      ? `Reminder: Remaining Balance Due — Invoice ${inv.invoice_number}`
      : `Payment Overdue — Invoice ${inv.invoice_number}`;

    const html = buildReminderHtml(
      inv,
      String(business.name),
      String(business.email || ''),
      String(business.owner_name || business.name),
      reminderType
    );

    try {
      await sendEmail({
        to: inv.client_email,
        toName: inv.client_name,
        subject,
        bodyHtml: html,
        businessId: Number(business.id),
        senderName: String(business.name),
        relatedType: 'invoice',
        relatedId: inv.id,
      });

      // Update last_reminder_sent
      db.prepare("UPDATE invoices SET last_reminder_sent = ? WHERE id = ?").run(today, inv.id);
    } catch {
      // Silent fail — reminder worker should never crash the app
    }
  }
}
