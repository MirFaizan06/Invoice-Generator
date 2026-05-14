import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Eye, Trash2, Copy, CheckCircle, XCircle, Download, ChevronDown, Send } from 'lucide-react';
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
  const [status, setStatus] = useState<'all' | 'paid' | 'unpaid' | 'cancelled'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'client'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [pdfLoading, setPdfLoading] = useState<number | null>(null);
  const [emailTarget, setEmailTarget] = useState<Invoice | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailToName, setEmailToName] = useState('');
  const [emailSending, setEmailSending] = useState(false);

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
    } else {
      await window.electronAPI.invoice.markPaid(inv.id);
      addToast({ type: 'success', title: 'Marked as paid!' });
    }
    load();
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
          {(['all', 'paid', 'unpaid', 'cancelled'] as const).map((s) => (
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
                    <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'cancelled' ? 'default' : 'warning'} dot>
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </Badge>
                  </td>
                  <td>
                    <div className="action-buttons" style={{ opacity: 1 }}>
                      <button className="action-btn" title="View" onClick={() => navigate(`/invoice/${inv.id}`)}>
                        <Eye size={13} />
                      </button>
                      <button className="action-btn" title={inv.status === 'paid' ? 'Mark Unpaid' : 'Mark Paid'} onClick={() => handleMarkPaid(inv)}>
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
