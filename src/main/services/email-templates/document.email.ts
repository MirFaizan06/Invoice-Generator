interface DocumentEmailData {
  businessName: string;
  businessEmail: string;
  ownerName: string;
  clientName: string;
  docType: 'msa' | 'sow' | 'nda' | 'sla';
  docTitle: string;
  version: number;
  generatedDate: string;
  projectName?: string;
  extra?: Record<string, string>;
}

export function buildDocumentEmailSubject(data: Pick<DocumentEmailData, 'docType' | 'docTitle' | 'businessName' | 'clientName'>): string {
  switch (data.docType) {
    case 'msa': return `Master Services Agreement — ${data.clientName} × ${data.businessName}`;
    case 'sow': return `Statement of Work — ${data.docTitle}`;
    case 'nda': return `Non-Disclosure Agreement — ${data.clientName} × ${data.businessName}`;
    case 'sla': return `Service Level Agreement — ${data.docTitle}`;
  }
}

function getDocTypeName(docType: DocumentEmailData['docType']): string {
  switch (docType) {
    case 'msa': return 'Master Services Agreement';
    case 'sow': return 'Statement of Work';
    case 'nda': return 'Non-Disclosure Agreement';
    case 'sla': return 'Service Level Agreement';
  }
}

function getDocIntro(data: DocumentEmailData): string {
  switch (data.docType) {
    case 'msa':
      return `Please review the Master Services Agreement between ${data.businessName} and ${data.clientName}. This agreement governs the terms of our ongoing engagement.`;
    case 'sow':
      return `Please find the Statement of Work for project ${data.projectName || data.docTitle}. This document outlines the scope, deliverables, and investment for this engagement.`;
    case 'nda':
      return `Please review the Non-Disclosure Agreement. This mutual NDA protects confidential information shared between both parties.`;
    case 'sla':
      return `Please review the Service Level Agreement for project ${data.projectName || data.docTitle}. This document outlines the service commitments, uptime targets, and support terms.`;
  }
}

export function buildDocumentEmailHtml(data: DocumentEmailData): string {
  const docTypeName = getDocTypeName(data.docType);
  const intro = getDocIntro(data);
  const actionText = 'Please review the document and reply to this email with your signature confirmation, or contact us to arrange signing.';

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
  .intro{font-size:13px;color:#475569;line-height:1.7;margin:16px 0}
  .action{font-size:13px;color:#64748B;line-height:1.7;background:#EFF6FF;border-left:3px solid #2563EB;padding:12px 16px;border-radius:0 6px 6px 0;margin:16px 0}
  .footer{background:#F8FAFC;padding:18px 36px;border-top:1px solid #E2E8F0;font-size:11px;color:#94A3B8;text-align:center}
</style></head>
<body><div class="wrap">
<div class="hdr">
  <h1>${data.businessName}</h1>
  <p>${data.businessEmail}</p>
</div>
<div class="body">
  <p class="greeting">Dear ${data.clientName},</p>
  <p class="intro">${intro}</p>
  <div class="card">
    <div class="card-title">Document Details</div>
    <table>
      <tr><td class="label">Document Type</td><td class="value">${docTypeName}</td></tr>
      <tr><td class="label">Title</td><td class="value">${data.docTitle}</td></tr>
      <tr><td class="label">Version</td><td class="value">v${data.version}</td></tr>
      <tr><td class="label">Generated Date</td><td class="value">${data.generatedDate}</td></tr>
      ${data.projectName ? `<tr><td class="label">Project</td><td class="value">${data.projectName}</td></tr>` : ''}
    </table>
  </div>
  <div class="action">${actionText}</div>
  <p style="margin-top:24px;font-size:14px;color:#334155">Best regards,<br><strong>${data.ownerName}</strong><br><span style="color:#64748B">${data.businessName}</span></p>
</div>
<div class="footer">Sent via BizDesk — Complete Business Suite</div>
</div></body></html>`;
}
