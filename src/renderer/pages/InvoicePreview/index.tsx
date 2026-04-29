import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, CheckCircle, XCircle, Folder, Copy } from 'lucide-react';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { useAppStore } from '../../store/app.store';
import type { Invoice } from '@shared/types';
import './InvoicePreview.css';

export const InvoicePreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToast = useAppStore((s) => s.addToast);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

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

  const markPaid = async () => {
    if (!invoice) return;
    await window.electronAPI.invoice.markPaid(invoice.id);
    setInvoice((i) => i ? { ...i, status: 'paid' } : i);
    addToast({ type: 'success', title: 'Invoice marked as paid' });
  };

  const markUnpaid = async () => {
    if (!invoice) return;
    await window.electronAPI.invoice.markUnpaid(invoice.id);
    setInvoice((i) => i ? { ...i, status: 'unpaid' } : i);
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
              <Badge variant={invoice.status === 'paid' ? 'success' : invoice.status === 'cancelled' ? 'default' : 'warning'} dot>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
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
            <Button variant="success" size="sm" icon={<CheckCircle size={14} />} onClick={markPaid}>Mark Paid</Button>
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
