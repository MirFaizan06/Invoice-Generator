import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Mail } from 'lucide-react';
import { Badge } from '../../components/UI/Badge';
import { Modal } from '../../components/UI/Modal';
import { Button } from '../../components/UI/Button';
import { useBusinessStore } from '../../store/business.store';
import { useAppStore } from '../../store/app.store';
import type { MailLog } from '@shared/types';
import './Mails.css';

const AVATAR_COLORS = [
  '#2563EB', '#7C3AED', '#DB2777', '#059669', '#D97706', '#DC2626', '#0891B2',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

type FilterStatus = 'all' | 'sent' | 'failed';

export const MailsPage: React.FC = () => {
  const { activeBusiness } = useBusinessStore();
  const addToast = useAppStore((s) => s.addToast);

  const [logs, setLogs] = useState<MailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MailLog | null>(null);

  const load = useCallback(async () => {
    if (!activeBusiness) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.mail.getLogs({ businessId: activeBusiness.id });
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }, [activeBusiness]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.status === filter);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await window.electronAPI.mail.deleteLog(deleteTarget.id);
      addToast({ type: 'success', title: 'Email log deleted' });
      setDeleteTarget(null);
      load();
    } catch {
      addToast({ type: 'error', title: 'Failed to delete log' });
    }
  };

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  return (
    <div className="page-content page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mail</h1>
          <p className="page-subtitle">Sent emails and history</p>
        </div>
      </div>

      <div className="mail-filters">
        <div className="mail-filter-group">
          {(['all', 'sent', 'failed'] as const).map((f) => (
            <button
              key={f}
              className={`mail-filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="mail-list-wrap">
        {loading ? (
          <div className="empty-state">
            <div className="animate-pulse" style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Loading...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Mail size={32} strokeWidth={1.5} /></div>
            <div className="empty-state-title">
              {filter === 'all' ? 'No emails sent yet' : `No ${filter} emails`}
            </div>
            <div className="empty-state-desc">
              {filter === 'all'
                ? 'Use the email button on invoices or documents to send your first email.'
                : `No emails with status "${filter}".`}
            </div>
          </div>
        ) : (
          <div className="mail-list">
            {filtered.map((log) => (
              <div key={log.id}>
                <div
                  className={`mail-item ${expanded === log.id ? 'expanded' : ''}`}
                  onClick={() => toggleExpanded(log.id)}
                >
                  <div
                    className="mail-avatar"
                    style={{ background: getAvatarColor(log.to_name || log.to_email) }}
                  >
                    {(log.to_name || log.to_email).charAt(0).toUpperCase()}
                  </div>

                  <div className="mail-body">
                    <div className="mail-to">
                      {log.to_name}
                      <span className="mail-to-email">&lt;{log.to_email}&gt;</span>
                    </div>
                    <div className="mail-subject">{log.subject}</div>
                    {expanded === log.id && (
                      <div className="mail-preview-wrap">
                        <div
                          className="mail-preview"
                          dangerouslySetInnerHTML={{ __html: log.body_html }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="mail-meta">
                    <Badge variant={log.status === 'sent' ? 'success' : 'danger'}>
                      {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                    </Badge>
                    <span className="mail-date">{formatDate(log.sent_at)}</span>
                  </div>

                  <div className="mail-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="mail-delete-btn"
                      title="Delete log"
                      onClick={() => setDeleteTarget(log)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Email Log"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Delete this email log for <strong>{deleteTarget?.to_name}</strong>? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
};

export default MailsPage;
