import type { Business, Invoice, InvoiceItem } from '../../shared/types';

interface TemplateData {
  business: Business;
  invoice: Partial<Invoice> & { invoice_number: string; subtotal: number; tax_amount: number; total: number };
  items: Omit<InvoiceItem, 'id' | 'invoice_id'>[];
  qrDataUrl: string;
  upiId: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function generateInvoiceHTML(data: TemplateData): string {
  const { business, invoice, items, qrDataUrl, upiId } = data;

  const itemRows = items.map((item, i) => `
    <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
      <td class="col-num">${i + 1}</td>
      <td class="col-desc">
        <div class="item-title">${item.title}</div>
        ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
      </td>
      <td class="col-qty">${item.quantity}</td>
      <td class="col-rate">₹${formatCurrency(item.unit_price)}</td>
      <td class="col-amount">₹${formatCurrency(item.amount)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a1a2e; background: #fff; }
    .page { width: 210mm; min-height: 297mm; padding: 12mm 14mm; margin: 0 auto; background: #fff; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 3px solid #2563EB; }
    .business-info h1 { font-size: 22px; font-weight: 700; color: #1E293B; letter-spacing: -0.5px; }
    .business-info p { font-size: 12px; color: #64748B; margin-top: 3px; line-height: 1.6; }
    .invoice-meta { text-align: right; }
    .invoice-title { font-size: 32px; font-weight: 800; color: #2563EB; letter-spacing: -1px; text-transform: uppercase; }
    .invoice-number { font-size: 13px; color: #64748B; margin-top: 4px; font-weight: 600; }
    .invoice-date { font-size: 12px; color: #94A3B8; margin-top: 2px; }

    /* Bill To */
    .billing-section { display: flex; justify-content: space-between; margin-bottom: 28px; gap: 24px; }
    .bill-box { flex: 1; background: #F8FAFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; }
    .bill-box h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #2563EB; margin-bottom: 10px; }
    .bill-box .name { font-size: 15px; font-weight: 600; color: #1E293B; }
    .bill-box .detail { font-size: 12px; color: #64748B; margin-top: 4px; line-height: 1.6; }

    /* Items Table */
    .table-wrapper { margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #1E293B; }
    thead th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #fff; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody tr { border-bottom: 1px solid #F1F5F9; }
    .row-even { background: #fff; }
    .row-odd { background: #F8FAFF; }
    td { padding: 10px 12px; vertical-align: top; }
    .col-num { width: 36px; color: #94A3B8; font-size: 12px; }
    .col-desc { flex: 1; }
    .col-qty, .col-rate, .col-amount { width: 80px; text-align: right; }
    .item-title { font-weight: 600; color: #1E293B; }
    .item-desc { font-size: 11px; color: #94A3B8; margin-top: 2px; }
    thead .col-qty, thead .col-rate, thead .col-amount { text-align: right; }

    /* Totals */
    .totals-row { display: flex; justify-content: flex-end; margin-bottom: 28px; }
    .totals-box { width: 260px; }
    .totals-line { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9; }
    .totals-line.total { border-bottom: none; margin-top: 8px; padding: 12px 16px; background: #2563EB; border-radius: 8px; color: #fff; font-weight: 700; font-size: 16px; }
    .totals-line.total span { color: #fff; }

    /* Payment */
    .payment-section { display: flex; gap: 24px; margin-bottom: 28px; align-items: flex-start; }
    .payment-info { flex: 1; background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 8px; padding: 16px; }
    .payment-info h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #0284C7; margin-bottom: 12px; }
    .payment-info p { font-size: 12px; color: #0369A1; margin-bottom: 4px; }
    .payment-info strong { color: #1E293B; }
    .qr-box { text-align: center; }
    .qr-box img { width: 120px; height: 120px; border: 2px solid #E2E8F0; border-radius: 8px; padding: 4px; }
    .qr-box p { font-size: 10px; color: #94A3B8; margin-top: 6px; }

    /* Notes */
    .notes-section { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 14px; margin-bottom: 28px; }
    .notes-section h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #92400E; margin-bottom: 6px; }
    .notes-section p { font-size: 12px; color: #78350F; line-height: 1.6; }

    /* Footer */
    .footer { border-top: 2px solid #E2E8F0; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; }
    .footer-left p { font-size: 12px; color: #64748B; }
    .footer-right { text-align: right; font-size: 11px; color: #94A3B8; }
    .thank-you { font-size: 14px; font-weight: 600; color: #2563EB; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 10mm 12mm; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="business-info">
        <h1>${business.name}</h1>
        <p>
          ${business.owner_name}<br>
          ${business.address ? business.address + '<br>' : ''}
          ${business.phone ? 'Phone: ' + business.phone + '<br>' : ''}
          ${business.email ? 'Email: ' + business.email + '<br>' : ''}
          ${business.gst ? 'GSTIN: ' + business.gst + '<br>' : ''}
          ${business.pan ? 'PAN: ' + business.pan : ''}
        </p>
      </div>
      <div class="invoice-meta">
        <div class="invoice-title">Invoice</div>
        <div class="invoice-number">${invoice.invoice_number}</div>
        <div class="invoice-date">Date: ${formatDate(invoice.date || '')}</div>
        ${invoice.due_date ? `<div class="invoice-date">Due: ${formatDate(invoice.due_date)}</div>` : ''}
      </div>
    </div>

    <div class="billing-section">
      <div class="bill-box">
        <h3>Bill To</h3>
        <div class="name">${invoice.client_name}</div>
        ${invoice.client_address ? `<div class="detail">${invoice.client_address}</div>` : ''}
        ${invoice.client_email ? `<div class="detail">${invoice.client_email}</div>` : ''}
        ${invoice.client_phone ? `<div class="detail">${invoice.client_phone}</div>` : ''}
      </div>
      <div class="bill-box">
        <h3>Project Details</h3>
        <div class="name">${invoice.project_name}</div>
        <div class="detail">Invoice #: ${invoice.invoice_number}</div>
        <div class="detail">Date: ${formatDate(invoice.date || '')}</div>
        ${invoice.due_date ? `<div class="detail">Due Date: ${formatDate(invoice.due_date)}</div>` : ''}
      </div>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th class="col-num">#</th>
            <th class="col-desc">Description</th>
            <th class="col-qty" style="text-align:right">Qty</th>
            <th class="col-rate" style="text-align:right">Rate</th>
            <th class="col-amount" style="text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
    </div>

    <div class="totals-row">
      <div class="totals-box">
        <div class="totals-line">
          <span>Subtotal</span>
          <span>₹${formatCurrency(invoice.subtotal)}</span>
        </div>
        <div class="totals-line">
          <span>GST (${invoice.tax_percent || 18}%)</span>
          <span>₹${formatCurrency(invoice.tax_amount)}</span>
        </div>
        <div class="totals-line total">
          <span>Total Amount</span>
          <span>₹${formatCurrency(invoice.total)}</span>
        </div>
      </div>
    </div>

    ${(upiId || qrDataUrl) ? `
    <div class="payment-section">
      <div class="payment-info">
        <h3>Payment Information</h3>
        <p><strong>UPI ID:</strong> ${upiId}</p>
        <p><strong>Amount Due:</strong> ₹${formatCurrency(invoice.total)}</p>
        <p><strong>Reference:</strong> ${invoice.invoice_number}</p>
        ${business.gst ? `<p><strong>GSTIN:</strong> ${business.gst}</p>` : ''}
      </div>
      ${qrDataUrl ? `
      <div class="qr-box">
        <img src="${qrDataUrl}" alt="UPI QR Code" />
        <p>Scan to pay via UPI</p>
      </div>
      ` : ''}
    </div>
    ` : ''}

    ${invoice.notes ? `
    <div class="notes-section">
      <h3>Notes</h3>
      <p>${invoice.notes}</p>
    </div>
    ` : ''}

    <div class="footer">
      <div class="footer-left">
        <p class="thank-you">Thank you for your business!</p>
        <p>For queries: ${business.email || business.phone || ''}</p>
      </div>
      <div class="footer-right">
        <p>${business.name}</p>
        <p>Generated by InvoiceGenerator</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
