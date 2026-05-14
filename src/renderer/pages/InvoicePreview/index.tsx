import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, CheckCircle, XCircle, Folder, Copy, Paperclip, ExternalLink } from 'lucide-react';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { Modal } from '../../components/UI/Modal';
import { Input, TextArea } from '../../components/UI/Input';
import { useAppStore } from '../../store/app.store';
import type { Invoice, PaymentDetails } from '@shared/types';
import './InvoicePreview.css';

export const InvoicePreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToast = useAppStore((s) => s.addToast);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState<Omit<PaymentDetails, 'payment_proof_path'>>({
    paid_via: 'UPI', paid_on: new Date().toISOString().split('T')[0], transaction_id: '', payment_notes: '', amount_paid: 0,
  });
  const [payProofPath, setPayProofPath] = useState('');
  const [payProofName, setPayProofName] = useState('');
  const [paySaving, setPaySaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const inv = await window.electronAPI.invoice.getById(parseInt(id));
      setInvoice(inv);
      if (inv?.html_path) {
        try {
          const text = await window.electronAPI.shell.readFile(inv.html_path);
          setHtmlContent(text || '<p style="text-align:center;color:#999;padding:40px">No content</p>');
        } catch {
          setHtmlContent('<p style="text-align:center;color:#999;padding:40px">Preview unavailable</p>');
        }
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const generatePDF = async () => {
    if (!invoice) return;
    setPdfLoading(true);
    try {
      const pdfPath = await window.electronAPI.invoice.generatePDF(invoice.id);
      addToast({ type: 'success', title: 'PDF generated!', message: 'Saved to invoices folder' });
      await window.electronAPI.shell.showInFolder(pdfPath);
    } catch (err) {
      addToast({ type: 'error', title: 'PDF generation failed', message: String(err) });
    } finally {
      setPdfLoading(false);
    }
  };

  const openPayModal = () => {
    if (!invoice) return;
    setPayForm({ paid_via: 'UPI', paid_on: new Date().toISOString().split('T')[0], transaction_id: '', payment_notes: '', amount_paid: invoice.total });
    setPayProofPath(''); setPayProofName('');
    setShowPayModal(true);
  };

  const pickPayProof = async () => {
    const fp = await window.electronAPI.shell.pickFile({ title: 'Payment Proof', filters: [{ name: 'Images & PDF', extensions: ['jpg','jpeg','png','webp','pdf'] }] });
    if (fp) { setPayProofPath(fp); setPayProofName(fp.split(/[\\/]/).pop() ?? fp); }
  };

  const confirmPayment = async () => {
    if (!invoice) return;
    setPaySaving(true);
    try {
      await window.electronAPI.invoice.markPaid(invoice.id, { ...payForm, payment_proof_path: payProofPath });
      const newStatus = payForm.amount_paid >= invoice.total ? 'paid' : 'partial';
      setInvoice((i) => i ? { ...i, status: newStatus, amount_paid: payForm.amount_paid, paid_via: payForm.paid_via, paid_on: payForm.paid_on, transaction_id: payForm.transaction_id, payment_notes: payForm.payment_notes, payment_proof_path: payProofPath } : i);
      setShowPayModal(false);
      addToast({ type: 'success', title: newStatus === 'paid' ? 'Payment confirmed!' : 'Partial payment recorded' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed', message: String(err) });
    } finally {
      setPaySaving(false);
    }
  };

  const markUnpaid = async () => {
    if (!invoice) return;
    await window.electronAPI.invoice.markUnpaid(invoice.id);
    setInvoice((i) => i ? { ...i, status: 'unpaid', amount_paid: 0, paid_via: '', paid_on: '', transaction_id: '', payment_notes: '', payment_proof_path: '' } : i);
    addToast({ type: 'info', title: 'Invoice marked as unpaid' });
  };

  const duplicate = async () => {
    if (!invoice) return;
    const dup = await window.electronAPI.invoice.duplicate(invoice.id);
    addToast({ type: 'success', title: 'Invoice duplicated!', message: dup.invoice_number });
    navigate(`/invoice/${dup.id}`);
  };

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-pulse text-muted">Loading invoice...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="empty-state-title">Invoice not found</div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/history')}>Back to History</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="invoice-preview-page page-enter">
      <div className="invoice-preview-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={15} />} onClick={() => navigate('/history')} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{invoice.invoice_number}</span>
              <Badge variant={invoice.status === 'paid' ? 'success' : invoice.status === 'partial' ? 'info' : invoice.status === 'cancelled' ? 'default' : 'warning'} dot>
                {invoice.status === 'partial' ? 'Partially Paid' : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </Badge>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {invoice.client_name} · {new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · ₹{invoice.total.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" icon={<Copy size={14} />} onClick={duplicate}>Duplicate</Button>
          {invoice.status !== 'paid' ? (
            <Button variant="success" size="sm" icon={<CheckCircle size={14} />} onClick={openPayModal}>{invoice.status === 'partial' ? 'Add Payment' : 'Mark Paid'}</Button>
          ) : (
            <Button variant="secondary" size="sm" icon={<XCircle size={14} />} onClick={markUnpaid}>Mark Unpaid</Button>
          )}
          {invoice.pdf_path && (
            <Button variant="ghost" size="sm" icon={<Folder size={14} />} onClick={() => window.electronAPI.shell.showInFolder(invoice.pdf_path)}>Open Folder</Button>
          )}
          <Button variant="primary" icon={<Download size={15} />} onClick={generatePDF} loading={pdfLoading}>
            Generate PDF
          </Button>
        </div>
      </div>

      {/* Payment modal */}
      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title={`Confirm Payment — ${invoice.invoice_number}`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowPayModal(false)}>Cancel</Button>
            <Button variant="success" icon={<CheckCircle size={14} />} onClick={confirmPayment} loading={paySaving}>Confirm Payment</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--color-success-light)', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-md)', padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-success-dark)', fontWeight: 500 }}>Invoice Total</span>
            <span style={{ fontWeight: 800, color: 'var(--color-success-dark)' }}>₹{invoice.total.toLocaleString('en-IN')}</span>
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 5 }}>Amount Received (₹) *</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number" min={0} max={invoice.total} step={0.01}
                value={payForm.amount_paid}
                onChange={(e) => setPayForm((f) => ({ ...f, amount_paid: parseFloat(e.target.value) || 0 }))}
                style={{ flex: 1, border: '1px solid var(--color-border)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: '8px 10px', fontSize: 'var(--text-sm)', color: 'var(--color-text)', fontFamily: 'var(--font-sans)', outline: 'none' }}
              />
              <button onClick={() => setPayForm((f) => ({ ...f, amount_paid: invoice.total }))} style={{ whiteSpace: 'nowrap', background: 'var(--color-primary-light)', border: '1px solid var(--color-primary-border)', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', padding: '7px 12px', fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                Full ₹{invoice.total.toLocaleString('en-IN')}
              </button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 5 }}>Payment Method</div>
            <select className="docgen-select" value={payForm.paid_via} onChange={(e) => setPayForm((f) => ({ ...f, paid_via: e.target.value }))}>
              {['UPI', 'Bank Transfer / NEFT / RTGS', 'Cash', 'Cheque', 'Credit Card', 'Debit Card', 'Other'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Payment Date *" type="date" value={payForm.paid_on} onChange={(e) => setPayForm((f) => ({ ...f, paid_on: e.target.value }))} />
            <Input label="Transaction / Ref ID" placeholder="UPI ref, cheque no." value={payForm.transaction_id} onChange={(e) => setPayForm((f) => ({ ...f, transaction_id: e.target.value }))} />
          </div>
          {payForm.amount_paid > 0 && payForm.amount_paid < invoice.total && (
            <Input label="Full Payment Due By (optional)" type="date" value={(payForm as PaymentDetails & { full_payment_due_date?: string }).full_payment_due_date ?? ''}
              onChange={(e) => setPayForm((f) => ({ ...f, full_payment_due_date: e.target.value } as typeof f))} />
          )}
          <TextArea label="Notes (optional)" rows={2} value={payForm.payment_notes} onChange={(e) => setPayForm((f) => ({ ...f, payment_notes: e.target.value }))} />
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Proof (optional)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button variant="secondary" size="sm" icon={<Paperclip size={13} />} onClick={pickPayProof}>{payProofName ? 'Change' : 'Attach Screenshot / PDF'}</Button>
              {payProofName && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}><Paperclip size={11} /> {payProofName}</span>}
            </div>
          </div>
        </div>
      </Modal>

      <div className="invoice-preview-content">
        <div className="invoice-preview-sidebar">
          <div className="inv-detail-card">
            <div className="inv-detail-section">
              <div className="inv-detail-label">Invoice</div>
              <div className="inv-detail-value" style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{invoice.invoice_number}</div>
            </div>
            <div className="inv-detail-section">
              <div className="inv-detail-label">Client</div>
              <div className="inv-detail-value">{invoice.client_name}</div>
              {invoice.client_email && <div className="inv-detail-sub">{invoice.client_email}</div>}
              {invoice.client_phone && <div className="inv-detail-sub">{invoice.client_phone}</div>}
            </div>
            <div className="inv-detail-section">
              <div className="inv-detail-label">Project</div>
              <div className="inv-detail-value">{invoice.project_name}</div>
            </div>
            <div className="inv-detail-section">
              <div className="inv-detail-label">Date</div>
              <div className="inv-detail-value">{new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
            </div>
            {invoice.due_date && (
              <div className="inv-detail-section">
                <div className="inv-detail-label">Due Date</div>
                <div className="inv-detail-value">{new Date(invoice.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              </div>
            )}
            <div className="inv-detail-divider" />
            <div className="inv-detail-section">
              <div className="inv-detail-label">Subtotal</div>
              <div className="inv-detail-value">₹{invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="inv-detail-section">
              <div className="inv-detail-label">GST ({invoice.tax_percent}%)</div>
              <div className="inv-detail-value">₹{invoice.tax_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="inv-total-row">
              <span>Total</span>
              <span>₹{invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Payment details — shown when paid or partial */}
            {(invoice.status === 'paid' || invoice.status === 'partial') && (
              <>
                <div className="inv-detail-divider" />
                <div className="inv-detail-section">
                  <div className="inv-detail-label" style={{ color: invoice.status === 'paid' ? 'var(--color-success-dark)' : 'var(--color-warning-dark)' }}>
                    {invoice.status === 'paid' ? '✓ Payment Received' : '⚡ Partial Payment'}
                  </div>
                </div>
                {invoice.amount_paid > 0 && invoice.amount_paid < invoice.total && (
                  <div className="inv-detail-section">
                    <div className="inv-detail-label">Amount Paid</div>
                    <div className="inv-detail-value" style={{ color: 'var(--color-warning-dark)' }}>₹{invoice.amount_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })} <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>(₹{(invoice.total - invoice.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })} pending)</span></div>
                  </div>
                )}
                {invoice.paid_via && <div className="inv-detail-section"><div className="inv-detail-label">Method</div><div className="inv-detail-value">{invoice.paid_via}</div></div>}
                {invoice.paid_on && <div className="inv-detail-section"><div className="inv-detail-label">Date</div><div className="inv-detail-value">{invoice.paid_on}</div></div>}
                {invoice.transaction_id && <div className="inv-detail-section"><div className="inv-detail-label">Ref / TxID</div><div className="inv-detail-value" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{invoice.transaction_id}</div></div>}
                {invoice.payment_notes && <div className="inv-detail-section"><div className="inv-detail-label">Notes</div><div className="inv-detail-sub">{invoice.payment_notes}</div></div>}
                {invoice.payment_proof_path && (
                  <div className="inv-detail-section">
                    <button onClick={() => window.electronAPI.shell.openPath(invoice.payment_proof_path)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)' }}>
                      <Paperclip size={12} /> View Proof <ExternalLink size={11} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="invoice-preview-frame-wrap">
          <div className="invoice-preview-label">Invoice Preview</div>
          <div className="invoice-preview-frame">
            <iframe
              srcDoc={htmlContent}
              title="Invoice Preview"
              sandbox="allow-same-origin"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
