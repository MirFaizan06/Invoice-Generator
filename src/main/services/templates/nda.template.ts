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
.exclusion-list {
  margin: 8px 0 0 28px;
  padding-left: 16px;
}
.exclusion-list li {
  margin-bottom: 4px;
  color: #2a2a2a;
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

export function generateNdaHtml(ctx: TemplateContext): string {
  const { business, client, date, fieldValues } = ctx;
  const fv = fieldValues as Record<string, string | number>;
  const ref = `NDA-${(client.name || 'CLT').substring(0, 3).toUpperCase()}-${date.replace(/ /g, '-')}`;
  const exclusions = (fv.exclusions as string) || '';
  const periodYears = fv.confidentiality_period_years ?? 3;
  const governingLaw = (fv.governing_law as string) || 'India';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Non-Disclosure Agreement – ${client.name}</title>
  <style>${legalCSS()}</style>
</head>
<body>
<div class="page">

  <div class="doc-ref">${ref}</div>
  <div class="doc-title">Non-Disclosure Agreement</div>
  <div class="doc-subtitle">(Mutual) &mdash; Date: ${date}</div>
  <hr class="divider">

  <div class="parties-section">
    This Non-Disclosure Agreement (&ldquo;Agreement&rdquo;) is entered into as of <strong>${date}</strong> between
    <strong>${business.name}</strong>, ${business.address || 'India'} (&ldquo;Party A&rdquo;)
    and
    <strong>${client.name}</strong>, ${client.address || 'India'} (&ldquo;Party B&rdquo;).
    Both parties are collectively referred to as the &ldquo;Parties&rdquo;.
  </div>

  <div class="section">
    <div class="section-heading">Terms and Conditions</div>

    <div class="clause">
      <span class="clause-num">1.</span>
      <strong>Definition of Confidential Information.</strong> &ldquo;Confidential Information&rdquo; means any non-public information disclosed by one party (&ldquo;Disclosing Party&rdquo;) to the other (&ldquo;Receiving Party&rdquo;), whether orally, in writing, or by any other means, including but not limited to: business plans, financial data, technical specifications, source code, trade secrets, customer lists, pricing information, and any other information that a reasonable person would understand to be confidential.
    </div>

    <div class="clause">
      <span class="clause-num">2.</span>
      <strong>Obligations.</strong> Each Receiving Party agrees to: (a) maintain the Confidential Information in strict confidence; (b) use the Confidential Information solely for the purpose of evaluating or performing the business relationship between the Parties; (c) protect the Confidential Information with at least the same degree of care it uses for its own confidential information, but no less than reasonable care; and (d) not disclose the Confidential Information to any third party without prior written consent of the Disclosing Party.
    </div>

    <div class="clause">
      <span class="clause-num">3.</span>
      <strong>Exclusions.</strong> Confidential Information does not include information that:
      <ul class="exclusion-list">
        <li>Is or becomes publicly known through no act or omission of the Receiving Party;</li>
        <li>Was rightfully known to the Receiving Party before disclosure by the Disclosing Party;</li>
        <li>Is independently developed by the Receiving Party without use of the Confidential Information;</li>
        <li>Is rightfully received from a third party without restriction on disclosure;</li>
        ${exclusions ? `<li>${exclusions}</li>` : ''}
      </ul>
    </div>

    <div class="clause">
      <span class="clause-num">4.</span>
      <strong>Duration.</strong> This Agreement and the confidentiality obligations hereunder shall remain in effect for a period of <strong>${periodYears}</strong> year(s) from the date of signing. Obligations with respect to Confidential Information that constitutes a trade secret shall survive until such information ceases to qualify as a trade secret under applicable law.
    </div>

    <div class="clause">
      <span class="clause-num">5.</span>
      <strong>Return of Information.</strong> Upon written request by the Disclosing Party or upon termination of this Agreement, the Receiving Party shall promptly return or destroy all Confidential Information in its possession, including all copies, extracts, and summaries thereof, and certify in writing that it has done so.
    </div>

    <div class="clause">
      <span class="clause-num">6.</span>
      <strong>Governing Law.</strong> This Agreement shall be governed by and construed in accordance with the laws of <strong>${governingLaw}</strong>. Any disputes arising under this Agreement shall be subject to the exclusive jurisdiction of the competent courts of <strong>${governingLaw}</strong>.
    </div>
  </div>

  <hr class="divider-light">

  <div class="signature-block">
    <div class="sig-party">
      <div class="sig-label">Party A – Service Provider</div>
      <div class="sig-name">${business.name}</div>
      <div class="sig-role">${business.owner_name || 'Authorized Signatory'}</div>
      <div class="sig-line">Signature: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
      <div class="sig-line">Date: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
    </div>
    <div class="sig-party">
      <div class="sig-label">Party B – Client</div>
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
