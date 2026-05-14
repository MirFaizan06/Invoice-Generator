import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Download, CheckCircle, Trash2, Filter, FileText, Send } from 'lucide-react';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { Modal } from '../../components/UI/Modal';
import { Input } from '../../components/UI/Input';
import { useBusinessStore } from '../../store/business.store';
import { useAppStore } from '../../store/app.store';
import type { LegalDocument, SavedClient, DocType, DocStatus } from '@shared/types';
import './Documents.css';

const DOC_TYPE_LABELS: Record<DocType, string> = {
  msa: 'MSA',
  sow: 'SOW',
  nda: 'NDA',
  sla: 'SLA',
};

const DOC_TYPE_DESCRIPTIONS: Record<DocType, string> = {
  msa: 'Master Services Agreement',
  sow: 'Statement of Work',
  nda: 'Non-Disclosure Agreement',
  sla: 'Service Level Agreement',
};

const docTypeVariant = (type: DocType): string => {
  const map: Record<DocType, string> = {
    msa: 'doc-badge-purple',
    sow: 'doc-badge-blue',
    nda: 'doc-badge-orange',
    sla: 'doc-badge-green',
  };
  return map[type];
};

const statusVariantMap: Record<DocStatus, 'warning' | 'success' | 'danger' | 'default'> = {
  draft: 'warning',
  signed: 'success',
  expired: 'danger',
  superseded: 'default',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

export const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeBusiness } = useBusinessStore();
  const addToast = useAppStore((s) => s.addToast);

  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [clients, setClients] = useState<SavedClient[]>([]);
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState<'all' | DocType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | DocStatus>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  const [previewDoc, setPreviewDoc] = useState<LegalDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LegalDocument | null>(null);
  const [pdfLoading, setPdfLoading] = useState<number | null>(null);
  const [signLoading, setSignLoading] = useState<number | null>(null);
  const [emailTarget, setEmailTarget] = useState<LegalDocument | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailToName, setEmailToName] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  const load = useCallback(async () => {
    if (!activeBusiness) return;
    setLoading(true);
    try {
      const [docs, clientData] = await Promise.all([
        window.electronAPI.document.getAll({ businessId: activeBusiness.id }),
        window.electronAPI.clients.getForBusiness(activeBusiness.id),
      ]);
      setDocuments(docs);
      setClients(clientData);

      // Load all projects for the business for name lookup
      const allProjects = await window.electronAPI.project.getForBusiness(activeBusiness.id).catch(() => []);
      setProjects(allProjects.map((p) => ({ id: p.id, name: p.name })));
    } finally {
      setLoading(false);
    }
  }, [activeBusiness]);

  useEffect(() => {
    load();
  }, [load]);

  const getClientName = (id: number) => clients.find((c) => c.id === id)?.name || '—';
  const getProjectName = (id: number | null) => {
    if (!id) return '—';
    return projects.find((p) => p.id === id)?.name || '—';
  };

  const filtered = documents.filter((d) => {
    if (typeFilter !== 'all' && d.doc_type !== typeFilter) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (clientFilter !== 'all' && String(d.client_id) !== clientFilter) return false;
    return true;
  });

  const handleExportPDF = async (doc: LegalDocument) => {
    setPdfLoading(doc.id);
    try {
      const pdfPath = await window.electronAPI.document.generatePDF(doc.id);
      await window.electronAPI.shell.openPath(pdfPath);
      addToast({ type: 'success', title: 'PDF exported', message: doc.title });
    } catch (err) {
      addToast({ type: 'error', title: 'PDF export failed', message: String(err) });
    } finally {
      setPdfLoading(null);
    }
  };

  const handleMarkSigned = async (doc: LegalDocument) => {
    setSignLoading(doc.id);
    try {
      await window.electronAPI.document.markSigned(doc.id);
      addToast({ type: 'success', title: 'Document marked as signed', message: doc.title });
      load();
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to mark as signed', message: String(err) });
    } finally {
      setSignLoading(null);
    }
  };

  const openEmailModal = (doc: LegalDocument) => {
    const client = clients.find((c) => c.id === doc.client_id);
    setEmailTarget(doc);
    setEmailTo(client?.email || '');
    setEmailToName(client?.name || '');
  };

  const handleSendEmail = async () => {
    if (!emailTarget || !activeBusiness) return;
    if (!emailTo.trim()) { addToast({ type: 'error', title: 'Enter recipient email' }); return; }
    setEmailSending(true);
    const subject = `${DOC_TYPE_LABELS[emailTarget.doc_type]} — ${emailTarget.title}`;
    const bodyHtml = `<p>Dear ${emailToName || 'Client'},</p>
<p>Please find attached the <strong>${DOC_TYPE_DESCRIPTIONS[emailTarget.doc_type]}</strong> — <em>${emailTarget.title}</em>.</p>
<p>Document type: ${DOC_TYPE_LABELS[emailTarget.doc_type]}<br/>Version: v${emailTarget.version}<br/>Status: ${emailTarget.status.charAt(0).toUpperCase() + emailTarget.status.slice(1)}</p>
<p>Please review the document and let us know if you have any questions.</p>
<p>Regards,<br/>${activeBusiness.owner_name}<br/>${activeBusiness.name}</p>`;
    try {
      const result = await window.electronAPI.mail.send({
        to: emailTo.trim(),
        toName: emailToName.trim(),
        subject,
        bodyHtml,
        businessId: activeBusiness.id,
        relatedType: emailTarget.doc_type,
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await window.electronAPI.document.delete(deleteTarget.id);
      addToast({ type: 'success', title: 'Document deleted', message: deleteTarget.title });
      setDeleteTarget(null);
      load();
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to delete', message: String(err) });
    }
  };

  return (
    <div className="page-content documents-page page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Legal Documents</h1>
          <p className="page-subtitle">{filtered.length} of {documents.length} document{documents.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => navigate('/document-generator')}>
          Generate Document
        </Button>
      </div>

      {/* Filters */}
      <div className="documents-filters">
        <div className="documents-filter-group">
          <Filter size={14} style={{ color: 'var(--color-text-muted)' }} />
          {(['all', 'msa', 'sow', 'nda', 'sla'] as const).map((t) => (
            <button
              key={t}
              className={`documents-filter-btn ${typeFilter === t ? 'active' : ''}`}
              onClick={() => setTypeFilter(t)}
            >
              {t === 'all' ? 'All Types' : t.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="documents-filter-group">
          {(['all', 'draft', 'signed', 'expired', 'superseded'] as const).map((s) => (
            <button
              key={s}
              className={`documents-filter-btn ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <select
            className="documents-select"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
          >
            <option value="all">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="documents-table-wrap">
        {loading ? (
          <div className="empty-state">
            <div className="animate-pulse" style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Loading...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FileText size={32} strokeWidth={1.5} /></div>
            <div className="empty-state-title">{documents.length === 0 ? 'No documents yet' : 'No documents match filter'}</div>
            <div className="empty-state-desc">{documents.length === 0 ? 'Generate your first legal document' : 'Try different filters'}</div>
            {documents.length === 0 && (
              <div style={{ marginTop: 16 }}>
                <Button variant="primary" icon={<Plus size={15} />} onClick={() => navigate('/document-generator')}>
                  Generate Document
                </Button>
              </div>
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Title</th>
                <th>Client</th>
                <th>Project</th>
                <th>Version</th>
                <th>Status</th>
                <th>Generated</th>
                <th style={{ width: 130 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <span className={`doc-type-badge ${docTypeVariant(doc.doc_type)}`} title={DOC_TYPE_DESCRIPTIONS[doc.doc_type]}>
                      {DOC_TYPE_LABELS[doc.doc_type]}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500, maxWidth: 220 }} className="truncate">{doc.title}</td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                    {getClientName(doc.client_id)}
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                    {getProjectName(doc.project_id)}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>
                    v{doc.version}
                  </td>
                  <td>
                    <Badge variant={statusVariantMap[doc.status]} dot>
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </Badge>
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontSize: 'var(--text-sm)' }}>
                    {formatDate(doc.generated_at)}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-btn" title="Preview" onClick={() => setPreviewDoc(doc)}>
                        <Eye size={13} />
                      </button>
                      <button
                        className="action-btn"
                        title="Export PDF"
                        onClick={() => handleExportPDF(doc)}
                        disabled={pdfLoading === doc.id}
                      >
                        <Download size={13} />
                      </button>
                      <button
                        className="action-btn"
                        title="Send Email"
                        onClick={() => openEmailModal(doc)}
                      >
                        <Send size={13} />
                      </button>
                      {doc.status === 'draft' && (
                        <button
                          className="action-btn"
                          title="Mark Signed"
                          onClick={() => handleMarkSigned(doc)}
                          disabled={signLoading === doc.id}
                        >
                          <CheckCircle size={13} />
                        </button>
                      )}
                      <button
                        className="action-btn action-btn-danger"
                        title="Delete"
                        onClick={() => setDeleteTarget(doc)}
                      >
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

      {/* Preview Modal */}
      <Modal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc ? `${DOC_TYPE_LABELS[previewDoc.doc_type]} — ${previewDoc.title}` : ''}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPreviewDoc(null)}>Close</Button>
            {previewDoc && (
              <Button
                variant="primary"
                icon={<Download size={14} />}
                onClick={() => { handleExportPDF(previewDoc); setPreviewDoc(null); }}
                loading={pdfLoading === previewDoc?.id}
              >
                Export PDF
              </Button>
            )}
          </>
        }
      >
        {previewDoc && (
          <div
            className="doc-preview-container"
            dangerouslySetInnerHTML={{ __html: previewDoc.content_html }}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Document"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone.
        </p>
      </Modal>

      {/* Email Modal */}
      <Modal
        isOpen={!!emailTarget}
        onClose={() => setEmailTarget(null)}
        title="Send Document via Email"
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
              {DOC_TYPE_LABELS[emailTarget.doc_type]} — {emailTarget.title}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DocumentsPage;
