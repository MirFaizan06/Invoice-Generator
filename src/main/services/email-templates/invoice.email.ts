interface InvoiceEmailData {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  ownerName: string;
  clientName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  total: string;
  currency: string;
  upiId?: string;
  bankAccount?: string;
  bankName?: string;
  bankIfsc?: string;
  bankHolder?: string;
  notes?: string;
}

export function buildInvoiceEmailSubject(data: Pick<InvoiceEmailData, 'invoiceNumber' | 'businessName'>): string {
  return `Invoice ${data.invoiceNumber} from ${data.businessName}`;
}

export function buildInvoiceEmailHtml(data: InvoiceEmailData): string {
  const paymentSection = data.upiId
    ? `<tr><td class="label">UPI ID</td><td class="value">${data.upiId}</td></tr>`
    : data.bankAccount
    ? `<tr><td class="label">Bank</td><td class="value">${data.bankName || ''} • A/C: ${data.bankAccount} • IFSC: ${data.bankIfsc || ''}</td></tr>`
    : '';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#F1F5F9;color:#1E293B}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)}
  .hdr{background:#0F172A;padding:28px 36px}
  .hdr h1{color:#fff;font-size:20px;font-weight:700;margin-bottom:4px}
  .hdr p{color:#94A3B8;font-size:13px}
  .body{padding:36px}
  .greeting{font-size:15px;margin-bottom:20px;color:#334155}
  .card{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:20px;margin:20px 0}
  .card-title{font-size:11px;font-weight:700;color:#64748B;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px}
  table{width:100%;border-collapse:collapse}
  td{padding:7px 0;font-size:13px;border-bottom:1px solid #F1F5F9}
  tr:last-child td{border-bottom:none}
  .label{color:#64748B;width:40%}
  .value{color:#0F172A;font-weight:600;text-align:right}
  .amount{font-size:22px;font-weight:800;color:#2563EB;margin:12px 0 4px}
  .note{font-size:13px;color:#64748B;line-height:1.7;background:#FFFBEB;border-left:3px solid #F59E0B;padding:12px 16px;border-radius:0 6px 6px 0;margin:16px 0}
  .footer{background:#F8FAFC;padding:18px 36px;border-top:1px solid #E2E8F0;font-size:11px;color:#94A3B8;text-align:center}
</style></head>
<body><div class="wrap">
<div class="hdr">
  <h1>${data.businessName}</h1>
  <p>${data.businessEmail}${data.businessPhone ? ' · ' + data.businessPhone : ''}</p>
</div>
<div class="body">
  <p class="greeting">Dear ${data.clientName},</p>
  <p style="font-size:14px;color:#475569;margin-bottom:16px;">Please find your invoice details below. Kindly make the payment by the due date.</p>
  <div class="card">
    <div class="card-title">Invoice Summary</div>
    <div class="amount">${data.currency} ${data.total}</div>
    <table>
      <tr><td class="label">Invoice Number</td><td class="value">${data.invoiceNumber}</td></tr>
      <tr><td class="label">Invoice Date</td><td class="value">${data.invoiceDate}</td></tr>
      ${data.dueDate ? `<tr><td class="label">Due Date</td><td class="value" style="color:#DC2626">${data.dueDate}</td></tr>` : ''}
    </table>
  </div>
  ${paymentSection ? `<div class="card"><div class="card-title">Payment Details</div><table>${paymentSection}</table></div>` : ''}
  ${data.notes ? `<div class="note">${data.notes}</div>` : ''}
  <p style="margin-top:24px;font-size:14px;color:#334155">Best regards,<br><strong>${data.ownerName}</strong><br><span style="color:#64748B">${data.businessName}</span></p>
</div>
<div class="footer">Sent via BizDesk — Complete Business Suite</div>
</div></body></html>`;
}
