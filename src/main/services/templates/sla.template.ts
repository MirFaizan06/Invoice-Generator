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
.parties-section {
  background: #f7f7f7;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 20px 24px;
  margin-bottom: 28px;
  font-size: 13px;
  color: #1a1a1a;
  line-height: 1.8;
}
.parties-section strong {
  color: #111111;
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
.sla-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  font-size: 12px;
}
.sla-table thead tr {
  background: #1a1a1a;
}
.sla-table thead th {
  color: #ffffff;
  padding: 10px 14px;
  text-align: left;
  font-weight: 700;
  letter-spacing: 0.4px;
}
.sla-table tbody tr:nth-child(even) {
  background: #f5f5f5;
}
.sla-table tbody tr:nth-child(odd) {
  background: #ffffff;
}
.sla-table tbody td {
  padding: 9px 14px;
  border-bottom: 1px solid #e5e5e5;
  color: #1a1a1a;
  vertical-align: middle;
}
.priority-critical { color: #cc0000; font-weight: 700; }
.priority-high { color: #cc6600; font-weight: 600; }
.priority-medium { color: #336600; }
.priority-low { color: #555555; }
.retainer-box {
  margin-top: 8px;
  padding: 14px 18px;
  background: #f0f0f0;
  border-left: 4px solid #1a1a1a;
  border-radius: 0 4px 4px 0;
  font-size: 13px;
}
.retainer-box strong {
  font-size: 15px;
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

export function generateSlaHtml(ctx: TemplateContext): string {
  const { business, client, project, date, fieldValues } = ctx;
  const fv = fieldValues as Record<string, string | number>;
  const projectName = project?.name || (fv.project_name as string) || client.name;
  const ref = `SLA-${projectName.substring(0, 3).toUpperCase()}-${date.replace(/ /g, '-')}`;

  const uptime = fv.uptime_percent ?? '99.5';
  const rtCritical = (fv.response_time_critical as string) || '1 hour';
  const rtHigh = (fv.response_time_high as string) || '4 hours';
  const supportHours = (fv.support_hours as string) || 'Monday–Friday, 9:00 AM – 6:00 PM IST';
  const monthlyFee = fv.monthly_fee ?? 0;
  const currency = (fv.currency as string) || 'INR';
  const exclusions = (fv.exclusions as string) || '';
  const servicesDescription = (fv.services_description as string) || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Service Level Agreement – ${projectName}</title>
  <style>${legalCSS()}</style>
</head>
<body>
<div class="page">

  <div class="doc-ref">${ref}</div>
  <div class="doc-title">Service Level Agreement</div>
  <div class="doc-subtitle">Between ${business.name} and ${client.name} &mdash; Effective: ${date}</div>
  <hr class="divider">

  <div class="parties-section">
    This Service Level Agreement (&ldquo;SLA&rdquo;) is entered into as of <strong>${date}</strong> between
    <strong>${business.name}</strong>, ${business.address || 'India'} (&ldquo;Service Provider&rdquo;)
    and
    <strong>${client.name}</strong>, ${client.address || 'India'} (&ldquo;Client&rdquo;).
  </div>

  <div class="section">
    <div class="section-heading">1. Services Covered</div>
    <div class="section-body">${servicesDescription || 'Professional software development, maintenance, and technical support services as agreed between the parties.'}</div>
  </div>

  <div class="section">
    <div class="section-heading">2. Service Levels &amp; Response Times</div>
    <table class="sla-table">
      <thead>
        <tr>
          <th>Priority</th>
          <th>Description</th>
          <th>Response Time</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="priority-critical">Critical</span></td>
          <td>System down, critical business impact, data loss risk</td>
          <td>${rtCritical}</td>
        </tr>
        <tr>
          <td><span class="priority-high">High</span></td>
          <td>Major feature broken, significant business impact</td>
          <td>${rtHigh}</td>
        </tr>
        <tr>
          <td><span class="priority-medium">Medium</span></td>
          <td>Minor feature issue, limited business impact</td>
          <td>Next business day</td>
        </tr>
        <tr>
          <td><span class="priority-low">Low</span></td>
          <td>Cosmetic issue, enhancement request</td>
          <td>As scheduled</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-heading">3. Uptime Commitment</div>
    <div class="section-body">Service Provider commits to <strong>${uptime}%</strong> monthly uptime for all covered services, measured on a calendar-month basis, excluding scheduled maintenance windows communicated at least 24 hours in advance.</div>
  </div>

  <div class="section">
    <div class="section-heading">4. Support Hours</div>
    <div class="section-body">${supportHours}</div>
  </div>

  <div class="section">
    <div class="section-heading">5. Monthly Retainer</div>
    <div class="retainer-box">
      <strong>${currency} ${monthlyFee}</strong> per month, billed on the 1st of each calendar month.
      Payment is due within 15 days of the invoice date.
    </div>
  </div>

  <div class="section">
    <div class="section-heading">6. Exclusions</div>
    <div class="section-body">This SLA does not apply to service disruptions caused by: (a) force majeure events including natural disasters, government actions, or widespread internet outages; (b) issues attributable to Client&rsquo;s own infrastructure, hosting, or third-party services; (c) scheduled maintenance windows; (d) Client-induced errors or unauthorized modifications.${exclusions ? `\n\nAdditional exclusions: ${exclusions}` : ''}</div>
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
