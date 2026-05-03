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

function buildItemsRows(items: TemplateData['items'], sym: string, showHsn: boolean, showUnit: boolean): string {
  return items.map((item, i) => `
    <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
      <td class="col-num">${i + 1}</td>
      <td class="col-desc">
        <div class="item-title">${item.title}</div>
        ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
        ${showHsn && item.hsn_sac ? `<div class="item-hsn">HSN/SAC: ${item.hsn_sac}</div>` : ''}
      </td>
      ${showUnit ? `<td class="col-unit">${item.unit || ''}</td>` : ''}
      <td class="col-qty">${item.quantity}</td>
      <td class="col-rate">${sym}${formatCurrency(item.unit_price)}</td>
      <td class="col-amount">${sym}${formatCurrency(item.amount)}</td>
    </tr>`).join('');
}

function hasHsn(items: TemplateData['items']): boolean {
  return items.some(i => i.hsn_sac);
}

function hasUnit(items: TemplateData['items']): boolean {
  return items.some(i => i.unit);
}

// ─── Shared CSS builder ───────────────────────────────────────────────────────

interface TemplateOpts {
  font: string;
  accent: string;
  accentText: string;
  lightBg: string;
  lightBorder: string;
  tableHdrBg: string;
  tableHdrText: string;
  textColor: string;
  mutedColor: string;
  extraCss?: string;
}

function buildCSS(o: TemplateOpts): string {
  return `
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:${o.font}; font-size:13px; color:${o.textColor}; background:#fff; }
.page { width:210mm; min-height:297mm; padding:14mm 16mm; margin:0 auto; background:#fff; }

.header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:26px; margin-bottom:34px; border-bottom:2px solid ${o.accent}; }
.biz-left { display:flex; gap:16px; align-items:flex-start; }
.logo-img { width:54px; height:54px; object-fit:contain; }
.business-info h1 { font-size:18px; font-weight:700; color:#111827; letter-spacing:-0.3px; }
.business-info p { font-size:11px; color:${o.mutedColor}; margin-top:6px; line-height:1.9; }
.invoice-meta { text-align:right; }
.invoice-title { font-size:34px; font-weight:800; color:${o.accent}; letter-spacing:-1px; text-transform:uppercase; line-height:1; }
.invoice-number { font-size:12px; color:#374151; font-weight:600; margin-top:10px; letter-spacing:0.2px; }
.invoice-date { font-size:11px; color:${o.mutedColor}; margin-top:4px; }
.paid-badge { display:inline-block; margin-top:10px; background:#10B981; color:#fff; padding:4px 14px; border-radius:99px; font-size:10px; font-weight:700; letter-spacing:1px; }

.billing-section { display:flex; gap:18px; margin-bottom:34px; }
.bill-box { flex:1; padding:18px 20px; background:${o.lightBg}; border:1px solid ${o.lightBorder}; border-radius:6px; }
.bill-box h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:${o.accent}; margin-bottom:12px; }
.bill-box .name { font-size:14px; font-weight:600; color:#111827; margin-bottom:4px; }
.bill-box .detail { font-size:11px; color:${o.mutedColor}; margin-top:4px; line-height:1.8; }

.table-wrapper { margin-bottom:30px; }
table { width:100%; border-collapse:collapse; }
thead tr { background:${o.tableHdrBg}; }
thead th { padding:11px 12px; text-align:left; font-size:9px; font-weight:700; color:${o.tableHdrText}; text-transform:uppercase; letter-spacing:0.5px; }
tbody tr { border-bottom:1px solid #F1F5F9; }
.row-even { background:#fff; }
.row-odd { background:#FAFAFA; }
td { padding:11px 12px; vertical-align:top; }
.col-num { width:32px; color:${o.mutedColor}; font-size:11px; text-align:center; }
.col-desc { }
.col-unit { width:60px; text-align:center; }
.col-qty,.col-rate,.col-amount { width:80px; text-align:right; }
thead .col-qty,thead .col-rate,thead .col-amount,thead .col-unit { text-align:right; }
.item-title { font-weight:600; color:#111827; }
.item-desc { font-size:10px; color:${o.mutedColor}; margin-top:3px; line-height:1.6; }
.item-hsn { font-size:9px; color:${o.mutedColor}; margin-top:2px; opacity:0.8; }

.totals-row { display:flex; justify-content:flex-end; margin-bottom:30px; }
.totals-box { width:268px; }
.totals-line { display:flex; justify-content:space-between; padding:7px 0; font-size:12px; color:${o.mutedColor}; border-bottom:1px solid #F1F5F9; }
.totals-line.discount { color:#EF4444; }
.totals-total { display:flex; justify-content:space-between; margin-top:10px; padding:14px 18px; background:${o.accent}; border-radius:6px; color:${o.accentText}; font-weight:700; font-size:15px; }

.payment-section { display:flex; gap:16px; margin-bottom:30px; flex-wrap:wrap; }
.payment-info,.bank-info { flex:1; min-width:160px; background:${o.lightBg}; border:1px solid ${o.lightBorder}; border-radius:6px; padding:16px; }
.payment-info h3,.bank-info h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:${o.accent}; margin-bottom:10px; }
.payment-info p,.bank-info p { font-size:11px; color:${o.textColor}; margin-bottom:5px; line-height:1.6; }
.qr-box { display:flex; flex-direction:column; align-items:center; justify-content:center; min-width:120px; }
.qr-box img { width:104px; height:104px; border:1px solid ${o.lightBorder}; border-radius:6px; padding:5px; }
.qr-box p { font-size:9px; color:${o.mutedColor}; margin-top:7px; }

.notes-section { border-left:3px solid ${o.accent}; background:${o.lightBg}; padding:14px 18px; margin-bottom:30px; border-radius:0 6px 6px 0; }
.notes-section h3 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:${o.accent}; margin-bottom:7px; }
.notes-section p { font-size:11px; color:${o.textColor}; line-height:1.8; }

.footer { border-top:1px solid #E5E7EB; padding-top:18px; display:flex; justify-content:space-between; align-items:flex-start; }
.footer p { font-size:11px; color:${o.mutedColor}; margin-top:3px; line-height:1.6; }
.thank-you { font-size:13px; font-weight:600; color:${o.accent}; }
.footer-right { text-align:right; font-size:10px; color:${o.mutedColor}; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } .page { padding:10mm 12mm; } }
${o.extraCss || ''}`;
}

// ─── Shared HTML page builder ─────────────────────────────────────────────────

function buildInvoicePage(data: TemplateData, css: string): string {
  const { business, invoice, items, logoDataUrl, upiId, upiName, qrDataUrl } = data;
  const sym = getCurrencySymbol(invoice.currency || 'INR');
  const showHsn = hasHsn(items);
  const showUnit = hasUnit(items);
  const hasBank = !!(invoice.bank_account || invoice.bank_name || invoice.bank_ifsc);
  const showPayment = !!(upiId || hasBank);

  const bizDetails = [
    business.owner_name,
    business.address,
    business.phone,
    business.email,
    business.gst ? `GSTIN: ${business.gst}` : '',
    business.pan ? `PAN: ${business.pan}` : '',
  ].filter(Boolean).join('<br>');

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Invoice ${invoice.invoice_number}</title>
<style>${css}</style></head>
<body><div class="page">

<div class="header">
  <div class="biz-left">
    ${logoDataUrl ? `<img class="logo-img" src="${logoDataUrl}" alt="Logo" />` : ''}
    <div class="business-info">
      <h1>${business.name}</h1>
      <p>${bizDetails}</p>
    </div>
  </div>
  <div class="invoice-meta">
    <div class="invoice-title">Invoice</div>
    <div class="invoice-number">${invoice.invoice_number}</div>
    <div class="invoice-date">Date: ${formatDate(invoice.date || '')}</div>
    ${invoice.due_date ? `<div class="invoice-date">Due: ${formatDate(invoice.due_date)}</div>` : ''}
    ${invoice.status === 'paid' ? '<div class="paid-badge">PAID</div>' : ''}
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
    <div class="detail">No. ${invoice.invoice_number}</div>
    <div class="detail">Date: ${formatDate(invoice.date || '')}</div>
    ${invoice.due_date ? `<div class="detail">Due: ${formatDate(invoice.due_date)}</div>` : ''}
    ${invoice.po_number ? `<div class="detail">PO: ${invoice.po_number}</div>` : ''}
    ${invoice.place_of_supply ? `<div class="detail">Supply: ${invoice.place_of_supply}</div>` : ''}
    ${invoice.payment_terms ? `<div class="detail">Terms: ${invoice.payment_terms}</div>` : ''}
  </div>
</div>

<div class="table-wrapper">
<table>
  <thead><tr>
    <th class="col-num">#</th>
    <th class="col-desc">Description</th>
    ${showUnit ? '<th class="col-unit">Unit</th>' : ''}
    <th class="col-qty" style="text-align:right">Qty</th>
    <th class="col-rate" style="text-align:right">Rate</th>
    <th class="col-amount" style="text-align:right">Amount</th>
  </tr></thead>
  <tbody>${buildItemsRows(items, sym, showHsn, showUnit)}</tbody>
</table>
</div>

<div class="totals-row"><div class="totals-box">
  ${buildTotalsRows(invoice, sym)}
  <div class="totals-total"><span>Total Amount</span><span>${sym}${formatCurrency(invoice.total)}</span></div>
</div></div>

${showPayment ? `<div class="payment-section">
  ${upiId ? `<div class="payment-info">
    <h3>Payment Details</h3>
    <p><strong>UPI ID:</strong> ${upiId}</p>
    ${upiName ? `<p><strong>Payee:</strong> ${upiName}</p>` : ''}
    <p><strong>Amount Due:</strong> ${sym}${formatCurrency(invoice.total)}</p>
    <p><strong>Reference:</strong> ${invoice.invoice_number}</p>
  </div>` : ''}
  ${hasBank ? `<div class="bank-info">
    <h3>Bank Transfer</h3>
    ${invoice.bank_holder ? `<p><strong>Account Name:</strong> ${invoice.bank_holder}</p>` : ''}
    ${invoice.bank_name ? `<p><strong>Bank:</strong> ${invoice.bank_name}</p>` : ''}
    ${invoice.bank_account ? `<p><strong>Account No:</strong> ${invoice.bank_account}</p>` : ''}
    ${invoice.bank_ifsc ? `<p><strong>IFSC:</strong> ${invoice.bank_ifsc}</p>` : ''}
  </div>` : ''}
  ${qrDataUrl ? `<div class="qr-box">
    <img src="${qrDataUrl}" alt="UPI QR Code" />
    <p>Scan to pay via UPI</p>
  </div>` : ''}
</div>` : ''}

${invoice.notes ? `<div class="notes-section">
  <h3>Notes</h3>
  <p>${invoice.notes}</p>
</div>` : ''}

<div class="footer">
  <div>
    <p class="thank-you">Thank you for your business!</p>
    ${invoice.payment_terms ? `<p>Payment Terms: ${invoice.payment_terms}</p>` : ''}
    ${business.email ? `<p>${business.email}</p>` : (business.phone ? `<p>${business.phone}</p>` : '')}
  </div>
  <div class="footer-right">
    <p>${business.name}</p>
    <p>Generated by InvoDesk</p>
  </div>
</div>

</div></body></html>`;
}

// ─── Template Definitions ─────────────────────────────────────────────────────

function template_modern_blue(data: TemplateData): string {
  return buildInvoicePage(data, buildCSS({
    font: "'Segoe UI',Arial,sans-serif",
    accent: '#2563EB',
    accentText: '#fff',
    lightBg: '#EFF6FF',
    lightBorder: '#BFDBFE',
    tableHdrBg: '#F1F5F9',
    tableHdrText: '#475569',
    textColor: '#374151',
    mutedColor: '#94A3B8',
  }));
}

function template_minimal_white(data: TemplateData): string {
  return buildInvoicePage(data, buildCSS({
    font: "'Segoe UI',Arial,sans-serif",
    accent: '#374151',
    accentText: '#fff',
    lightBg: '#F9FAFB',
    lightBorder: '#E5E7EB',
    tableHdrBg: '#F3F4F6',
    tableHdrText: '#6B7280',
    textColor: '#1F2937',
    mutedColor: '#9CA3AF',
    extraCss: `
      .header { border-bottom:1px solid #D1D5DB; }
      .invoice-title { font-size:28px; font-weight:300; color:#9CA3AF; letter-spacing:6px; }
      .totals-total { background:#111827; border-radius:4px; }
    `,
  }));
}

function template_dark_corporate(data: TemplateData): string {
  return buildInvoicePage(data, buildCSS({
    font: "'Segoe UI',Arial,sans-serif",
    accent: '#1E293B',
    accentText: '#fff',
    lightBg: '#F8FAFC',
    lightBorder: '#CBD5E1',
    tableHdrBg: '#1E293B',
    tableHdrText: '#fff',
    textColor: '#1E293B',
    mutedColor: '#64748B',
    extraCss: `
      .header { border-bottom:4px solid #0F172A; }
      .invoice-title { font-size:28px; font-weight:900; letter-spacing:0; }
      .row-odd { background:#F8FAFC; }
      .totals-total { background:#0F172A; border-radius:4px; }
    `,
  }));
}

function template_forest_green(data: TemplateData): string {
  return buildInvoicePage(data, buildCSS({
    font: "'Segoe UI',Arial,sans-serif",
    accent: '#166534',
    accentText: '#fff',
    lightBg: '#F0FDF4',
    lightBorder: '#BBF7D0',
    tableHdrBg: '#DCFCE7',
    tableHdrText: '#166534',
    textColor: '#1A2E1A',
    mutedColor: '#6B9E6B',
    extraCss: `.totals-total { background:#15803D; }`,
  }));
}

function template_classic_serif(data: TemplateData): string {
  return buildInvoicePage(data, buildCSS({
    font: "Georgia,'Times New Roman',serif",
    accent: '#1F2937',
    accentText: '#fff',
    lightBg: '#F9FAFB',
    lightBorder: '#D1D5DB',
    tableHdrBg: '#F3F4F6',
    tableHdrText: '#374151',
    textColor: '#111827',
    mutedColor: '#6B7280',
    extraCss: `
      .invoice-title { font-weight:400; font-size:28px; letter-spacing:4px; font-style:italic; }
      .business-info h1 { font-style:italic; }
      .bill-box h3 { letter-spacing:2px; }
      .totals-total { background:#111827; border-radius:2px; }
    `,
  }));
}

function template_executive_gold(data: TemplateData): string {
  return buildInvoicePage(data, buildCSS({
    font: "'Segoe UI',Arial,sans-serif",
    accent: '#1E3A5F',
    accentText: '#fff',
    lightBg: '#F8F9FA',
    lightBorder: '#D4A017',
    tableHdrBg: '#1E3A5F',
    tableHdrText: '#fff',
    textColor: '#1E3A5F',
    mutedColor: '#6B7280',
    extraCss: `
      .header { border-bottom:3px solid #D4A017; }
      .invoice-title { color:#D4A017; }
      .bill-box h3 { color:#D4A017; }
      .totals-total { background:#1E3A5F; }
    `,
  }));
}

function template_tech_purple(data: TemplateData): string {
  return buildInvoicePage(data, buildCSS({
    font: "'Segoe UI',Arial,sans-serif",
    accent: '#4F46E5',
    accentText: '#fff',
    lightBg: '#EEF2FF',
    lightBorder: '#C7D2FE',
    tableHdrBg: '#EEF2FF',
    tableHdrText: '#4338CA',
    textColor: '#1E1B4B',
    mutedColor: '#818CF8',
    extraCss: `.totals-total { background:#4338CA; }`,
  }));
}

function template_warm_amber(data: TemplateData): string {
  return buildInvoicePage(data, buildCSS({
    font: "'Segoe UI',Arial,sans-serif",
    accent: '#D97706',
    accentText: '#fff',
    lightBg: '#FFFBEB',
    lightBorder: '#FDE68A',
    tableHdrBg: '#FEF3C7',
    tableHdrText: '#92400E',
    textColor: '#451A03',
    mutedColor: '#B45309',
    extraCss: `.totals-total { background:#B45309; }`,
  }));
}

function template_pastel_creative(data: TemplateData): string {
  return buildInvoicePage(data, buildCSS({
    font: "'Segoe UI',Arial,sans-serif",
    accent: '#7C3AED',
    accentText: '#fff',
    lightBg: '#FAF5FF',
    lightBorder: '#E9D5FF',
    tableHdrBg: '#F5F3FF',
    tableHdrText: '#6D28D9',
    textColor: '#2E1065',
    mutedColor: '#A78BFA',
    extraCss: `
      .bill-box { border-radius:12px; }
      .header { border-bottom:2px solid #E9D5FF; }
      .invoice-title { background:linear-gradient(135deg,#7C3AED,#EC4899); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
      .totals-total { background:#6D28D9; border-radius:10px; }
    `,
  }));
}

function template_monochrome(data: TemplateData): string {
  return buildInvoicePage(data, buildCSS({
    font: "'Segoe UI',Arial,sans-serif",
    accent: '#000000',
    accentText: '#fff',
    lightBg: '#F9FAFB',
    lightBorder: '#D1D5DB',
    tableHdrBg: '#E5E7EB',
    tableHdrText: '#000000',
    textColor: '#111827',
    mutedColor: '#6B7280',
    extraCss: `
      .header { border-bottom:3px solid #000; }
      .invoice-title { letter-spacing:2px; }
      .totals-total { border-radius:0; }
    `,
  }));
}

// ─── Export ───────────────────────────────────────────────────────────────────

const TEMPLATE_MAP: Record<string, (data: TemplateData) => string> = {
  'modern-blue': template_modern_blue,
  'minimal-white': template_minimal_white,
  'dark-corporate': template_dark_corporate,
  'forest-green': template_forest_green,
  'classic-serif': template_classic_serif,
  'executive-gold': template_executive_gold,
  'tech-purple': template_tech_purple,
  'warm-amber': template_warm_amber,
  'pastel-creative': template_pastel_creative,
  'monochrome': template_monochrome,
};

export function generateInvoiceHTML(data: TemplateData): string {
  const templateId = data.business.template_id || 'modern-blue';
  const fn = TEMPLATE_MAP[templateId] || template_modern_blue;
  return fn(data);
}
