import type { TemplateContext } from './msa.template';

function legalCSS(): string {
  return `
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 13px;
  color: #1a1a1a;
  background: #ffffff;
  line-height: 1.7;
}
.page {
  max-width: 794px;
  margin: 0 auto;
  padding: 48px;
  background: #ffffff;
}
.doc-ref {
  text-align: right;
  font-size: 10px;
  color: #888888;
  margin-bottom: 8px;
  letter-spacing: 0.3px;
}
.doc-title {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  text-align: center;
  letter-spacing: 2px;
  font-variant: small-caps;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.doc-subtitle {
  text-align: center;
  font-size: 11px;
  color: #555555;
  margin-bottom: 32px;
}
.divider {
  border: none;
  border-top: 2px solid #1a1a1a;
  margin: 20px 0;
}
.divider-light {
  border: none;
  border-top: 1px solid #dddddd;
  margin: 16px 0;
}
.details-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 28px;
  font-size: 12px;
}
.details-table th {
  background: #f0f0f0;
  font-weight: 700;
  color: #333333;
  text-align: left;
  padding: 9px 14px;
  border: 1px solid #dddddd;
  width: 35%;
  font-variant: small-caps;
  letter-spacing: 0.5px;
}
.details-table td {
  padding: 9px 14px;
  border: 1px solid #dddddd;
  color: #1a1a1a;
}
.section {
  margin-bottom: 22px;
}
.section-heading {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 13px;
  font-weight: 700;
  color: #1a1a1a;
  font-variant: small-caps;
  letter-spacing: 0.8px;
  margin-bottom: 8px;
  text-transform: uppercase;
  border-bottom: 1px solid #dddddd;
  padding-bottom: 5px;
}
.section-body {
  font-size: 13px;
  color: #2a2a2a;
  line-height: 1.75;
  white-space: pre-wrap;
}
.investment-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
  font-size: 13px;
}
.investment-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #eeeeee;
}
.investment-table td:first-child {
  font-weight: 600;
  color: #333333;
  width: 40%;
}
.signature-block {
  display: flex;
  gap: 40px;
  margin-top: 48px;
}
.sig-party {
  flex: 1;
  border-top: 2px solid #1a1a1a;
  padding-top: 14px;
}
.sig-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #555555;
  margin-bottom: 6px;
}
.sig-name {
  font-size: 14px;
  font-weight: 700;
  color: #111111;
  margin-bottom: 4px;
}
.sig-role {
  font-size: 11px;
  color: #666666;
  margin-bottom: 20px;
}
.sig-line {
  font-size: 12px;
  color: #333333;
  margin-bottom: 10px;
  border-bottom: 1px solid #aaaaaa;
  padding-bottom: 24px;
}
@media print {
  @page { size: A4; margin: 20mm; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { padding: 0; max-width: 100%; }
}
`;
}

export function generateSowHtml(ctx: TemplateContext): string {
  const { business, client, project, date, fieldValues } = ctx;
  const fv = fieldValues as Record<string, string | number>;
  const projectName = project?.name || (fv.project_name as string) || client.name;
  const sowRef = `SOW-${projectName.substring(0, 3).toUpperCase()}-${date.replace(/ /g, '-')}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Statement of Work – ${projectName}</title>
  <style>${legalCSS()}</style>
</head>
<body>
<div class="page">

  <div class="doc-ref">${sowRef}</div>
  <div class="doc-title">Statement of Work</div>
  <div class="doc-subtitle">Executed under the Master Services Agreement between ${business.name} and ${client.name}</div>
  <hr class="divider">

  <table class="details-table">
    <tr><th>Project Name</th><td>${projectName}</td></tr>
    <tr><th>Client</th><td>${client.name}${client.address ? `, ${client.address}` : ''}</td></tr>
    <tr><th>Service Provider</th><td>${business.name}${business.address ? `, ${business.address}` : ''}</td></tr>
    <tr><th>Start Date</th><td>${fv.start_date || project?.start_date || ''}</td></tr>
    <tr><th>End Date</th><td>${fv.end_date || project?.end_date || ''}</td></tr>
    <tr><th>SOW Date</th><td>${date}</td></tr>
  </table>

  <div class="section">
    <div class="section-heading">1. Project Overview</div>
    <div class="section-body">${fv.project_description || ''}</div>
  </div>

  <div class="section">
    <div class="section-heading">2. Scope of Work</div>
    <div class="section-body">${fv.scope || ''}</div>
  </div>

  <div class="section">
    <div class="section-heading">3. Out of Scope</div>
    <div class="section-body">${fv.out_of_scope || 'Any work not explicitly listed in the Scope of Work section above is considered out of scope and will require a separate change order.'}</div>
  </div>

  <div class="section">
    <div class="section-heading">4. Milestones &amp; Deliverables</div>
    <div class="section-body">${fv.milestones || ''}</div>
  </div>

  <div class="section">
    <div class="section-heading">5. Investment</div>
    <table class="investment-table">
      <tr><td>Total Amount</td><td><strong>${fv.currency || 'INR'} ${fv.total_amount || '0'}</strong></td></tr>
      <tr><td>Payment Terms</td><td>${fv.payment_terms || ''}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-heading">6. Acceptance</div>
    <div class="section-body">Client will review and accept each deliverable within five (5) business days of receipt. If Client does not provide written feedback within this period, the deliverable shall be deemed accepted. Requested changes after acceptance may be treated as new scope.</div>
  </div>

  <hr class="divider-light">

  <div class="signature-block">
    <div class="sig-party">
      <div class="sig-label">Service Provider</div>
      <div class="sig-name">${business.name}</div>
      <div class="sig-role">${business.owner_name || 'Authorized Signatory'}</div>
      <div class="sig-line">Signature: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
      <div class="sig-line">Date: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
    </div>
    <div class="sig-party">
      <div class="sig-label">Client</div>
      <div class="sig-name">${client.name}</div>
      <div class="sig-role">Authorized Signatory</div>
      <div class="sig-line">Signature: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
      <div class="sig-line">Date: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
    </div>
  </div>

</div>
</body>
</html>`;
}
