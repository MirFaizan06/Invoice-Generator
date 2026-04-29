import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Eye, Trash2, Copy, CheckCircle, XCircle, Download, ChevronDown } from 'lucide-react';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Badge } from '../../components/UI/Badge';
import { Modal } from '../../components/UI/Modal';
import { useAppStore } from '../../store/app.store';
import type { Invoice } from '@shared/types';
import './History.css';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const addToast = useAppStore((s) => s.addToast);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'paid' | 'unpaid' | 'cancelled'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'client'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [pdfLoading, setPdfLoading] = useState<number | null>(null);

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await window.electronAPI.invoice.delete(deleteTarget.id);
    setDeleteTarget(null);
    addToast({ type: 'success', title: 'Invoice deleted' });
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
                      <button className="action-btn" title="Duplicate" onClick={() => handleDuplicate(inv)}>
                        <Copy size={13} />
                      </button>
                      <button className="action-btn action-btn-danger" title="Delete" onClick={() => setDeleteTarget(inv)}>
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

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Invoice"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Are you sure you want to delete <strong>{deleteTarget?.invoice_number}</strong>?
          This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
};
