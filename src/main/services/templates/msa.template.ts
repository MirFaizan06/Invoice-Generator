export interface TemplateContext {
  business: Record<string, string>;
  client: Record<string, string>;
  project: Record<string, string> | null;
  date: string;
  fieldValues: Record<string, unknown>;
}

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
}
.clause {
  padding-left: 28px;
  text-indent: -28px;
  margin-bottom: 10px;
  font-size: 13px;
  color: #2a2a2a;
  line-height: 1.75;
}
.clause-num {
  font-weight: 700;
  color: #111111;
  display: inline-block;
  width: 28px;
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

export function generateMsaHtml(ctx: TemplateContext): string {
  const { business, client, date, fieldValues } = ctx;
  const fv = fieldValues as Record<string, string | number>;
  const ref = `MSA-${(client.name || 'CLT').substring(0, 3).toUpperCase()}-${date.replace(/ /g, '-')}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Master Services Agreement – ${client.name}</title>
  <style>${legalCSS()}</style>
</head>
<body>
<div class="page">

  <div class="doc-ref">${ref}</div>
  <div class="doc-title">Master Services Agreement</div>
  <div class="doc-subtitle">Date: ${date}</div>
  <hr class="divider">

  <div class="parties-section">
    This Master Services Agreement (&ldquo;Agreement&rdquo;) is entered into as of <strong>${date}</strong> between
    <strong>${business.name}</strong>, ${business.address || 'India'} (&ldquo;Service Provider&rdquo;)
    and
    <strong>${client.name}</strong>, ${client.address || 'India'} (&ldquo;Client&rdquo;).
  </div>

  <div class="section">
    <div class="section-heading">Terms and Conditions</div>

    <div class="clause">
      <span class="clause-num">1.</span>
      <strong>Services.</strong> Service Provider agrees to provide professional software development and technology services as mutually agreed in individual Statements of Work (&ldquo;SOW&rdquo;) executed under this Agreement. Each SOW will describe the specific services, deliverables, timelines, and fees.
    </div>

    <div class="clause">
      <span class="clause-num">2.</span>
      <strong>Payment Terms.</strong> Invoices issued by Service Provider are due within <strong>${fv.payment_due_days ?? 30}</strong> days of the invoice date. Late payment attracts interest at 1.5% per month on the outstanding balance until paid in full.
    </div>

    <div class="clause">
      <span class="clause-num">3.</span>
      <strong>Intellectual Property.</strong> All work product, deliverables, code, designs, and documentation created by Service Provider specifically for Client under this Agreement shall become Client&rsquo;s property upon receipt of full payment for the applicable SOW. Service Provider retains ownership of pre-existing tools, frameworks, and general methodologies.
    </div>

    <div class="clause">
      <span class="clause-num">4.</span>
      <strong>Confidentiality.</strong> Both parties agree to keep each other&rsquo;s confidential information—including business data, technical specifications, pricing, and client lists—strictly private during the term of this Agreement and for two (2) years thereafter. This obligation does not apply to information that is publicly known or independently developed.
    </div>

    <div class="clause">
      <span class="clause-num">5.</span>
      <strong>Limitation of Liability.</strong> In no event shall either party&rsquo;s total cumulative liability arising out of or related to this Agreement exceed <strong>${fv.liability_cap ?? 'the total fees paid in the preceding three months'}</strong>. Neither party shall be liable for indirect, incidental, special, or consequential damages.
    </div>

    <div class="clause">
      <span class="clause-num">6.</span>
      <strong>Indemnification.</strong> Each party agrees to indemnify, defend, and hold harmless the other party and its officers, directors, and employees from any claims, losses, or damages arising from that party&rsquo;s own acts of negligence, willful misconduct, or breach of this Agreement.
    </div>

    <div class="clause">
      <span class="clause-num">7.</span>
      <strong>Term &amp; Termination.</strong> This Agreement commences on the date first signed above and continues until terminated. Either party may terminate this Agreement upon <strong>${fv.notice_period_days ?? 30}</strong> days&rsquo; prior written notice to the other party. Termination does not relieve either party of obligations under active SOWs or payment of amounts already due.
    </div>

    <div class="clause">
      <span class="clause-num">8.</span>
      <strong>Independent Contractor.</strong> Service Provider is an independent contractor and not an employee, partner, or agent of Client. Service Provider is solely responsible for its own taxes, insurance, and statutory contributions.
    </div>

    <div class="clause">
      <span class="clause-num">9.</span>
      <strong>Governing Law.</strong> This Agreement shall be governed by and construed in accordance with the laws of <strong>${fv.governing_law ?? 'India'}</strong>. Any disputes arising under this Agreement shall be subject to the exclusive jurisdiction of the competent courts of <strong>${fv.jurisdiction ?? 'India'}</strong>.
    </div>
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
