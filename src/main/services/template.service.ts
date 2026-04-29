import type { Business, Invoice, InvoiceItem } from '../../shared/types';

interface TemplateData {
  business: Business;
  invoice: Partial<Invoice> & { invoice_number: string; subtotal: number; tax_amount: number; total: number };
  items: Omit<InvoiceItem, 'id' | 'invoice_id'>[];
  qrDataUrl: string;
  upiId: string;
  upiName?: string;
  logoDataUrl?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getCurrencySymbol(currency: string): string {
  const map: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED ', SAR: 'SAR ' };
  return map[currency || 'INR'] || '₹';
}

function buildTotalsRows(inv: TemplateData['invoice'], sym: string): string {
  const discount = inv.discount_amount || 0;
  const shipping = inv.shipping_charges || 0;
  let rows = `<div class="totals-line"><span>Subtotal</span><span>${sym}${formatCurrency(inv.subtotal)}</span></div>`;
  if (discount > 0) rows += `<div class="totals-line discount"><span>Discount${inv.discount_percent ? ` (${inv.discount_percent}%)` : ''}</span><span>− ${sym}${formatCurrency(discount)}</span></div>`;
  if (shipping > 0) rows += `<div class="totals-line"><span>Shipping</span><span>${sym}${formatCurrency(shipping)}</span></div>`;
  rows += `<div class="totals-line"><span>Tax (${inv.tax_percent || 18}%)</span><span>${sym}${formatCurrency(inv.tax_amount)}</span></div>`;
  return rows;
}

function buildItemsRows(items: TemplateData['items'], sym: string, showHsn: boolean): string {
  return items.map((item, i) => `
    <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
      <td class="col-num">${i + 1}</td>
      <td class="col-desc">
        <div class="item-title">${item.title}</div>
        ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
        ${showHsn && item.hsn_sac ? `<div class="item-hsn">HSN/SAC: ${item.hsn_sac}</div>` : ''}
      </td>
      ${item.unit ? `<td class="col-unit">${item.unit}</td>` : ''}
      <td class="col-qty">${item.quantity}</td>
      <td class="col-rate">${sym}${formatCurrency(item.unit_price)}</td>
      <td class="col-amount">${sym}${formatCurrency(item.amount)}</td>
    </tr>
  `).join('');
}

function hasHsn(items: TemplateData['items']): boolean {
  return items.some(i => i.hsn_sac);
}

function hasUnit(items: TemplateData['items']): boolean {
  return items.some(i => i.unit);
}

function buildPaymentBankSection(data: TemplateData, accentColor: string): string {
  const { invoice, upiId, upiName, qrDataUrl } = data;
  const sym = getCurrencySymbol(invoice.currency || 'INR');
  const hasBank = invoice.bank_account || invoice.bank_name || invoice.bank_ifsc;
  if (!upiId && !hasBank) return '';

  return `
    <div class="payment-section">
      ${upiId ? `
      <div class="payment-info" style="border-color:${accentColor}20;">
        <h3 style="color:${accentColor};">PAYMENT DETAILS</h3>
        <p><strong>UPI ID:</strong> ${upiId}</p>
        ${upiName ? `<p><strong>UPI Name:</strong> ${upiName}</p>` : ''}
        <p><strong>Amount Due:</strong> ${sym}${formatCurrency(invoice.total)}</p>
        <p><strong>Reference:</strong> ${invoice.invoice_number}</p>
      </div>
      ` : ''}
      ${hasBank ? `
      <div class="bank-info" style="border-color:${accentColor}20;">
        <h3 style="color:${accentColor};">BANK TRANSFER</h3>
        ${invoice.bank_holder ? `<p><strong>Account Name:</strong> ${invoice.bank_holder}</p>` : ''}
        ${invoice.bank_name ? `<p><strong>Bank:</strong> ${invoice.bank_name}</p>` : ''}
        ${invoice.bank_account ? `<p><strong>Account No:</strong> ${invoice.bank_account}</p>` : ''}
        ${invoice.bank_ifsc ? `<p><strong>IFSC Code:</strong> ${invoice.bank_ifsc}</p>` : ''}
      </div>
      ` : ''}
      ${qrDataUrl ? `
      <div class="qr-box">
        <img src="${qrDataUrl}" alt="UPI QR Code" />
        <p>Scan to pay via UPI</p>
      </div>
      ` : ''}
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 1: Modern Blue (Default)
// ─────────────────────────────────────────────────────────────────────────────
function template_modern_blue(data: TemplateData): string {
  const { business, invoice, items, logoDataUrl } = data;
  const sym = getCurrencySymbol(invoice.currency || 'INR');
  const showHsn = hasHsn(items);
  const showUnit = hasUnit(items);

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Invoice ${invoice.invoice_number}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI',Arial,sans-serif; font-size:13px; color:#1a1a2e; background:#fff; }
.page { width:210mm; min-height:297mm; padding:12mm 14mm; margin:0 auto; background:#fff; }
.header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; padding-bottom:20px; border-bottom:3px solid #2563EB; }
.biz-left { display:flex; align-items:flex-start; gap:14px; }
.logo-img { width:60px; height:60px; object-fit:contain; border-radius:6px; }
.business-info h1 { font-size:20px; font-weight:700; color:#1E293B; }
.business-info p { font-size:11px; color:#64748B; margin-top:3px; line-height:1.6; }
.invoice-meta { text-align:right; }
.invoice-title { font-size:30px; font-weight:800; color:#2563EB; text-transform:uppercase; letter-spacing:-1px; }
.invoice-number { font-size:12px; color:#64748B; margin-top:4px; font-weight:600; }
.invoice-date { font-size:11px; color:#94A3B8; margin-top:2px; }
.billing-section { display:flex; gap:16px; margin-bottom:24px; }
.bill-box { flex:1; background:#F8FAFF; border:1px solid #E2E8F0; border-radius:8px; padding:14px; }
.bill-box h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#2563EB; margin-bottom:8px; }
.bill-box .name { font-size:14px; font-weight:600; color:#1E293B; }
.bill-box .detail { font-size:11px; color:#64748B; margin-top:3px; line-height:1.6; }
.table-wrapper { margin-bottom:20px; }
table { width:100%; border-collapse:collapse; }
thead tr { background:#1E293B; }
thead th { padding:9px 10px; text-align:left; font-size:10px; font-weight:600; color:#fff; text-transform:uppercase; letter-spacing:0.5px; }
tbody tr { border-bottom:1px solid #F1F5F9; }
.row-even { background:#fff; }
.row-odd { background:#F8FAFF; }
td { padding:9px 10px; vertical-align:top; }
.col-num { width:32px; color:#94A3B8; font-size:11px; }
.col-unit { width:60px; text-align:center; }
.col-qty,.col-rate,.col-amount { width:80px; text-align:right; }
.item-title { font-weight:600; color:#1E293B; }
.item-desc { font-size:10px; color:#94A3B8; margin-top:2px; }
.item-hsn { font-size:9px; color:#94A3B8; margin-top:1px; }
thead .col-qty,thead .col-rate,thead .col-amount,thead .col-unit { text-align:right; }
.totals-row { display:flex; justify-content:flex-end; margin-bottom:24px; }
.totals-box { width:260px; }
.totals-line { display:flex; justify-content:space-between; padding:5px 0; font-size:12px; color:#64748B; border-bottom:1px solid #F1F5F9; }
.totals-line.discount { color:#EF4444; }
.totals-total { display:flex; justify-content:space-between; margin-top:8px; padding:11px 14px; background:#2563EB; border-radius:8px; color:#fff; font-weight:700; font-size:15px; }
.payment-section { display:flex; gap:16px; margin-bottom:24px; flex-wrap:wrap; }
.payment-info,.bank-info { flex:1; min-width:160px; background:#F0F9FF; border:1px solid #BAE6FD; border-radius:8px; padding:14px; }
.payment-info h3,.bank-info h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#0284C7; margin-bottom:10px; }
.payment-info p,.bank-info p { font-size:11px; color:#0369A1; margin-bottom:3px; }
.payment-info strong,.bank-info strong { color:#1E293B; }
.qr-box { text-align:center; }
.qr-box img { width:110px; height:110px; border:2px solid #E2E8F0; border-radius:8px; padding:4px; }
.qr-box p { font-size:9px; color:#94A3B8; margin-top:5px; }
.notes-section { background:#FFFBEB; border:1px solid #FDE68A; border-radius:8px; padding:12px; margin-bottom:24px; }
.notes-section h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#92400E; margin-bottom:5px; }
.notes-section p { font-size:11px; color:#78350F; line-height:1.6; }
.footer { border-top:2px solid #E2E8F0; padding-top:14px; display:flex; justify-content:space-between; align-items:center; }
.footer p { font-size:11px; color:#64748B; }
.thank-you { font-size:13px; font-weight:600; color:#2563EB; }
.footer-right { text-align:right; font-size:10px; color:#94A3B8; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } .page { padding:10mm 12mm; } }
</style></head><body><div class="page">
<div class="header">
  <div class="biz-left">
    ${logoDataUrl ? `<img class="logo-img" src="${logoDataUrl}" alt="Logo" />` : ''}
    <div class="business-info">
      <h1>${business.name}</h1>
      <p>${business.owner_name}${business.address ? '<br>' + business.address : ''}${business.phone ? '<br>Phone: ' + business.phone : ''}${business.email ? '<br>Email: ' + business.email : ''}${business.gst ? '<br>GSTIN: ' + business.gst : ''}${business.pan ? '<br>PAN: ' + business.pan : ''}</p>
    </div>
  </div>
  <div class="invoice-meta">
    <div class="invoice-title">Invoice</div>
    <div class="invoice-number">${invoice.invoice_number}</div>
    <div class="invoice-date">Date: ${formatDate(invoice.date || '')}</div>
    ${invoice.due_date ? `<div class="invoice-date">Due: ${formatDate(invoice.due_date)}</div>` : ''}
    ${invoice.status === 'paid' ? `<div style="margin-top:6px;display:inline-block;background:#10B981;color:#fff;padding:2px 10px;border-radius:99px;font-size:10px;font-weight:700;">PAID</div>` : ''}
  </div>
</div>
<div class="billing-section">
  <div class="bill-box">
    <h3>Bill To</h3>
    <div class="name">${invoice.client_name}</div>
    ${invoice.client_address ? `<div class="detail">${invoice.client_address}</div>` : ''}
    ${invoice.client_email ? `<div class="detail">${invoice.client_email}</div>` : ''}
    ${invoice.client_phone ? `<div class="detail">${invoice.client_phone}</div>` : ''}
    ${invoice.client_gst ? `<div class="detail">GSTIN: ${invoice.client_gst}</div>` : ''}
  </div>
  <div class="bill-box">
    <h3>Invoice Details</h3>
    <div class="name">${invoice.project_name}</div>
    <div class="detail">Invoice #: ${invoice.invoice_number}</div>
    <div class="detail">Date: ${formatDate(invoice.date || '')}</div>
    ${invoice.due_date ? `<div class="detail">Due: ${formatDate(invoice.due_date)}</div>` : ''}
    ${invoice.po_number ? `<div class="detail">PO #: ${invoice.po_number}</div>` : ''}
    ${invoice.place_of_supply ? `<div class="detail">Place of Supply: ${invoice.place_of_supply}</div>` : ''}
    ${invoice.payment_terms ? `<div class="detail">Terms: ${invoice.payment_terms}</div>` : ''}
  </div>
</div>
<div class="table-wrapper"><table>
  <thead><tr>
    <th class="col-num">#</th><th>Description</th>
    ${showUnit ? '<th class="col-unit" style="text-align:center">Unit</th>' : ''}
    <th class="col-qty" style="text-align:right">Qty</th>
    <th class="col-rate" style="text-align:right">Rate</th>
    <th class="col-amount" style="text-align:right">Amount</th>
  </tr></thead>
  <tbody>${buildItemsRows(items, sym, showHsn)}</tbody>
</table></div>
<div class="totals-row"><div class="totals-box">
  ${buildTotalsRows(invoice, sym)}
  <div class="totals-total"><span>Total Amount</span><span>${sym}${formatCurrency(invoice.total)}</span></div>
</div></div>
${buildPaymentBankSection(data, '#2563EB')}
${invoice.notes ? `<div class="notes-section"><h3>Notes</h3><p>${invoice.notes}</p></div>` : ''}
<div class="footer">
  <div><p class="thank-you">Thank you for your business!</p>${invoice.payment_terms ? `<p>Payment Terms: ${invoice.payment_terms}</p>` : ''}<p>Contact: ${business.email || business.phone || ''}</p></div>
  <div class="footer-right"><p>${business.name}</p><p>Generated by InvoDesk</p></div>
</div>
</div></body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 2: Minimal White
// ─────────────────────────────────────────────────────────────────────────────
function template_minimal_white(data: TemplateData): string {
  const { business, invoice, items, logoDataUrl } = data;
  const sym = getCurrencySymbol(invoice.currency || 'INR');
  const showHsn = hasHsn(items);
  const showUnit = hasUnit(items);

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Invoice ${invoice.invoice_number}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI',Arial,sans-serif; font-size:13px; color:#111827; background:#fff; }
.page { width:210mm; min-height:297mm; padding:14mm 16mm; margin:0 auto; background:#fff; }
.header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; border-bottom:1px solid #D1D5DB; padding-bottom:20px; }
.biz-left { display:flex; align-items:flex-start; gap:14px; }
.logo-img { width:56px; height:56px; object-fit:contain; }
.business-info h1 { font-size:18px; font-weight:700; color:#111827; letter-spacing:-0.3px; }
.business-info p { font-size:11px; color:#6B7280; margin-top:4px; line-height:1.7; }
.invoice-meta { text-align:right; }
.invoice-title { font-size:28px; font-weight:300; color:#9CA3AF; text-transform:uppercase; letter-spacing:6px; }
.invoice-number { font-size:13px; color:#374151; margin-top:6px; font-weight:600; }
.invoice-date { font-size:11px; color:#9CA3AF; margin-top:2px; }
.billing-section { display:flex; gap:20px; margin-bottom:28px; }
.bill-box { flex:1; border-left:2px solid #E5E7EB; padding-left:14px; }
.bill-box h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:#9CA3AF; margin-bottom:8px; }
.bill-box .name { font-size:14px; font-weight:600; color:#111827; }
.bill-box .detail { font-size:11px; color:#6B7280; margin-top:3px; line-height:1.6; }
table { width:100%; border-collapse:collapse; margin-bottom:24px; }
thead th { padding:8px 10px; text-align:left; font-size:9px; font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:1px; border-bottom:1px solid #E5E7EB; }
td { padding:10px 10px; vertical-align:top; border-bottom:1px solid #F3F4F6; }
.col-num { width:28px; color:#D1D5DB; font-size:11px; }
.col-unit { width:60px; text-align:center; }
.col-qty,.col-rate,.col-amount { width:80px; text-align:right; }
thead .col-qty,thead .col-rate,thead .col-amount,thead .col-unit { text-align:right; }
.item-title { font-weight:600; color:#111827; }
.item-desc { font-size:10px; color:#9CA3AF; margin-top:2px; }
.item-hsn { font-size:9px; color:#9CA3AF; margin-top:1px; }
.totals-row { display:flex; justify-content:flex-end; margin-bottom:28px; }
.totals-box { width:240px; }
.totals-line { display:flex; justify-content:space-between; padding:5px 0; font-size:12px; color:#6B7280; border-bottom:1px solid #F3F4F6; }
.totals-line.discount { color:#EF4444; }
.totals-total { display:flex; justify-content:space-between; margin-top:10px; padding:10px 0; border-top:2px solid #111827; font-weight:700; font-size:16px; color:#111827; }
.payment-section { display:flex; gap:16px; margin-bottom:24px; flex-wrap:wrap; }
.payment-info,.bank-info { flex:1; min-width:160px; border:1px solid #E5E7EB; padding:14px; }
.payment-info h3,.bank-info h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:#6B7280; margin-bottom:10px; }
.payment-info p,.bank-info p { font-size:11px; color:#374151; margin-bottom:3px; }
.qr-box { text-align:center; }
.qr-box img { width:100px; height:100px; padding:4px; border:1px solid #E5E7EB; }
.qr-box p { font-size:9px; color:#9CA3AF; margin-top:5px; }
.notes-section { border-left:3px solid #E5E7EB; padding:10px 14px; margin-bottom:24px; }
.notes-section h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:#9CA3AF; margin-bottom:5px; }
.notes-section p { font-size:11px; color:#6B7280; line-height:1.7; }
.footer { border-top:1px solid #E5E7EB; padding-top:14px; display:flex; justify-content:space-between; align-items:center; }
.footer p { font-size:10px; color:#9CA3AF; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head><body><div class="page">
<div class="header">
  <div class="biz-left">
    ${logoDataUrl ? `<img class="logo-img" src="${logoDataUrl}" alt="Logo" />` : ''}
    <div class="business-info">
      <h1>${business.name}</h1>
      <p>${business.owner_name}${business.address ? '<br>' + business.address : ''}${business.phone ? '<br>' + business.phone : ''}${business.email ? '<br>' + business.email : ''}${business.gst ? '<br>GSTIN: ' + business.gst : ''}</p>
    </div>
  </div>
  <div class="invoice-meta">
    <div class="invoice-title">Invoice</div>
    <div class="invoice-number">${invoice.invoice_number}</div>
    <div class="invoice-date">${formatDate(invoice.date || '')}</div>
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
    ${invoice.client_gst ? `<div class="detail">GSTIN: ${invoice.client_gst}</div>` : ''}
  </div>
  <div class="bill-box">
    <h3>Project</h3>
    <div class="name">${invoice.project_name}</div>
    ${invoice.po_number ? `<div class="detail">PO #: ${invoice.po_number}</div>` : ''}
    ${invoice.place_of_supply ? `<div class="detail">Supply: ${invoice.place_of_supply}</div>` : ''}
    ${invoice.payment_terms ? `<div class="detail">Terms: ${invoice.payment_terms}</div>` : ''}
  </div>
</div>
<table>
  <thead><tr>
    <th class="col-num">#</th><th>Description</th>
    ${showUnit ? '<th class="col-unit">Unit</th>' : ''}
    <th class="col-qty" style="text-align:right">Qty</th>
    <th class="col-rate" style="text-align:right">Rate</th>
    <th class="col-amount" style="text-align:right">Amount</th>
  </tr></thead>
  <tbody>${buildItemsRows(items, sym, showHsn)}</tbody>
</table>
<div class="totals-row"><div class="totals-box">
  ${buildTotalsRows(invoice, sym)}
  <div class="totals-total"><span>Total</span><span>${sym}${formatCurrency(invoice.total)}</span></div>
</div></div>
${buildPaymentBankSection(data, '#374151')}
${invoice.notes ? `<div class="notes-section"><h3>Notes</h3><p>${invoice.notes}</p></div>` : ''}
<div class="footer">
  <p>${business.name} · ${business.email || ''}</p>
  <p>Generated by InvoDesk</p>
</div>
</div></body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 3: Dark Corporate
// ─────────────────────────────────────────────────────────────────────────────
function template_dark_corporate(data: TemplateData): string {
  const { business, invoice, items, logoDataUrl } = data;
  const sym = getCurrencySymbol(invoice.currency || 'INR');
  const showHsn = hasHsn(items);
  const showUnit = hasUnit(items);

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Invoice ${invoice.invoice_number}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI',Arial,sans-serif; font-size:13px; color:#1E293B; background:#fff; }
.page { width:210mm; min-height:297mm; padding:0; margin:0 auto; background:#fff; }
.header { background:#0F172A; color:#fff; padding:20px 16mm; display:flex; justify-content:space-between; align-items:flex-start; }
.biz-left { display:flex; align-items:flex-start; gap:14px; }
.logo-img { width:56px; height:56px; object-fit:contain; border-radius:6px; background:#1E293B; padding:4px; }
.business-info h1 { font-size:18px; font-weight:700; color:#fff; }
.business-info p { font-size:11px; color:#94A3B8; margin-top:3px; line-height:1.6; }
.invoice-meta { text-align:right; }
.invoice-title { font-size:28px; font-weight:800; color:#3B82F6; text-transform:uppercase; letter-spacing:-1px; }
.invoice-number { font-size:12px; color:#94A3B8; margin-top:4px; }
.invoice-date { font-size:11px; color:#64748B; margin-top:2px; }
.body-content { padding:16px 16mm 0; }
.billing-section { display:flex; gap:16px; margin-bottom:24px; }
.bill-box { flex:1; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:6px; padding:14px; }
.bill-box h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:#3B82F6; margin-bottom:8px; }
.bill-box .name { font-size:14px; font-weight:600; color:#0F172A; }
.bill-box .detail { font-size:11px; color:#64748B; margin-top:3px; line-height:1.6; }
table { width:100%; border-collapse:collapse; margin-bottom:22px; }
thead tr { background:#1E293B; }
thead th { padding:9px 10px; text-align:left; font-size:10px; font-weight:600; color:#fff; text-transform:uppercase; letter-spacing:0.5px; }
td { padding:9px 10px; vertical-align:top; }
.row-even { background:#fff; border-bottom:1px solid #F1F5F9; }
.row-odd { background:#F8FAFC; border-bottom:1px solid #F1F5F9; }
.col-num { width:32px; color:#94A3B8; font-size:11px; }
.col-unit { width:60px; text-align:center; }
.col-qty,.col-rate,.col-amount { width:80px; text-align:right; }
thead .col-qty,thead .col-rate,thead .col-amount,thead .col-unit { text-align:right; }
.item-title { font-weight:600; color:#0F172A; }
.item-desc { font-size:10px; color:#94A3B8; margin-top:2px; }
.item-hsn { font-size:9px; color:#94A3B8; }
.totals-row { display:flex; justify-content:flex-end; margin-bottom:22px; }
.totals-box { width:260px; }
.totals-line { display:flex; justify-content:space-between; padding:5px 0; font-size:12px; color:#64748B; border-bottom:1px solid #F1F5F9; }
.totals-line.discount { color:#EF4444; }
.totals-total { display:flex; justify-content:space-between; margin-top:8px; padding:12px 16px; background:#0F172A; border-radius:6px; color:#fff; font-weight:700; font-size:15px; }
.payment-section { display:flex; gap:14px; margin-bottom:22px; flex-wrap:wrap; }
.payment-info,.bank-info { flex:1; min-width:150px; background:#EFF6FF; border:1px solid #BFDBFE; border-radius:6px; padding:13px; }
.payment-info h3,.bank-info h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#3B82F6; margin-bottom:9px; }
.payment-info p,.bank-info p { font-size:11px; color:#1E40AF; margin-bottom:3px; }
.payment-info strong,.bank-info strong { color:#0F172A; }
.qr-box { text-align:center; }
.qr-box img { width:100px; height:100px; border:2px solid #E2E8F0; border-radius:6px; padding:3px; }
.qr-box p { font-size:9px; color:#94A3B8; margin-top:4px; }
.notes-section { background:#FFFBEB; border:1px solid #FDE68A; border-radius:6px; padding:12px; margin-bottom:0; }
.notes-section h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#92400E; margin-bottom:5px; }
.notes-section p { font-size:11px; color:#78350F; line-height:1.6; }
.footer { background:#0F172A; padding:14px 16mm; display:flex; justify-content:space-between; align-items:center; margin-top:16px; }
.footer p { font-size:10px; color:#64748B; }
.thank-you { font-size:12px; font-weight:600; color:#3B82F6; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head><body><div class="page">
<div class="header">
  <div class="biz-left">
    ${logoDataUrl ? `<img class="logo-img" src="${logoDataUrl}" alt="Logo" />` : ''}
    <div class="business-info">
      <h1>${business.name}</h1>
      <p>${business.owner_name}${business.address ? '<br>' + business.address : ''}${business.phone ? '<br>' + business.phone : ''}${business.email ? '<br>' + business.email : ''}${business.gst ? '<br>GSTIN: ' + business.gst : ''}</p>
    </div>
  </div>
  <div class="invoice-meta">
    <div class="invoice-title">Invoice</div>
    <div class="invoice-number">${invoice.invoice_number}</div>
    <div class="invoice-date">Date: ${formatDate(invoice.date || '')}</div>
    ${invoice.due_date ? `<div class="invoice-date">Due: ${formatDate(invoice.due_date)}</div>` : ''}
  </div>
</div>
<div class="body-content">
<div class="billing-section">
  <div class="bill-box">
    <h3>Bill To</h3>
    <div class="name">${invoice.client_name}</div>
    ${invoice.client_address ? `<div class="detail">${invoice.client_address}</div>` : ''}
    ${invoice.client_email ? `<div class="detail">${invoice.client_email}</div>` : ''}
    ${invoice.client_phone ? `<div class="detail">${invoice.client_phone}</div>` : ''}
    ${invoice.client_gst ? `<div class="detail">GSTIN: ${invoice.client_gst}</div>` : ''}
  </div>
  <div class="bill-box">
    <h3>Project Details</h3>
    <div class="name">${invoice.project_name}</div>
    ${invoice.po_number ? `<div class="detail">PO #: ${invoice.po_number}</div>` : ''}
    ${invoice.place_of_supply ? `<div class="detail">Place of Supply: ${invoice.place_of_supply}</div>` : ''}
    ${invoice.payment_terms ? `<div class="detail">Terms: ${invoice.payment_terms}</div>` : ''}
  </div>
</div>
<table>
  <thead><tr>
    <th class="col-num">#</th><th>Description</th>
    ${showUnit ? '<th class="col-unit" style="text-align:center">Unit</th>' : ''}
    <th class="col-qty" style="text-align:right">Qty</th>
    <th class="col-rate" style="text-align:right">Rate</th>
    <th class="col-amount" style="text-align:right">Amount</th>
  </tr></thead>
  <tbody>${buildItemsRows(items, sym, showHsn)}</tbody>
</table>
<div class="totals-row"><div class="totals-box">
  ${buildTotalsRows(invoice, sym)}
  <div class="totals-total"><span>Total Amount</span><span>${sym}${formatCurrency(invoice.total)}</span></div>
</div></div>
${buildPaymentBankSection(data, '#3B82F6')}
${invoice.notes ? `<div class="notes-section"><h3>Notes</h3><p>${invoice.notes}</p></div>` : ''}
</div>
<div class="footer">
  <p class="thank-you">Thank you for your business!</p>
  <p>${business.name} · Generated by InvoDesk</p>
</div>
</div></body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 4: Forest Green
// ─────────────────────────────────────────────────────────────────────────────
function template_forest_green(data: TemplateData): string {
  const { business, invoice, items, logoDataUrl } = data;
  const sym = getCurrencySymbol(invoice.currency || 'INR');
  const showHsn = hasHsn(items);
  const showUnit = hasUnit(items);

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Invoice ${invoice.invoice_number}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI',Arial,sans-serif; font-size:13px; color:#1C2B1F; background:#fff; }
.page { width:210mm; min-height:297mm; padding:12mm 14mm; margin:0 auto; }
.header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; padding-bottom:20px; border-bottom:3px solid #166534; }
.biz-left { display:flex; align-items:flex-start; gap:14px; }
.logo-img { width:56px; height:56px; object-fit:contain; border-radius:8px; }
.business-info h1 { font-size:19px; font-weight:700; color:#14532D; }
.business-info p { font-size:11px; color:#166534; margin-top:3px; line-height:1.6; opacity:0.85; }
.invoice-meta { text-align:right; }
.invoice-title { font-size:28px; font-weight:800; color:#166534; text-transform:uppercase; letter-spacing:-0.5px; }
.invoice-number { font-size:12px; color:#4B5563; margin-top:4px; font-weight:600; }
.invoice-date { font-size:11px; color:#6B7280; margin-top:2px; }
.billing-section { display:flex; gap:16px; margin-bottom:24px; }
.bill-box { flex:1; background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:14px; }
.bill-box h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#166534; margin-bottom:8px; }
.bill-box .name { font-size:14px; font-weight:600; color:#14532D; }
.bill-box .detail { font-size:11px; color:#4B5563; margin-top:3px; line-height:1.6; }
table { width:100%; border-collapse:collapse; margin-bottom:22px; }
thead tr { background:#166534; }
thead th { padding:9px 10px; text-align:left; font-size:10px; font-weight:600; color:#fff; text-transform:uppercase; letter-spacing:0.5px; }
td { padding:9px 10px; vertical-align:top; border-bottom:1px solid #F0FDF4; }
.row-even { background:#fff; }
.row-odd { background:#F0FDF4; }
.col-num { width:32px; color:#9CA3AF; font-size:11px; }
.col-unit { width:60px; text-align:center; }
.col-qty,.col-rate,.col-amount { width:80px; text-align:right; }
thead .col-qty,thead .col-rate,thead .col-amount,thead .col-unit { text-align:right; }
.item-title { font-weight:600; color:#14532D; }
.item-desc { font-size:10px; color:#6B7280; margin-top:2px; }
.item-hsn { font-size:9px; color:#9CA3AF; }
.totals-row { display:flex; justify-content:flex-end; margin-bottom:22px; }
.totals-box { width:250px; }
.totals-line { display:flex; justify-content:space-between; padding:5px 0; font-size:12px; color:#4B5563; border-bottom:1px solid #DCFCE7; }
.totals-line.discount { color:#EF4444; }
.totals-total { display:flex; justify-content:space-between; margin-top:8px; padding:11px 14px; background:#166534; border-radius:8px; color:#fff; font-weight:700; font-size:15px; }
.payment-section { display:flex; gap:14px; margin-bottom:22px; flex-wrap:wrap; }
.payment-info,.bank-info { flex:1; min-width:150px; background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:13px; }
.payment-info h3,.bank-info h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#166534; margin-bottom:9px; }
.payment-info p,.bank-info p { font-size:11px; color:#15803D; margin-bottom:3px; }
.payment-info strong,.bank-info strong { color:#14532D; }
.qr-box { text-align:center; }
.qr-box img { width:100px; height:100px; border:2px solid #BBF7D0; border-radius:8px; padding:3px; }
.qr-box p { font-size:9px; color:#9CA3AF; margin-top:4px; }
.notes-section { background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:12px; margin-bottom:22px; }
.notes-section h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#166534; margin-bottom:5px; }
.notes-section p { font-size:11px; color:#15803D; line-height:1.6; }
.footer { border-top:2px solid #BBF7D0; padding-top:14px; display:flex; justify-content:space-between; }
.footer p { font-size:10px; color:#6B7280; }
.thank-you { font-size:12px; font-weight:600; color:#166534; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head><body><div class="page">
<div class="header">
  <div class="biz-left">
    ${logoDataUrl ? `<img class="logo-img" src="${logoDataUrl}" alt="Logo" />` : ''}
    <div class="business-info">
      <h1>${business.name}</h1>
      <p>${business.owner_name}${business.address ? '<br>' + business.address : ''}${business.phone ? '<br>' + business.phone : ''}${business.email ? '<br>' + business.email : ''}${business.gst ? '<br>GSTIN: ' + business.gst : ''}</p>
    </div>
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
    ${invoice.client_gst ? `<div class="detail">GSTIN: ${invoice.client_gst}</div>` : ''}
  </div>
  <div class="bill-box">
    <h3>Invoice Details</h3>
    <div class="name">${invoice.project_name}</div>
    ${invoice.po_number ? `<div class="detail">PO #: ${invoice.po_number}</div>` : ''}
    ${invoice.place_of_supply ? `<div class="detail">Place: ${invoice.place_of_supply}</div>` : ''}
    ${invoice.payment_terms ? `<div class="detail">Terms: ${invoice.payment_terms}</div>` : ''}
  </div>
</div>
<table>
  <thead><tr>
    <th class="col-num">#</th><th>Description</th>
    ${showUnit ? '<th class="col-unit" style="text-align:center">Unit</th>' : ''}
    <th class="col-qty" style="text-align:right">Qty</th>
    <th class="col-rate" style="text-align:right">Rate</th>
    <th class="col-amount" style="text-align:right">Amount</th>
  </tr></thead>
  <tbody>${buildItemsRows(items, sym, showHsn)}</tbody>
</table>
<div class="totals-row"><div class="totals-box">
  ${buildTotalsRows(invoice, sym)}
  <div class="totals-total"><span>Total</span><span>${sym}${formatCurrency(invoice.total)}</span></div>
</div></div>
${buildPaymentBankSection(data, '#166534')}
${invoice.notes ? `<div class="notes-section"><h3>Notes</h3><p>${invoice.notes}</p></div>` : ''}
<div class="footer">
  <div><p class="thank-you">Thank you for your business!</p></div>
  <p>${business.name} · Generated by InvoDesk</p>
</div>
</div></body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 5: Classic Serif
// ─────────────────────────────────────────────────────────────────────────────
function template_classic_serif(data: TemplateData): string {
  const { business, invoice, items, logoDataUrl } = data;
  const sym = getCurrencySymbol(invoice.currency || 'INR');
  const showHsn = hasHsn(items);
  const showUnit = hasUnit(items);

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Invoice ${invoice.invoice_number}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:Georgia,'Times New Roman',serif; font-size:13px; color:#1a1a1a; background:#fff; }
.page { width:210mm; min-height:297mm; padding:14mm 16mm; margin:0 auto; }
.page-border { border:2px solid #1a1a1a; padding:12px; min-height:calc(297mm - 28mm); }
.header { border-bottom:3px double #1a1a1a; padding-bottom:16px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:flex-start; }
.biz-left { display:flex; align-items:flex-start; gap:14px; }
.logo-img { width:56px; height:56px; object-fit:contain; }
.business-info h1 { font-size:20px; font-weight:700; font-style:italic; color:#1a1a1a; }
.business-info p { font-size:11px; color:#444; margin-top:4px; line-height:1.7; }
.invoice-meta { text-align:right; }
.invoice-title { font-size:26px; font-weight:700; font-style:italic; color:#1a1a1a; }
.invoice-number { font-size:12px; margin-top:4px; font-family:'Segoe UI',sans-serif; }
.invoice-date { font-size:11px; color:#555; margin-top:2px; }
.billing-section { display:flex; gap:24px; margin-bottom:20px; }
.bill-box { flex:1; border:1px solid #1a1a1a; padding:12px; }
.bill-box h3 { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:2px; margin-bottom:8px; border-bottom:1px solid #1a1a1a; padding-bottom:4px; font-family:'Segoe UI',sans-serif; }
.bill-box .name { font-size:14px; font-weight:700; }
.bill-box .detail { font-size:11px; color:#444; margin-top:3px; line-height:1.6; }
table { width:100%; border-collapse:collapse; margin-bottom:20px; border:1px solid #1a1a1a; }
thead tr { background:#f5f5f5; }
thead th { padding:9px 10px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #1a1a1a; font-family:'Segoe UI',sans-serif; }
td { padding:9px 10px; vertical-align:top; border:1px solid #ddd; }
.col-num { width:32px; text-align:center; }
.col-unit { width:60px; text-align:center; }
.col-qty,.col-rate,.col-amount { width:80px; text-align:right; }
thead .col-qty,thead .col-rate,thead .col-amount,thead .col-unit { text-align:right; }
.item-title { font-weight:700; }
.item-desc { font-size:10px; color:#666; margin-top:2px; }
.item-hsn { font-size:9px; color:#888; font-family:'Segoe UI',sans-serif; }
.totals-row { display:flex; justify-content:flex-end; margin-bottom:20px; }
.totals-box { width:250px; border:1px solid #1a1a1a; }
.totals-line { display:flex; justify-content:space-between; padding:6px 10px; font-size:12px; border-bottom:1px solid #ddd; }
.totals-line.discount { color:#cc0000; }
.totals-total { display:flex; justify-content:space-between; padding:8px 10px; background:#1a1a1a; color:#fff; font-weight:700; font-size:14px; }
.payment-section { display:flex; gap:14px; margin-bottom:20px; flex-wrap:wrap; }
.payment-info,.bank-info { flex:1; min-width:150px; border:1px solid #1a1a1a; padding:12px; }
.payment-info h3,.bank-info h3 { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; border-bottom:1px solid #1a1a1a; padding-bottom:4px; font-family:'Segoe UI',sans-serif; }
.payment-info p,.bank-info p { font-size:11px; color:#333; margin-bottom:3px; }
.qr-box { text-align:center; }
.qr-box img { width:100px; height:100px; border:1px solid #1a1a1a; padding:3px; }
.qr-box p { font-size:9px; color:#666; margin-top:4px; font-family:'Segoe UI',sans-serif; }
.notes-section { border:1px solid #1a1a1a; padding:12px; margin-bottom:20px; }
.notes-section h3 { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; font-family:'Segoe UI',sans-serif; }
.notes-section p { font-size:11px; color:#444; line-height:1.7; }
.footer { border-top:3px double #1a1a1a; padding-top:14px; display:flex; justify-content:space-between; font-size:11px; color:#555; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head><body><div class="page"><div class="page-border">
<div class="header">
  <div class="biz-left">
    ${logoDataUrl ? `<img class="logo-img" src="${logoDataUrl}" alt="Logo" />` : ''}
    <div class="business-info">
      <h1>${business.name}</h1>
      <p>${business.owner_name}${business.address ? '<br>' + business.address : ''}${business.phone ? '<br>' + business.phone : ''}${business.email ? '<br>' + business.email : ''}${business.gst ? '<br>GSTIN: ' + business.gst : ''}</p>
    </div>
  </div>
  <div class="invoice-meta">
    <div class="invoice-title">Tax Invoice</div>
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
    ${invoice.client_gst ? `<div class="detail">GSTIN: ${invoice.client_gst}</div>` : ''}
  </div>
  <div class="bill-box">
    <h3>Invoice Details</h3>
    <div class="name">${invoice.project_name}</div>
    ${invoice.po_number ? `<div class="detail">PO #: ${invoice.po_number}</div>` : ''}
    ${invoice.place_of_supply ? `<div class="detail">Place of Supply: ${invoice.place_of_supply}</div>` : ''}
    ${invoice.payment_terms ? `<div class="detail">Payment Terms: ${invoice.payment_terms}</div>` : ''}
  </div>
</div>
<table>
  <thead><tr>
    <th class="col-num">#</th><th>Description</th>
    ${showUnit ? '<th class="col-unit">Unit</th>' : ''}
    <th class="col-qty" style="text-align:right">Qty</th>
    <th class="col-rate" style="text-align:right">Rate (${sym})</th>
    <th class="col-amount" style="text-align:right">Amount (${sym})</th>
  </tr></thead>
  <tbody>${buildItemsRows(items, sym, showHsn)}</tbody>
</table>
<div class="totals-row"><div class="totals-box">
  ${buildTotalsRows(invoice, sym)}
  <div class="totals-total"><span>Total Amount</span><span>${sym}${formatCurrency(invoice.total)}</span></div>
</div></div>
${buildPaymentBankSection(data, '#1a1a1a')}
${invoice.notes ? `<div class="notes-section"><h3>Notes & Terms</h3><p>${invoice.notes}</p></div>` : ''}
<div class="footer">
  <p>Thank you for your business.</p>
  <p>${business.name} · Generated by InvoDesk</p>
</div>
</div></div></body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 6: Executive Gold
// ─────────────────────────────────────────────────────────────────────────────
function template_executive_gold(data: TemplateData): string {
  const { business, invoice, items, logoDataUrl } = data;
  const sym = getCurrencySymbol(invoice.currency || 'INR');
  const showHsn = hasHsn(items);
  const showUnit = hasUnit(items);

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Invoice ${invoice.invoice_number}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI',Arial,sans-serif; font-size:13px; color:#1E293B; background:#fff; }
.page { width:210mm; min-height:297mm; padding:0; margin:0 auto; }
.top-bar { background:#1E3A5F; height:6px; }
.header { background:#1E3A5F; color:#fff; padding:18px 16mm 18px; display:flex; justify-content:space-between; align-items:flex-start; }
.biz-left { display:flex; align-items:flex-start; gap:14px; }
.logo-img { width:56px; height:56px; object-fit:contain; border:2px solid #D4A017; border-radius:4px; padding:2px; background:#fff; }
.business-info h1 { font-size:18px; font-weight:700; color:#fff; }
.business-info p { font-size:11px; color:#93A8C4; margin-top:3px; line-height:1.6; }
.invoice-meta { text-align:right; }
.invoice-title { font-size:26px; font-weight:800; color:#D4A017; text-transform:uppercase; letter-spacing:2px; }
.invoice-number { font-size:12px; color:#93A8C4; margin-top:5px; }
.invoice-date { font-size:11px; color:#64748B; margin-top:2px; }
.gold-divider { height:3px; background:linear-gradient(90deg,#1E3A5F,#D4A017,#1E3A5F); margin:0; }
.body-content { padding:16px 16mm; }
.billing-section { display:flex; gap:16px; margin-bottom:22px; }
.bill-box { flex:1; border:1px solid #E2E8F0; border-top:3px solid #D4A017; padding:14px; border-radius:0 0 6px 6px; }
.bill-box h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:#D4A017; margin-bottom:8px; }
.bill-box .name { font-size:14px; font-weight:600; color:#1E3A5F; }
.bill-box .detail { font-size:11px; color:#64748B; margin-top:3px; line-height:1.6; }
table { width:100%; border-collapse:collapse; margin-bottom:22px; }
thead tr { background:#1E3A5F; }
thead th { padding:9px 10px; text-align:left; font-size:10px; font-weight:600; color:#D4A017; text-transform:uppercase; letter-spacing:0.5px; }
td { padding:9px 10px; vertical-align:top; border-bottom:1px solid #F1F5F9; }
.row-even { background:#fff; }
.row-odd { background:#FAFBFD; }
.col-num { width:32px; color:#94A3B8; font-size:11px; }
.col-unit { width:60px; text-align:center; }
.col-qty,.col-rate,.col-amount { width:80px; text-align:right; }
thead .col-qty,thead .col-rate,thead .col-amount,thead .col-unit { text-align:right; }
.item-title { font-weight:600; color:#1E3A5F; }
.item-desc { font-size:10px; color:#64748B; margin-top:2px; }
.item-hsn { font-size:9px; color:#94A3B8; }
.totals-row { display:flex; justify-content:flex-end; margin-bottom:20px; }
.totals-box { width:260px; border:1px solid #E2E8F0; }
.totals-line { display:flex; justify-content:space-between; padding:6px 12px; font-size:12px; color:#64748B; border-bottom:1px solid #F1F5F9; }
.totals-line.discount { color:#EF4444; }
.totals-total { display:flex; justify-content:space-between; padding:10px 12px; background:#1E3A5F; color:#D4A017; font-weight:700; font-size:15px; }
.payment-section { display:flex; gap:14px; margin-bottom:20px; flex-wrap:wrap; }
.payment-info,.bank-info { flex:1; min-width:150px; border:1px solid #E2E8F0; border-top:2px solid #D4A017; padding:13px; }
.payment-info h3,.bank-info h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#D4A017; margin-bottom:9px; }
.payment-info p,.bank-info p { font-size:11px; color:#475569; margin-bottom:3px; }
.payment-info strong,.bank-info strong { color:#1E3A5F; }
.qr-box { text-align:center; }
.qr-box img { width:100px; height:100px; border:2px solid #D4A017; padding:3px; }
.qr-box p { font-size:9px; color:#94A3B8; margin-top:4px; }
.notes-section { background:#FFFBEB; border-left:3px solid #D4A017; padding:12px; margin-bottom:20px; }
.notes-section h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#D4A017; margin-bottom:5px; }
.notes-section p { font-size:11px; color:#475569; line-height:1.6; }
.footer { background:#1E3A5F; padding:12px 16mm; display:flex; justify-content:space-between; align-items:center; }
.footer p { font-size:10px; color:#64748B; }
.thank-you { font-size:12px; font-weight:600; color:#D4A017; }
.bottom-bar { background:#D4A017; height:4px; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head><body><div class="page">
<div class="top-bar"></div>
<div class="header">
  <div class="biz-left">
    ${logoDataUrl ? `<img class="logo-img" src="${logoDataUrl}" alt="Logo" />` : ''}
    <div class="business-info">
      <h1>${business.name}</h1>
      <p>${business.owner_name}${business.address ? '<br>' + business.address : ''}${business.phone ? '<br>' + business.phone : ''}${business.email ? '<br>' + business.email : ''}${business.gst ? '<br>GSTIN: ' + business.gst : ''}</p>
    </div>
  </div>
  <div class="invoice-meta">
    <div class="invoice-title">Invoice</div>
    <div class="invoice-number">${invoice.invoice_number}</div>
    <div class="invoice-date">Date: ${formatDate(invoice.date || '')}</div>
    ${invoice.due_date ? `<div class="invoice-date">Due: ${formatDate(invoice.due_date)}</div>` : ''}
  </div>
</div>
<div class="gold-divider"></div>
<div class="body-content">
<div class="billing-section">
  <div class="bill-box">
    <h3>Bill To</h3>
    <div class="name">${invoice.client_name}</div>
    ${invoice.client_address ? `<div class="detail">${invoice.client_address}</div>` : ''}
    ${invoice.client_email ? `<div class="detail">${invoice.client_email}</div>` : ''}
    ${invoice.client_phone ? `<div class="detail">${invoice.client_phone}</div>` : ''}
    ${invoice.client_gst ? `<div class="detail">GSTIN: ${invoice.client_gst}</div>` : ''}
  </div>
  <div class="bill-box">
    <h3>Invoice Details</h3>
    <div class="name">${invoice.project_name}</div>
    ${invoice.po_number ? `<div class="detail">PO #: ${invoice.po_number}</div>` : ''}
    ${invoice.place_of_supply ? `<div class="detail">Place of Supply: ${invoice.place_of_supply}</div>` : ''}
    ${invoice.payment_terms ? `<div class="detail">Terms: ${invoice.payment_terms}</div>` : ''}
  </div>
</div>
<table>
  <thead><tr>
    <th class="col-num">#</th><th>Description</th>
    ${showUnit ? '<th class="col-unit" style="text-align:center">Unit</th>' : ''}
    <th class="col-qty" style="text-align:right">Qty</th>
    <th class="col-rate" style="text-align:right">Rate</th>
    <th class="col-amount" style="text-align:right">Amount</th>
  </tr></thead>
  <tbody>${buildItemsRows(items, sym, showHsn)}</tbody>
</table>
<div class="totals-row"><div class="totals-box">
  ${buildTotalsRows(invoice, sym)}
  <div class="totals-total"><span>Total Amount</span><span>${sym}${formatCurrency(invoice.total)}</span></div>
</div></div>
${buildPaymentBankSection(data, '#D4A017')}
${invoice.notes ? `<div class="notes-section"><h3>Notes</h3><p>${invoice.notes}</p></div>` : ''}
</div>
<div class="footer">
  <p class="thank-you">Thank you for your business!</p>
  <p>${business.name} · Generated by InvoDesk</p>
</div>
<div class="bottom-bar"></div>
</div></body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 7: Tech Purple
// ─────────────────────────────────────────────────────────────────────────────
function template_tech_purple(data: TemplateData): string {
  const { business, invoice, items, logoDataUrl } = data;
  const sym = getCurrencySymbol(invoice.currency || 'INR');
  const showHsn = hasHsn(items);
  const showUnit = hasUnit(items);

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Invoice ${invoice.invoice_number}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI',Arial,sans-serif; font-size:13px; color:#1E1B4B; background:#fff; }
.page { width:210mm; min-height:297mm; padding:0; margin:0 auto; }
.header { background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%); color:#fff; padding:20px 16mm; display:flex; justify-content:space-between; align-items:flex-start; }
.biz-left { display:flex; align-items:flex-start; gap:14px; }
.logo-img { width:56px; height:56px; object-fit:contain; border-radius:10px; background:rgba(255,255,255,0.15); padding:4px; }
.business-info h1 { font-size:18px; font-weight:700; color:#fff; }
.business-info p { font-size:11px; color:rgba(255,255,255,0.7); margin-top:3px; line-height:1.6; }
.invoice-meta { text-align:right; }
.invoice-title { font-size:30px; font-weight:800; color:#fff; text-transform:uppercase; letter-spacing:-1px; opacity:0.9; }
.invoice-number { font-size:12px; color:rgba(255,255,255,0.8); margin-top:4px; font-weight:600; }
.invoice-date { font-size:11px; color:rgba(255,255,255,0.6); margin-top:2px; }
.header-curve { height:20px; background:linear-gradient(135deg,#4F46E5,#7C3AED); border-radius:0 0 40px 40px; margin-bottom:16px; }
.body-content { padding:0 16mm 16px; }
.billing-section { display:flex; gap:16px; margin-bottom:22px; }
.bill-box { flex:1; background:#FAF5FF; border:1px solid #E9D5FF; border-radius:10px; padding:14px; }
.bill-box h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#7C3AED; margin-bottom:8px; }
.bill-box .name { font-size:14px; font-weight:600; color:#1E1B4B; }
.bill-box .detail { font-size:11px; color:#6B7280; margin-top:3px; line-height:1.6; }
table { width:100%; border-collapse:collapse; margin-bottom:22px; }
thead tr { background:linear-gradient(90deg,#4F46E5,#7C3AED); }
thead th { padding:9px 10px; text-align:left; font-size:10px; font-weight:600; color:#fff; text-transform:uppercase; letter-spacing:0.5px; }
td { padding:9px 10px; vertical-align:top; border-bottom:1px solid #F3F4F6; }
.row-even { background:#fff; }
.row-odd { background:#FAF5FF; }
.col-num { width:32px; color:#C4B5FD; font-size:11px; }
.col-unit { width:60px; text-align:center; }
.col-qty,.col-rate,.col-amount { width:80px; text-align:right; }
thead .col-qty,thead .col-rate,thead .col-amount,thead .col-unit { text-align:right; }
.item-title { font-weight:600; color:#1E1B4B; }
.item-desc { font-size:10px; color:#9CA3AF; margin-top:2px; }
.item-hsn { font-size:9px; color:#9CA3AF; }
.totals-row { display:flex; justify-content:flex-end; margin-bottom:22px; }
.totals-box { width:260px; }
.totals-line { display:flex; justify-content:space-between; padding:5px 0; font-size:12px; color:#6B7280; border-bottom:1px solid #F3F4F6; }
.totals-line.discount { color:#EF4444; }
.totals-total { display:flex; justify-content:space-between; margin-top:8px; padding:11px 16px; background:linear-gradient(90deg,#4F46E5,#7C3AED); border-radius:10px; color:#fff; font-weight:700; font-size:15px; }
.payment-section { display:flex; gap:14px; margin-bottom:22px; flex-wrap:wrap; }
.payment-info,.bank-info { flex:1; min-width:150px; background:#FAF5FF; border:1px solid #E9D5FF; border-radius:10px; padding:13px; }
.payment-info h3,.bank-info h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#7C3AED; margin-bottom:9px; }
.payment-info p,.bank-info p { font-size:11px; color:#5B21B6; margin-bottom:3px; }
.payment-info strong,.bank-info strong { color:#1E1B4B; }
.qr-box { text-align:center; }
.qr-box img { width:100px; height:100px; border:2px solid #E9D5FF; border-radius:10px; padding:3px; }
.qr-box p { font-size:9px; color:#9CA3AF; margin-top:4px; }
.notes-section { background:#FAF5FF; border:1px solid #E9D5FF; border-radius:10px; padding:12px; margin-bottom:22px; }
.notes-section h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#7C3AED; margin-bottom:5px; }
.notes-section p { font-size:11px; color:#5B21B6; line-height:1.6; }
.footer { border-top:2px solid #E9D5FF; padding-top:14px; margin:0 16mm 16mm; display:flex; justify-content:space-between; }
.footer p { font-size:10px; color:#9CA3AF; }
.thank-you { font-size:12px; font-weight:600; color:#7C3AED; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head><body><div class="page">
<div class="header">
  <div class="biz-left">
    ${logoDataUrl ? `<img class="logo-img" src="${logoDataUrl}" alt="Logo" />` : ''}
    <div class="business-info">
      <h1>${business.name}</h1>
      <p>${business.owner_name}${business.address ? '<br>' + business.address : ''}${business.phone ? '<br>' + business.phone : ''}${business.email ? '<br>' + business.email : ''}${business.gst ? '<br>GSTIN: ' + business.gst : ''}</p>
    </div>
  </div>
  <div class="invoice-meta">
    <div class="invoice-title">Invoice</div>
    <div class="invoice-number">${invoice.invoice_number}</div>
    <div class="invoice-date">Date: ${formatDate(invoice.date || '')}</div>
    ${invoice.due_date ? `<div class="invoice-date">Due: ${formatDate(invoice.due_date)}</div>` : ''}
  </div>
</div>
<div class="header-curve"></div>
<div class="body-content">
<div class="billing-section">
  <div class="bill-box">
    <h3>Bill To</h3>
    <div class="name">${invoice.client_name}</div>
    ${invoice.client_address ? `<div class="detail">${invoice.client_address}</div>` : ''}
    ${invoice.client_email ? `<div class="detail">${invoice.client_email}</div>` : ''}
    ${invoice.client_phone ? `<div class="detail">${invoice.client_phone}</div>` : ''}
    ${invoice.client_gst ? `<div class="detail">GSTIN: ${invoice.client_gst}</div>` : ''}
  </div>
  <div class="bill-box">
    <h3>Invoice Details</h3>
    <div class="name">${invoice.project_name}</div>
    ${invoice.po_number ? `<div class="detail">PO #: ${invoice.po_number}</div>` : ''}
    ${invoice.place_of_supply ? `<div class="detail">Place: ${invoice.place_of_supply}</div>` : ''}
    ${invoice.payment_terms ? `<div class="detail">Terms: ${invoice.payment_terms}</div>` : ''}
  </div>
</div>
<table>
  <thead><tr>
    <th class="col-num">#</th><th>Description</th>
    ${showUnit ? '<th class="col-unit" style="text-align:center">Unit</th>' : ''}
    <th class="col-qty" style="text-align:right">Qty</th>
    <th class="col-rate" style="text-align:right">Rate</th>
    <th class="col-amount" style="text-align:right">Amount</th>
  </tr></thead>
  <tbody>${buildItemsRows(items, sym, showHsn)}</tbody>
</table>
<div class="totals-row"><div class="totals-box">
  ${buildTotalsRows(invoice, sym)}
  <div class="totals-total"><span>Total</span><span>${sym}${formatCurrency(invoice.total)}</span></div>
</div></div>
${buildPaymentBankSection(data, '#7C3AED')}
${invoice.notes ? `<div class="notes-section"><h3>Notes</h3><p>${invoice.notes}</p></div>` : ''}
</div>
<div class="footer">
  <p class="thank-you">Thank you for your business!</p>
  <p>${business.name} · Generated by InvoDesk</p>
</div>
</div></body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 8: Warm Amber
// ─────────────────────────────────────────────────────────────────────────────
function template_warm_amber(data: TemplateData): string {
  const { business, invoice, items, logoDataUrl } = data;
  const sym = getCurrencySymbol(invoice.currency || 'INR');
  const showHsn = hasHsn(items);
  const showUnit = hasUnit(items);

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Invoice ${invoice.invoice_number}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI',Arial,sans-serif; font-size:13px; color:#292524; background:#fff; }
.page { width:210mm; min-height:297mm; padding:12mm 14mm; margin:0 auto; }
.header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; padding-bottom:20px; border-bottom:3px solid #D97706; }
.biz-left { display:flex; align-items:flex-start; gap:14px; }
.logo-img { width:56px; height:56px; object-fit:contain; border-radius:8px; }
.business-info h1 { font-size:19px; font-weight:700; color:#92400E; }
.business-info p { font-size:11px; color:#78350F; margin-top:3px; line-height:1.6; opacity:0.85; }
.invoice-meta { text-align:right; }
.invoice-title { font-size:28px; font-weight:800; color:#D97706; text-transform:uppercase; letter-spacing:-0.5px; }
.invoice-number { font-size:12px; color:#57534E; margin-top:4px; font-weight:600; }
.invoice-date { font-size:11px; color:#78716C; margin-top:2px; }
.billing-section { display:flex; gap:16px; margin-bottom:22px; }
.bill-box { flex:1; background:#FFFBEB; border:1px solid #FDE68A; border-radius:8px; padding:14px; }
.bill-box h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#D97706; margin-bottom:8px; }
.bill-box .name { font-size:14px; font-weight:600; color:#92400E; }
.bill-box .detail { font-size:11px; color:#57534E; margin-top:3px; line-height:1.6; }
table { width:100%; border-collapse:collapse; margin-bottom:22px; }
thead tr { background:#D97706; }
thead th { padding:9px 10px; text-align:left; font-size:10px; font-weight:600; color:#fff; text-transform:uppercase; letter-spacing:0.5px; }
td { padding:9px 10px; vertical-align:top; border-bottom:1px solid #FEF3C7; }
.row-even { background:#fff; }
.row-odd { background:#FFFBEB; }
.col-num { width:32px; color:#D4B483; font-size:11px; }
.col-unit { width:60px; text-align:center; }
.col-qty,.col-rate,.col-amount { width:80px; text-align:right; }
thead .col-qty,thead .col-rate,thead .col-amount,thead .col-unit { text-align:right; }
.item-title { font-weight:600; color:#92400E; }
.item-desc { font-size:10px; color:#78716C; margin-top:2px; }
.item-hsn { font-size:9px; color:#A8A29E; }
.totals-row { display:flex; justify-content:flex-end; margin-bottom:22px; }
.totals-box { width:250px; }
.totals-line { display:flex; justify-content:space-between; padding:5px 0; font-size:12px; color:#57534E; border-bottom:1px solid #FEF3C7; }
.totals-line.discount { color:#EF4444; }
.totals-total { display:flex; justify-content:space-between; margin-top:8px; padding:11px 14px; background:#D97706; border-radius:8px; color:#fff; font-weight:700; font-size:15px; }
.payment-section { display:flex; gap:14px; margin-bottom:22px; flex-wrap:wrap; }
.payment-info,.bank-info { flex:1; min-width:150px; background:#FFFBEB; border:1px solid #FDE68A; border-radius:8px; padding:13px; }
.payment-info h3,.bank-info h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#D97706; margin-bottom:9px; }
.payment-info p,.bank-info p { font-size:11px; color:#92400E; margin-bottom:3px; }
.payment-info strong,.bank-info strong { color:#292524; }
.qr-box { text-align:center; }
.qr-box img { width:100px; height:100px; border:2px solid #FDE68A; border-radius:8px; padding:3px; }
.qr-box p { font-size:9px; color:#A8A29E; margin-top:4px; }
.notes-section { background:#FFFBEB; border:1px solid #FDE68A; border-radius:8px; padding:12px; margin-bottom:22px; }
.notes-section h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#D97706; margin-bottom:5px; }
.notes-section p { font-size:11px; color:#78350F; line-height:1.6; }
.footer { border-top:2px solid #FDE68A; padding-top:14px; display:flex; justify-content:space-between; }
.footer p { font-size:10px; color:#78716C; }
.thank-you { font-size:12px; font-weight:600; color:#D97706; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head><body><div class="page">
<div class="header">
  <div class="biz-left">
    ${logoDataUrl ? `<img class="logo-img" src="${logoDataUrl}" alt="Logo" />` : ''}
    <div class="business-info">
      <h1>${business.name}</h1>
      <p>${business.owner_name}${business.address ? '<br>' + business.address : ''}${business.phone ? '<br>' + business.phone : ''}${business.email ? '<br>' + business.email : ''}${business.gst ? '<br>GSTIN: ' + business.gst : ''}</p>
    </div>
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
    ${invoice.client_gst ? `<div class="detail">GSTIN: ${invoice.client_gst}</div>` : ''}
  </div>
  <div class="bill-box">
    <h3>Invoice Details</h3>
    <div class="name">${invoice.project_name}</div>
    ${invoice.po_number ? `<div class="detail">PO #: ${invoice.po_number}</div>` : ''}
    ${invoice.place_of_supply ? `<div class="detail">Place: ${invoice.place_of_supply}</div>` : ''}
    ${invoice.payment_terms ? `<div class="detail">Terms: ${invoice.payment_terms}</div>` : ''}
  </div>
</div>
<table>
  <thead><tr>
    <th class="col-num">#</th><th>Description</th>
    ${showUnit ? '<th class="col-unit" style="text-align:center">Unit</th>' : ''}
    <th class="col-qty" style="text-align:right">Qty</th>
    <th class="col-rate" style="text-align:right">Rate</th>
    <th class="col-amount" style="text-align:right">Amount</th>
  </tr></thead>
  <tbody>${buildItemsRows(items, sym, showHsn)}</tbody>
</table>
<div class="totals-row"><div class="totals-box">
  ${buildTotalsRows(invoice, sym)}
  <div class="totals-total"><span>Total</span><span>${sym}${formatCurrency(invoice.total)}</span></div>
</div></div>
${buildPaymentBankSection(data, '#D97706')}
${invoice.notes ? `<div class="notes-section"><h3>Notes</h3><p>${invoice.notes}</p></div>` : ''}
<div class="footer">
  <p class="thank-you">Thank you for your business!</p>
  <p>${business.name} · Generated by InvoDesk</p>
</div>
</div></body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 9: Pastel Creative
// ─────────────────────────────────────────────────────────────────────────────
function template_pastel_creative(data: TemplateData): string {
  const { business, invoice, items, logoDataUrl } = data;
  const sym = getCurrencySymbol(invoice.currency || 'INR');
  const showHsn = hasHsn(items);
  const showUnit = hasUnit(items);

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Invoice ${invoice.invoice_number}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI',Arial,sans-serif; font-size:13px; color:#2D2B55; background:#fff; }
.page { width:210mm; min-height:297mm; padding:12mm 14mm; margin:0 auto; }
.header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; background:linear-gradient(120deg,#FAF5FF 0%,#FDF2F8 100%); border-radius:16px; padding:20px; border:1px solid #E9D5FF; }
.biz-left { display:flex; align-items:flex-start; gap:14px; }
.logo-img { width:56px; height:56px; object-fit:contain; border-radius:50%; border:3px solid #E9D5FF; }
.business-info h1 { font-size:18px; font-weight:700; color:#5B21B6; }
.business-info p { font-size:11px; color:#7C3AED; margin-top:3px; line-height:1.6; opacity:0.8; }
.invoice-meta { text-align:right; }
.invoice-title { font-size:26px; font-weight:800; background:linear-gradient(90deg,#7C3AED,#EC4899); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; text-transform:uppercase; }
.invoice-number { font-size:12px; color:#7C3AED; margin-top:4px; font-weight:600; }
.invoice-date { font-size:11px; color:#9CA3AF; margin-top:2px; }
.billing-section { display:flex; gap:14px; margin-bottom:22px; }
.bill-box { flex:1; border-radius:12px; padding:14px; border:1px solid #FBB6CE; background:#FFF1F2; }
.bill-box:first-child { border-color:#E9D5FF; background:#FAF5FF; }
.bill-box h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#EC4899; margin-bottom:8px; }
.bill-box:first-child h3 { color:#7C3AED; }
.bill-box .name { font-size:14px; font-weight:600; color:#2D2B55; }
.bill-box .detail { font-size:11px; color:#6B7280; margin-top:3px; line-height:1.6; }
table { width:100%; border-collapse:collapse; margin-bottom:22px; border-radius:12px; overflow:hidden; }
thead tr { background:linear-gradient(90deg,#7C3AED,#EC4899); }
thead th { padding:9px 10px; text-align:left; font-size:10px; font-weight:600; color:#fff; text-transform:uppercase; letter-spacing:0.5px; }
td { padding:9px 10px; vertical-align:top; border-bottom:1px solid #F5F0FF; }
.row-even { background:#fff; }
.row-odd { background:#FDF4FF; }
.col-num { width:32px; color:#C4B5FD; font-size:11px; }
.col-unit { width:60px; text-align:center; }
.col-qty,.col-rate,.col-amount { width:80px; text-align:right; }
thead .col-qty,thead .col-rate,thead .col-amount,thead .col-unit { text-align:right; }
.item-title { font-weight:600; color:#2D2B55; }
.item-desc { font-size:10px; color:#9CA3AF; margin-top:2px; }
.item-hsn { font-size:9px; color:#9CA3AF; }
.totals-row { display:flex; justify-content:flex-end; margin-bottom:22px; }
.totals-box { width:250px; background:#FAF5FF; border-radius:12px; padding:12px; border:1px solid #E9D5FF; }
.totals-line { display:flex; justify-content:space-between; padding:5px 0; font-size:12px; color:#6B7280; border-bottom:1px solid #F3E8FF; }
.totals-line.discount { color:#EF4444; }
.totals-total { display:flex; justify-content:space-between; margin-top:8px; padding:10px 12px; background:linear-gradient(90deg,#7C3AED,#EC4899); border-radius:8px; color:#fff; font-weight:700; font-size:15px; }
.payment-section { display:flex; gap:14px; margin-bottom:22px; flex-wrap:wrap; }
.payment-info,.bank-info { flex:1; min-width:150px; background:#FAF5FF; border:1px solid #E9D5FF; border-radius:12px; padding:13px; }
.payment-info h3,.bank-info h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#7C3AED; margin-bottom:9px; }
.payment-info p,.bank-info p { font-size:11px; color:#5B21B6; margin-bottom:3px; }
.payment-info strong,.bank-info strong { color:#2D2B55; }
.qr-box { text-align:center; }
.qr-box img { width:100px; height:100px; border:3px solid #E9D5FF; border-radius:12px; padding:3px; }
.qr-box p { font-size:9px; color:#9CA3AF; margin-top:4px; }
.notes-section { background:#FFF1F2; border:1px solid #FBB6CE; border-radius:12px; padding:12px; margin-bottom:22px; }
.notes-section h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#EC4899; margin-bottom:5px; }
.notes-section p { font-size:11px; color:#BE185D; line-height:1.6; }
.footer { border-top:2px solid #F3E8FF; padding-top:14px; display:flex; justify-content:space-between; }
.footer p { font-size:10px; color:#9CA3AF; }
.thank-you { font-size:12px; font-weight:600; background:linear-gradient(90deg,#7C3AED,#EC4899); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head><body><div class="page">
<div class="header">
  <div class="biz-left">
    ${logoDataUrl ? `<img class="logo-img" src="${logoDataUrl}" alt="Logo" />` : ''}
    <div class="business-info">
      <h1>${business.name}</h1>
      <p>${business.owner_name}${business.address ? '<br>' + business.address : ''}${business.phone ? '<br>' + business.phone : ''}${business.email ? '<br>' + business.email : ''}${business.gst ? '<br>GSTIN: ' + business.gst : ''}</p>
    </div>
  </div>
  <div class="invoice-meta">
    <div class="invoice-title">Invoice</div>
    <div class="invoice-number">${invoice.invoice_number}</div>
    <div class="invoice-date">${formatDate(invoice.date || '')}${invoice.due_date ? ' · Due: ' + formatDate(invoice.due_date) : ''}</div>
  </div>
</div>
<div class="billing-section">
  <div class="bill-box">
    <h3>Bill To</h3>
    <div class="name">${invoice.client_name}</div>
    ${invoice.client_address ? `<div class="detail">${invoice.client_address}</div>` : ''}
    ${invoice.client_email ? `<div class="detail">${invoice.client_email}</div>` : ''}
    ${invoice.client_phone ? `<div class="detail">${invoice.client_phone}</div>` : ''}
    ${invoice.client_gst ? `<div class="detail">GSTIN: ${invoice.client_gst}</div>` : ''}
  </div>
  <div class="bill-box">
    <h3>Project</h3>
    <div class="name">${invoice.project_name}</div>
    ${invoice.po_number ? `<div class="detail">PO: ${invoice.po_number}</div>` : ''}
    ${invoice.payment_terms ? `<div class="detail">Terms: ${invoice.payment_terms}</div>` : ''}
  </div>
</div>
<table>
  <thead><tr>
    <th class="col-num">#</th><th>Description</th>
    ${showUnit ? '<th class="col-unit" style="text-align:center">Unit</th>' : ''}
    <th class="col-qty" style="text-align:right">Qty</th>
    <th class="col-rate" style="text-align:right">Rate</th>
    <th class="col-amount" style="text-align:right">Amount</th>
  </tr></thead>
  <tbody>${buildItemsRows(items, sym, showHsn)}</tbody>
</table>
<div class="totals-row"><div class="totals-box">
  ${buildTotalsRows(invoice, sym)}
  <div class="totals-total"><span>Total</span><span>${sym}${formatCurrency(invoice.total)}</span></div>
</div></div>
${buildPaymentBankSection(data, '#7C3AED')}
${invoice.notes ? `<div class="notes-section"><h3>Notes</h3><p>${invoice.notes}</p></div>` : ''}
<div class="footer">
  <p class="thank-you">Thank you for choosing us!</p>
  <p>${business.name} · Generated by InvoDesk</p>
</div>
</div></body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 10: Monochrome
// ─────────────────────────────────────────────────────────────────────────────
function template_monochrome(data: TemplateData): string {
  const { business, invoice, items, logoDataUrl } = data;
  const sym = getCurrencySymbol(invoice.currency || 'INR');
  const showHsn = hasHsn(items);
  const showUnit = hasUnit(items);

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Invoice ${invoice.invoice_number}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI',Arial,sans-serif; font-size:13px; color:#000; background:#fff; }
.page { width:210mm; min-height:297mm; padding:12mm 14mm; margin:0 auto; }
.header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; }
.header-bar { background:#000; color:#fff; padding:14px 0; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; }
.biz-left { display:flex; align-items:flex-start; gap:12px; }
.logo-img { width:50px; height:50px; object-fit:contain; filter:grayscale(100%); }
.business-info h1 { font-size:18px; font-weight:700; }
.business-info p { font-size:11px; color:#555; margin-top:3px; line-height:1.6; }
.invoice-meta { text-align:right; }
.invoice-title { font-size:28px; font-weight:900; color:#000; text-transform:uppercase; letter-spacing:2px; }
.invoice-number { font-size:12px; color:#333; margin-top:4px; font-weight:700; font-family:'Courier New',monospace; }
.invoice-date { font-size:11px; color:#555; margin-top:2px; }
.hr-bold { border:0; border-top:3px solid #000; margin:0 0 20px; }
.hr-thin { border:0; border-top:1px solid #000; margin:16px 0; }
.billing-section { display:flex; gap:20px; margin-bottom:22px; }
.bill-box { flex:1; border:1px solid #000; padding:12px; }
.bill-box h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:#000; margin-bottom:8px; border-bottom:1px solid #000; padding-bottom:4px; }
.bill-box .name { font-size:14px; font-weight:700; }
.bill-box .detail { font-size:11px; color:#444; margin-top:3px; line-height:1.6; }
table { width:100%; border-collapse:collapse; margin-bottom:20px; }
thead tr { background:#000; }
thead th { padding:9px 10px; text-align:left; font-size:10px; font-weight:700; color:#fff; text-transform:uppercase; letter-spacing:1px; }
td { padding:8px 10px; vertical-align:top; border-bottom:1px solid #ddd; }
.row-odd { background:#F9F9F9; }
.col-num { width:30px; text-align:center; color:#999; font-size:11px; }
.col-unit { width:60px; text-align:center; }
.col-qty,.col-rate,.col-amount { width:80px; text-align:right; }
thead .col-qty,thead .col-rate,thead .col-amount,thead .col-unit { text-align:right; }
.item-title { font-weight:700; }
.item-desc { font-size:10px; color:#666; margin-top:2px; }
.item-hsn { font-size:9px; color:#888; font-family:'Courier New',monospace; }
.totals-row { display:flex; justify-content:flex-end; margin-bottom:20px; }
.totals-box { width:250px; border:1px solid #000; }
.totals-line { display:flex; justify-content:space-between; padding:5px 10px; font-size:12px; border-bottom:1px solid #ddd; }
.totals-line.discount { color:#cc0000; }
.totals-total { display:flex; justify-content:space-between; padding:9px 10px; background:#000; color:#fff; font-weight:700; font-size:15px; }
.payment-section { display:flex; gap:14px; margin-bottom:20px; flex-wrap:wrap; }
.payment-info,.bank-info { flex:1; min-width:150px; border:1px solid #000; padding:12px; }
.payment-info h3,.bank-info h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#000; margin-bottom:8px; border-bottom:1px solid #000; padding-bottom:3px; }
.payment-info p,.bank-info p { font-size:11px; color:#333; margin-bottom:3px; }
.qr-box { text-align:center; }
.qr-box img { width:100px; height:100px; border:1px solid #000; padding:3px; filter:grayscale(100%); }
.qr-box p { font-size:9px; color:#666; margin-top:4px; }
.notes-section { border:1px solid #000; padding:12px; margin-bottom:20px; }
.notes-section h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:5px; border-bottom:1px solid #000; padding-bottom:3px; }
.notes-section p { font-size:11px; color:#333; line-height:1.7; }
.footer { border-top:3px solid #000; padding-top:12px; display:flex; justify-content:space-between; font-size:10px; color:#555; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head><body><div class="page">
<div style="background:#000;color:#fff;padding:16px 0;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
  <div style="display:flex;align-items:center;gap:12px;">
    ${logoDataUrl ? `<img class="logo-img" src="${logoDataUrl}" alt="Logo" style="width:48px;height:48px;object-fit:contain;filter:grayscale(100%) invert(1);background:transparent;" />` : ''}
    <div>
      <div style="font-size:18px;font-weight:900;letter-spacing:-0.5px;">${business.name}</div>
      <div style="font-size:10px;color:#aaa;margin-top:2px;">${business.owner_name}${business.email ? ' · ' + business.email : ''}</div>
    </div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:26px;font-weight:900;text-transform:uppercase;letter-spacing:3px;">Invoice</div>
    <div style="font-size:11px;color:#aaa;margin-top:4px;font-family:'Courier New',monospace;">${invoice.invoice_number}</div>
  </div>
</div>
<div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #000;">
  <span>${business.address || ''}</span>
  <span>Date: ${formatDate(invoice.date || '')}${invoice.due_date ? ' · Due: ' + formatDate(invoice.due_date) : ''}</span>
</div>
<div class="billing-section">
  <div class="bill-box">
    <h3>Bill To</h3>
    <div class="name">${invoice.client_name}</div>
    ${invoice.client_address ? `<div class="detail">${invoice.client_address}</div>` : ''}
    ${invoice.client_email ? `<div class="detail">${invoice.client_email}</div>` : ''}
    ${invoice.client_phone ? `<div class="detail">${invoice.client_phone}</div>` : ''}
    ${invoice.client_gst ? `<div class="detail">GSTIN: ${invoice.client_gst}</div>` : ''}
  </div>
  <div class="bill-box">
    <h3>Invoice Details</h3>
    <div class="name">${invoice.project_name}</div>
    ${invoice.po_number ? `<div class="detail">PO #: ${invoice.po_number}</div>` : ''}
    ${invoice.place_of_supply ? `<div class="detail">Place: ${invoice.place_of_supply}</div>` : ''}
    ${invoice.payment_terms ? `<div class="detail">Terms: ${invoice.payment_terms}</div>` : ''}
    ${business.gst ? `<div class="detail">GSTIN: ${business.gst}</div>` : ''}
  </div>
</div>
<table>
  <thead><tr>
    <th class="col-num">#</th><th>Description</th>
    ${showUnit ? '<th class="col-unit" style="text-align:center">Unit</th>' : ''}
    <th class="col-qty" style="text-align:right">Qty</th>
    <th class="col-rate" style="text-align:right">Rate</th>
    <th class="col-amount" style="text-align:right">Amount</th>
  </tr></thead>
  <tbody>${buildItemsRows(items, sym, showHsn)}</tbody>
</table>
<div class="totals-row"><div class="totals-box">
  ${buildTotalsRows(invoice, sym)}
  <div class="totals-total"><span>Total Amount</span><span>${sym}${formatCurrency(invoice.total)}</span></div>
</div></div>
${buildPaymentBankSection(data, '#000000')}
${invoice.notes ? `<div class="notes-section"><h3>Notes & Terms</h3><p>${invoice.notes}</p></div>` : ''}
<div class="footer">
  <p>Thank you for your business.</p>
  <p>${business.name} · Generated by InvoDesk</p>
</div>
</div></body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED ROUTER
// ─────────────────────────────────────────────────────────────────────────────
export function generateInvoiceHTML(data: TemplateData): string {
  const templateId = data.business.template_id || 'modern-blue';
  switch (templateId) {
    case 'modern-blue':     return template_modern_blue(data);
    case 'minimal-white':   return template_minimal_white(data);
    case 'dark-corporate':  return template_dark_corporate(data);
    case 'forest-green':    return template_forest_green(data);
    case 'classic-serif':   return template_classic_serif(data);
    case 'executive-gold':  return template_executive_gold(data);
    case 'tech-purple':     return template_tech_purple(data);
    case 'warm-amber':      return template_warm_amber(data);
    case 'pastel-creative': return template_pastel_creative(data);
    case 'monochrome':      return template_monochrome(data);
    default:                return template_modern_blue(data);
  }
}
