import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Eye, Trash2, Copy, CheckCircle, XCircle, Download, ChevronDown, Send, Paperclip, ExternalLink } from 'lucide-react';
import { TextArea } from '../../components/UI/Input';
import type { PaymentDetails } from '@shared/types';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Badge } from '../../components/UI/Badge';
import { Modal } from '../../components/UI/Modal';
import { useBusinessStore } from '../../store/business.store';
import { useAppStore } from '../../store/app.store';
import type { Invoice } from '@shared/types';
import './History.css';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const addToast = useAppStore((s) => s.addToast);
  const { businesses, activeBusiness } = useBusinessStore();
  const getBusinessName = (id: number) => businesses.find((b) => b.id === id)?.name || '—';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'paid' | 'partial' | 'unpaid' | 'cancelled'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'client'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [pdfLoading, setPdfLoading] = useState<number | null>(null);
  const [emailTarget, setEmailTarget] = useState<Invoice | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailToName, setEmailToName] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  // Payment confirmation modal
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null);
  const [paymentForm, setPaymentForm] = useState<Omit<PaymentDetails, 'payment_proof_path'>>({
    paid_via: 'UPI', paid_on: '', transaction_id: '', payment_notes: '', amount_paid: 0,
  });
  const [paymentProofPath, setPaymentProofPath] = useState('');
  const [paymentProofName, setPaymentProofName] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [sendConfirmEmail, setSendConfirmEmail] = useState(false);
  const [confirmEmailTo, setConfirmEmailTo] = useState('');
  const [confirmEmailName, setConfirmEmailName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.invoice.getAll({ search, status, sortBy, sortOrder });
      setInvoices(data);
    } finally {
      setLoading(false);
    }
  }, [search, status, sortBy, sortOrder]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load]);

  const openDeleteModal = (inv: Invoice) => {
    setDeleteTarget(inv);
    setDeleteStep(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteStep === 1) {
      setDeleteStep(2);
      return;
    }
    await window.electronAPI.invoice.delete(deleteTarget.id);
    setDeleteTarget(null);
    addToast({ type: 'success', title: 'Invoice deleted', message: deleteTarget.invoice_number });
    load();
  };

  const handleMarkPaid = async (inv: Invoice) => {
    if (inv.status === 'paid') {
      await window.electronAPI.invoice.markUnpaid(inv.id);
      addToast({ type: 'info', title: 'Marked as unpaid' });
      load();
    } else {
      const today = new Date().toISOString().split('T')[0];
      setPaymentForm({ paid_via: 'UPI', paid_on: today, transaction_id: '', payment_notes: '', amount_paid: inv.total });
      setPaymentProofPath('');
      setPaymentProofName('');
      setSendConfirmEmail(false);
      setConfirmEmailTo(inv.client_email || '');
      setConfirmEmailName(inv.client_name || '');
      setPaymentTarget(inv);
    }
  };

  const pickProofFile = async () => {
    const filePath = await window.electronAPI.shell.pickFile({
      title: 'Select Payment Proof',
      filters: [{ name: 'Images & PDF', extensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf'] }],
    });
    if (filePath) {
      setPaymentProofPath(filePath);
      setPaymentProofName(filePath.split(/[\\/]/).pop() ?? filePath);
    }
  };

  const handleConfirmPayment = async () => {
    if (!paymentTarget || !activeBusiness) return;
    setPaymentSaving(true);
    try {
      await window.electronAPI.invoice.markPaid(paymentTarget.id, {
        ...paymentForm,
        payment_proof_path: paymentProofPath,
      });

      if (sendConfirmEmail && confirmEmailTo.trim()) {
        const subject = `Payment Confirmed — Invoice ${paymentTarget.invoice_number}`;
        const bodyHtml = `<!DOCTYPE html><html><head><style>
body{font-family:'Segoe UI',Arial,sans-serif;color:#1E293B;background:#F1F5F9;margin:0}
.wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
.hdr{background:#0F172A;padding:24px 32px}.hdr h1{color:#fff;font-size:18px;margin:0 0 4px}
.hdr p{color:#94A3B8;font-size:12px;margin:0}
.body{padding:32px}.tag{display:inline-block;background:#D1FAE5;color:#065F46;font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;margin-bottom:16px}
table{width:100%;border-collapse:collapse;margin:16px 0}
td{padding:7px 0;font-size:13px;border-bottom:1px solid #F1F5F9}tr:last-child td{border-bottom:none}
.lbl{color:#64748B;width:45%}.val{font-weight:600;color:#0F172A}
.footer{background:#F8FAFC;padding:16px 32px;border-top:1px solid #E2E8F0;font-size:11px;color:#94A3B8;text-align:center}
</style></head><body><div class="wrap">
<div class="hdr"><h1>${activeBusiness.name}</h1><p>${activeBusiness.email || ''}</p></div>
<div class="body">
  <div class="tag">✓ Payment Received</div>
  <p style="font-size:14px;color:#334155;margin:0 0 8px">Dear ${confirmEmailName || paymentTarget.client_name},</p>
  <p style="font-size:14px;color:#475569;margin:0 0 16px">We have received your payment for the following invoice. Thank you!</p>
  <table>
    <tr><td class="lbl">Invoice Number</td><td class="val">${paymentTarget.invoice_number}</td></tr>
    <tr><td class="lbl">Amount Paid</td><td class="val" style="color:#10B981">₹${paymentTarget.total.toLocaleString('en-IN')}</td></tr>
    <tr><td class="lbl">Payment Date</td><td class="val">${paymentForm.paid_on}</td></tr>
    <tr><td class="lbl">Payment Method</td><td class="val">${paymentForm.paid_via}</td></tr>
    ${paymentForm.transaction_id ? `<tr><td class="lbl">Transaction / Ref ID</td><td class="val" style="font-family:monospace">${paymentForm.transaction_id}</td></tr>` : ''}
    ${paymentForm.payment_notes ? `<tr><td class="lbl">Notes</td><td class="val">${paymentForm.payment_notes}</td></tr>` : ''}
  </table>
  <p style="font-size:14px;color:#334155;margin-top:20px">Best regards,<br><strong>${activeBusiness.owner_name}</strong><br><span style="color:#64748B">${activeBusiness.name}</span></p>
</div>
<div class="footer">Sent via BizDesk — Complete Business Suite</div>
</div></body></html>`;
        const result = await window.electronAPI.mail.send({
          to: confirmEmailTo.trim(), toName: confirmEmailName.trim(),
          subject, bodyHtml,
          businessId: activeBusiness.id, relatedType: 'invoice', relatedId: paymentTarget.id,
        });
        if (result.success) {
          addToast({ type: 'success', title: 'Paid & confirmation sent!', message: `Email sent to ${confirmEmailTo}` });
        } else {
          addToast({ type: 'warning', title: 'Paid! Email failed', message: result.error });
        }
      } else {
        addToast({ type: 'success', title: 'Payment confirmed!', message: `Invoice ${paymentTarget.invoice_number} marked as paid` });
      }
      setPaymentTarget(null);
      load();
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to save payment', message: String(err) });
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleDuplicate = async (inv: Invoice) => {
    const dup = await window.electronAPI.invoice.duplicate(inv.id);
    addToast({ type: 'success', title: 'Duplicated!', message: dup.invoice_number });
    load();
  };

  const handlePDF = async (inv: Invoice) => {
    setPdfLoading(inv.id);
    try {
      const pdfPath = await window.electronAPI.invoice.generatePDF(inv.id);
      addToast({ type: 'success', title: 'PDF ready!', message: 'Saved to invoices folder' });
      await window.electronAPI.shell.showInFolder(pdfPath);
    } catch (err) {
      addToast({ type: 'error', title: 'PDF failed', message: String(err) });
    } finally {
      setPdfLoading(null);
    }
  };

  const openEmailModal = (inv: Invoice) => {
    setEmailTarget(inv);
    setEmailTo(inv.client_email || '');
    setEmailToName(inv.client_name || '');
  };

  const handleSendEmail = async () => {
    if (!emailTarget || !activeBusiness) return;
    if (!emailTo.trim()) { addToast({ type: 'error', title: 'Enter recipient email' }); return; }
    setEmailSending(true);
    const subject = `Invoice ${emailTarget.invoice_number} from ${activeBusiness.name}`;
    const dueDate = emailTarget.due_date ? new Date(emailTarget.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
    const bodyHtml = `<p>Dear ${emailToName || emailTarget.client_name},</p>
<p>Please find the details for invoice <strong>${emailTarget.invoice_number}</strong> below.</p>
<table style="border-collapse:collapse;width:100%;max-width:400px;">
  <tr><td style="padding:6px 0;color:#6B7280;">Invoice Number</td><td style="padding:6px 0;font-weight:600;">${emailTarget.invoice_number}</td></tr>
  <tr><td style="padding:6px 0;color:#6B7280;">Date</td><td style="padding:6px 0;">${new Date(emailTarget.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td></tr>
  <tr><td style="padding:6px 0;color:#6B7280;">Due Date</td><td style="padding:6px 0;">${dueDate}</td></tr>
  <tr><td style="padding:6px 0;color:#6B7280;">Amount</td><td style="padding:6px 0;font-weight:600;">₹${emailTarget.total.toLocaleString('en-IN')}</td></tr>
  <tr><td style="padding:6px 0;color:#6B7280;">Status</td><td style="padding:6px 0;">${emailTarget.status.charAt(0).toUpperCase() + emailTarget.status.slice(1)}</td></tr>
</table>
<p>Please process the payment at your earliest convenience. Feel free to reach out if you have any questions.</p>
<p>Regards,<br/>${activeBusiness.owner_name}<br/>${activeBusiness.name}</p>`;
    try {
      const result = await window.electronAPI.mail.send({
        to: emailTo.trim(),
        toName: emailToName.trim(),
        subject,
        bodyHtml,
        businessId: activeBusiness.id,
        relatedType: 'invoice',
        relatedId: emailTarget.id,
      });
      if (result.success) {
        addToast({ type: 'success', title: 'Email sent!', message: `Sent to ${emailTo}` });
        setEmailTarget(null);
      } else {
        addToast({ type: 'error', title: 'Failed to send email', message: result.error });
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to send email', message: String(err) });
    } finally {
      setEmailSending(false);
    }
  };

  const toggleSort = (col: 'date' | 'amount' | 'client') => {
    if (sortBy === col) setSortOrder((s) => s === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortOrder('desc'); }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return null;
    return <ChevronDown size={12} style={{ transform: sortOrder === 'asc' ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }} />;
  };

  const totalAmount = invoices.reduce((s, i) => s + (i.status !== 'cancelled' ? i.total : 0), 0);

  return (
    <div className="page-content history-page page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoice History</h1>
          <p className="page-subtitle">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''} · ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="history-filters">
        <div style={{ flex: 1, maxWidth: 320 }}>
          <Input
            placeholder="Search invoices, clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={14} />}
          />
        </div>
        <div className="history-filter-group">
          <Filter size={14} style={{ color: 'var(--color-text-muted)' }} />
          {(['all', 'paid', 'partial', 'unpaid', 'cancelled'] as const).map((s) => (
            <button key={s} className={`history-filter-btn ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="history-table-wrap">
        {loading ? (
          <div className="empty-state"><div className="animate-pulse text-muted text-sm">Loading...</div></div>
        ) : invoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No invoices found</div>
            <div className="empty-state-desc">{search ? 'Try a different search term' : 'Create your first invoice'}</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Business</th>
                <th>Client</th>
                <th>Project</th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('date')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Date <SortIcon col="date" /></div>
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right' }} onClick={() => toggleSort('amount')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>Amount <SortIcon col="amount" /></div>
                </th>
                <th>Status</th>
                <th style={{ width: 150 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer', color: 'var(--color-primary)' }} onClick={() => navigate(`/invoice/${inv.id}`)}>
                      {inv.invoice_number}
                    </span>
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: 12, whiteSpace: 'nowrap' }}>{getBusinessName(inv.business_id)}</td>
                  <td style={{ fontWeight: 500 }}>{inv.client_name}</td>
                  <td style={{ color: 'var(--color-text-secondary)', maxWidth: 180 }} className="truncate">{inv.project_name}</td>
                  <td style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>₹{inv.total.toLocaleString('en-IN')}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'partial' ? 'info' : inv.status === 'cancelled' ? 'default' : 'warning'} dot>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </Badge>
                      {inv.status === 'paid' && inv.payment_proof_path && (
                        <Paperclip size={11} style={{ color: 'var(--color-text-muted)' }} title="Payment proof attached" />
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons" style={{ opacity: 1 }}>
                      <button className="action-btn" title="View" onClick={() => navigate(`/invoice/${inv.id}`)}>
                        <Eye size={13} />
                      </button>
                      <button className="action-btn" title={inv.status === 'paid' ? 'Mark Unpaid' : inv.status === 'partial' ? 'Add/Confirm Payment' : 'Confirm Payment'} onClick={() => handleMarkPaid(inv)}>
                        {inv.status === 'paid' ? <XCircle size={13} /> : <CheckCircle size={13} />}
                      </button>
                      <button className="action-btn" title="PDF" onClick={() => handlePDF(inv)} disabled={pdfLoading === inv.id}>
                        <Download size={13} />
                      </button>
                      <button className="action-btn" title="Send Email" onClick={() => openEmailModal(inv)}>
                        <Send size={13} />
                      </button>
                      <button className="action-btn" title="Duplicate" onClick={() => handleDuplicate(inv)}>
                        <Copy size={13} />
                      </button>
                      <button className="action-btn action-btn-danger" title="Delete" onClick={() => openDeleteModal(inv)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Payment Confirmation Modal */}
      <Modal
        isOpen={!!paymentTarget}
        onClose={() => setPaymentTarget(null)}
        title={`Confirm Payment — ${paymentTarget?.invoice_number ?? ''}`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaymentTarget(null)}>Cancel</Button>
            <Button variant="success" icon={<CheckCircle size={14} />} onClick={handleConfirmPayment} loading={paymentSaving}>
              Confirm Payment
            </Button>
          </>
        }
      >
        {paymentTarget && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Amount banner */}
            <div style={{ background: 'var(--color-success-light)', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-md)', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-success-dark)', fontWeight: 500 }}>Amount being confirmed</span>
              <span style={{ fontWeight: 800, fontSize: 'var(--text-lg)', color: 'var(--color-success-dark)' }}>₹{paymentTarget.total.toLocaleString('en-IN')}</span>
            </div>

            {/* Payment Mode */}
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 5 }}>Payment Method *</div>
              <select
                className="docgen-select"
                value={paymentForm.paid_via}
                onChange={(e) => setPaymentForm((f) => ({ ...f, paid_via: e.target.value }))}
              >
                {['UPI', 'Bank Transfer / NEFT / RTGS', 'Cash', 'Cheque', 'Credit Card', 'Debit Card', 'Other'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Amount received */}
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 5 }}>Amount Received (₹) *</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  min={0}
                  max={paymentTarget.total}
                  step={0.01}
                  value={paymentForm.amount_paid}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, amount_paid: parseFloat(e.target.value) || 0 }))}
                  style={{ flex: 1, border: '1px solid var(--color-border)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: '8px 10px', fontSize: 'var(--text-sm)', color: 'var(--color-text)', fontFamily: 'var(--font-sans)', outline: 'none' }}
                />
                <button
                  onClick={() => setPaymentForm((f) => ({ ...f, amount_paid: paymentTarget.total }))}
                  style={{ whiteSpace: 'nowrap', background: 'var(--color-primary-light)', border: '1px solid var(--color-primary-border)', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', padding: '7px 12px', fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                >
                  Full ₹{paymentTarget.total.toLocaleString('en-IN')}
                </button>
              </div>
              {paymentForm.amount_paid > 0 && paymentForm.amount_paid < paymentTarget.total && (
                <div style={{ marginTop: 5, fontSize: 'var(--text-xs)', color: 'var(--color-warning-dark)', background: 'var(--color-warning-light)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', display: 'inline-block' }}>
                  Partial payment — invoice will be marked as <strong>Partially Paid</strong> (₹{(paymentTarget.total - paymentForm.amount_paid).toLocaleString('en-IN')} remaining)
                </div>
              )}
            </div>

            {/* Two columns: Date + Transaction ID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Payment Date *"
                type="date"
                value={paymentForm.paid_on}
                onChange={(e) => setPaymentForm((f) => ({ ...f, paid_on: e.target.value }))}
              />
              <Input
                label="Transaction / Reference ID"
                placeholder="e.g. UPI ref, cheque no."
                value={paymentForm.transaction_id}
                onChange={(e) => setPaymentForm((f) => ({ ...f, transaction_id: e.target.value }))}
              />
            </div>

            {/* Full payment due date — shown for partial */}
            {paymentForm.amount_paid > 0 && paymentForm.amount_paid < (paymentTarget?.total ?? 0) && (
              <Input
                label="Full Payment Due By (optional)"
                type="date"
                value={(paymentForm as PaymentDetails & { full_payment_due_date?: string }).full_payment_due_date ?? ''}
                onChange={(e) => setPaymentForm((f) => ({ ...f, full_payment_due_date: e.target.value } as typeof f))}
                hint="Auto-reminders will be sent on this date if balance remains unpaid"
              />
            )}

            {/* Notes */}
            <TextArea
              label="Payment Notes (optional)"
              placeholder="Any additional details about this payment..."
              rows={2}
              value={paymentForm.payment_notes}
              onChange={(e) => setPaymentForm((f) => ({ ...f, payment_notes: e.target.value }))}
            />

            {/* Proof upload */}
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Payment Proof (optional)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Button variant="secondary" size="sm" icon={<Paperclip size={13} />} onClick={pickProofFile}>
                  {paymentProofName ? 'Change File' : 'Attach Screenshot / PDF'}
                </Button>
                {paymentProofName && (
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Paperclip size={11} /> {paymentProofName}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>Accepted: JPG, PNG, PDF, WebP. Stored securely on your device.</div>
            </div>

            {/* Send confirmation email toggle */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text)' }}>
                <input
                  type="checkbox"
                  checked={sendConfirmEmail}
                  onChange={(e) => setSendConfirmEmail(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                />
                <Send size={14} style={{ color: 'var(--color-primary)' }} />
                Send payment confirmation email to client
              </label>
              {sendConfirmEmail && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                  <Input
                    label="Client Name"
                    placeholder="Client name"
                    value={confirmEmailName}
                    onChange={(e) => setConfirmEmailName(e.target.value)}
                  />
                  <Input
                    label="Client Email *"
                    type="email"
                    placeholder="client@example.com"
                    value={confirmEmailTo}
                    onChange={(e) => setConfirmEmailTo(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Email Modal */}
      <Modal
        isOpen={!!emailTarget}
        onClose={() => setEmailTarget(null)}
        title="Send Invoice via Email"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEmailTarget(null)}>Cancel</Button>
            <Button variant="primary" icon={<Send size={14} />} onClick={handleSendEmail} loading={emailSending}>Send</Button>
          </>
        }
      >
        {emailTarget && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input
              label="Recipient Name"
              placeholder="Client name"
              value={emailToName}
              onChange={(e) => setEmailToName(e.target.value)}
            />
            <Input
              label="Recipient Email"
              type="email"
              placeholder="client@example.com"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
            />
            <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              <div style={{ fontWeight: 600, marginBottom: 2, color: 'var(--color-text-secondary)' }}>Subject (auto-generated)</div>
              Invoice {emailTarget.invoice_number} · ₹{emailTarget.total.toLocaleString('en-IN')}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={deleteStep === 1 ? 'Delete Invoice' : 'Final Confirmation'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>
              {deleteStep === 1 ? 'Continue' : 'Yes, Delete Permanently'}
            </Button>
          </>
        }
      >
        {deleteStep === 1 ? (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            Are you sure you want to delete invoice <strong>{deleteTarget?.invoice_number}</strong>?
            The invoice files will be removed and it will no longer appear in your history.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '10px 14px', fontSize: 'var(--text-sm)', color: '#991B1B' }}>
              This is your final confirmation. This action cannot be undone.
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              Invoice <strong style={{ fontFamily: 'var(--font-mono)' }}>{deleteTarget?.invoice_number}</strong> will be permanently deleted.
              The invoice number slot will remain reserved and cannot be reused.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};
