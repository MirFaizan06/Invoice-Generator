import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, CheckCircle, XCircle, Download, Copy } from 'lucide-react';
import { Input } from '../../components/UI/Input';
import { Badge } from '../../components/UI/Badge';
import { useAppStore } from '../../store/app.store';
import { useBusinessStore } from '../../store/business.store';
import type { Invoice } from '@shared/types';
import './Search.css';

export const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const addToast = useAppStore((s) => s.addToast);
  const { businesses } = useBusinessStore();
  const getBusinessName = (id: number) => businesses.find((b) => b.id === id)?.name || '—';

  const [query, setQuery] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState<number | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const data = await window.electronAPI.invoice.getAll(
        q.trim()
          ? { search: q.trim(), sortBy: 'date', sortOrder: 'desc' }
          : { sortBy: 'date', sortOrder: 'desc', limit: 50 }
      );
      setInvoices(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(query), query ? 300 : 0);
    return () => clearTimeout(t);
  }, [query, load]);

  const handleMarkPaid = async (inv: Invoice) => {
    if (inv.status === 'paid') {
      await window.electronAPI.invoice.markUnpaid(inv.id);
      addToast({ type: 'info', title: 'Marked as unpaid' });
    } else {
      await window.electronAPI.invoice.markPaid(inv.id);
      addToast({ type: 'success', title: 'Marked as paid!' });
    }
    load(query);
  };

  const handleDuplicate = async (inv: Invoice) => {
    const dup = await window.electronAPI.invoice.duplicate(inv.id);
    addToast({ type: 'success', title: 'Duplicated!', message: dup.invoice_number });
    load(query);
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

  return (
    <div className="page-content search-page page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Search Invoices</h1>
          <p className="page-subtitle">
            {query ? `${invoices.length} result${invoices.length !== 1 ? 's' : ''} for "${query}"` : `Showing last ${invoices.length} invoices`}
          </p>
        </div>
      </div>

      <div className="search-bar-wrap">
        <div style={{ maxWidth: 520, width: '100%' }}>
          <Input
            placeholder="Search by client name, email, GSTIN, or invoice ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            icon={<Search size={14} />}
            autoFocus
          />
        </div>
        {!query && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 6 }}>
            Showing last 50 invoices by default. Start typing to search across all invoices.
          </p>
        )}
      </div>

      <div className="history-table-wrap">
        {loading ? (
          <div className="empty-state">
            <div className="animate-pulse text-muted text-sm">Searching…</div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">{query ? 'No results found' : 'No invoices yet'}</div>
            <div className="empty-state-desc">
              {query ? `Try searching by client name, email, GSTIN, or invoice ID` : 'Create your first invoice to get started'}
            </div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Business</th>
                <th>Client</th>
                <th>Email</th>
                <th>GSTIN</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Status</th>
                <th style={{ width: 130 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <span
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer', color: 'var(--color-primary)' }}
                      onClick={() => navigate(`/invoice/${inv.id}`)}
                    >
                      {inv.invoice_number}
                    </span>
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{getBusinessName(inv.business_id)}</td>
                  <td style={{ fontWeight: 500 }}>{inv.client_name}</td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{inv.client_email || '—'}</td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{inv.client_gst || '—'}</td>
                  <td style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
