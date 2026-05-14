import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Mail, Phone, Globe, FileText, Briefcase, Archive } from 'lucide-react';
import { Button } from '../../components/UI/Button';
import { Input, TextArea } from '../../components/UI/Input';
import { Badge } from '../../components/UI/Badge';
import { Modal } from '../../components/UI/Modal';
import { useBusinessStore } from '../../store/business.store';
import { useAppStore } from '../../store/app.store';
import type { SavedClient } from '@shared/types';
import './Clients.css';

interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  gst: string;
  pan: string;
  website: string;
  notes: string;
}

const emptyForm: ClientFormData = {
  name: '',
  email: '',
  phone: '',
  address: '',
  gst: '',
  pan: '',
  website: '',
  notes: '',
};

export const ClientsPage: React.FC = () => {
  const { activeBusiness } = useBusinessStore();
  const addToast = useAppStore((s) => s.addToast);

  const [clients, setClients] = useState<SavedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<SavedClient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedClient | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [clientStats, setClientStats] = useState<Record<number, { projects: number; documents: number }>>({});

  // Client bundle
  const [bundleTarget, setBundleTarget] = useState<SavedClient | null>(null);
  const [bundleFormat, setBundleFormat] = useState<'zip' | 'rar'>('zip');
  const [bundleLoading, setBundleLoading] = useState(false);

  const load = useCallback(async () => {
    if (!activeBusiness) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.clients.getForBusiness(activeBusiness.id);
      setClients(data);

      // Load stats for each client
      const stats: Record<number, { projects: number; documents: number }> = {};
      await Promise.all(
        data.map(async (c) => {
          const [projects, documents] = await Promise.all([
            window.electronAPI.project.getForClient(c.id).catch(() => []),
            window.electronAPI.document.getAll({ clientId: c.id }).catch(() => []),
          ]);
          stats[c.id] = { projects: projects.length, documents: documents.length };
        })
      );
      setClientStats(stats);
    } finally {
      setLoading(false);
    }
  }, [activeBusiness]);

  useEffect(() => {
    load();
  }, [load]);

  const openNewModal = () => {
    setEditTarget(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (client: SavedClient) => {
    setEditTarget(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      gst: client.gst,
      pan: client.pan || '',
      website: client.website || '',
      notes: client.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!activeBusiness) return;
    if (!formData.name.trim()) {
      addToast({ type: 'error', title: 'Client name is required' });
      return;
    }
    setSaving(true);
    try {
      const clientPayload = {
        business_id: activeBusiness.id,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        gst: formData.gst.trim(),
        pan: formData.pan.trim(),
        website: formData.website.trim(),
        notes: formData.notes.trim(),
      };
      if (editTarget) {
        await window.electronAPI.clients.update(editTarget.id, clientPayload);
        addToast({ type: 'success', title: 'Client updated', message: formData.name });
      } else {
        await window.electronAPI.clients.save(clientPayload);
        addToast({ type: 'success', title: 'Client added', message: formData.name });
      }
      setShowModal(false);
      load();
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to save client', message: String(err) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await window.electronAPI.clients.delete(deleteTarget.id);
      addToast({ type: 'success', title: 'Client deleted', message: deleteTarget.name });
      setDeleteTarget(null);
      load();
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to delete client', message: String(err) });
    }
  };

  const handleBundle = async () => {
    if (!bundleTarget || !activeBusiness) return;
    const folder = await window.electronAPI.shell.pickFolder('Choose export destination');
    if (!folder) return;
    setBundleLoading(true);
    try {
      const result = await window.electronAPI.bundle.createForClient(bundleTarget.id, activeBusiness.id, bundleFormat, folder);
      setBundleTarget(null);
      if (result.warning) addToast({ type: 'warning', title: `Bundle exported (${result.format.toUpperCase()})`, message: result.warning });
      else addToast({ type: 'success', title: `Bundle exported!`, message: `${result.fileCount} file${result.fileCount !== 1 ? 's' : ''} → ${result.filePath.split(/[\\/]/).pop()}` });
      window.electronAPI.shell.showInFolder(result.filePath);
    } catch (err) {
      addToast({ type: 'error', title: 'Bundle failed', message: String(err) });
    } finally {
      setBundleLoading(false);
    }
  };

  const field = (key: keyof ClientFormData) => (
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFormData((f) => ({ ...f, [key]: e.target.value }))
  );

  return (
    <div className="page-content clients-page page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={openNewModal}>
          New Client
        </Button>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="animate-pulse" style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Loading...</div>
        </div>
      ) : clients.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><FileText size={32} strokeWidth={1.5} /></div>
          <div className="empty-state-title">No clients yet</div>
          <div className="empty-state-desc">Add your first client to get started</div>
          <div style={{ marginTop: 16 }}>
            <Button variant="primary" icon={<Plus size={15} />} onClick={openNewModal}>New Client</Button>
          </div>
        </div>
      ) : (
        <div className="clients-grid">
          {clients.map((client) => {
            const stats = clientStats[client.id] || { projects: 0, documents: 0 };
            return (
              <div key={client.id} className="client-card">
                <div className="client-card-header">
                  <div className="client-avatar">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="client-card-actions">
                    <button className="action-btn" title="Export Client Bundle (ZIP/RAR)" onClick={() => { setBundleTarget(client); setBundleFormat('zip'); }}>
                      <Archive size={13} />
                    </button>
                    <button className="action-btn" title="Edit" onClick={() => openEditModal(client)}>
                      <Edit2 size={13} />
                    </button>
                    <button className="action-btn action-btn-danger" title="Delete" onClick={() => setDeleteTarget(client)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="client-card-body">
                  <div className="client-name">{client.name}</div>

                  {client.gst && (
                    <div style={{ marginBottom: 8 }}>
                      <Badge variant="default">GSTIN: {client.gst}</Badge>
                    </div>
                  )}

                  <div className="client-meta">
                    {client.email && (
                      <div className="client-meta-item">
                        <Mail size={12} />
                        <span>{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="client-meta-item">
                        <Phone size={12} />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.website && (
                      <div className="client-meta-item">
                        <Globe size={12} />
                        <span>{client.website}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="client-card-footer">
                  <div className="client-stat">
                    <Briefcase size={12} />
                    <span>{stats.projects} project{stats.projects !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="client-stat">
                    <FileText size={12} />
                    <span>{stats.documents} doc{stats.documents !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editTarget ? 'Edit Client' : 'New Client'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {editTarget ? 'Save Changes' : 'Add Client'}
            </Button>
          </>
        }
      >
        <div className="client-form">
          <Input
            label="Client Name"
            placeholder="Acme Corp"
            value={formData.name}
            onChange={field('name')}
            required
          />
          <div className="client-form-row">
            <Input
              label="Email"
              type="email"
              placeholder="contact@acme.com"
              value={formData.email}
              onChange={field('email')}
            />
            <Input
              label="Phone"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={field('phone')}
            />
          </div>
          <TextArea
            label="Address"
            placeholder="Full billing address..."
            value={formData.address}
            onChange={field('address')}
            rows={2}
          />
          <div className="client-form-row">
            <Input
              label="GSTIN"
              placeholder="22AAAAA0000A1Z5"
              value={formData.gst}
              onChange={field('gst')}
            />
            <Input
              label="PAN"
              placeholder="AAAAA0000A"
              value={formData.pan}
              onChange={field('pan')}
            />
          </div>
          <Input
            label="Website"
            placeholder="https://acme.com"
            value={formData.website}
            onChange={field('website')}
          />
          <TextArea
            label="Notes"
            placeholder="Internal notes about this client..."
            value={formData.notes}
            onChange={field('notes')}
            rows={2}
          />
        </div>
      </Modal>

      {/* Client Bundle Export Modal */}
      <Modal
        isOpen={!!bundleTarget}
        onClose={() => setBundleTarget(null)}
        title={`Export Bundle — ${bundleTarget?.name ?? ''}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setBundleTarget(null)}>Cancel</Button>
            <Button variant="primary" icon={<Archive size={14} />} onClick={handleBundle} loading={bundleLoading}>Export Bundle</Button>
          </>
        }
      >
        {bundleTarget && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
              Creates a single archive containing all invoices and legal documents (MSA, SOW, NDA, SLA) for <strong>{bundleTarget.name}</strong>, plus a <code>README.txt</code> describing each file.
            </p>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Export Format</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['zip', 'rar'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setBundleFormat(f)}
                    style={{
                      flex: 1, padding: '10px 0', border: `2px solid ${bundleFormat === f ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-md)', background: bundleFormat === f ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      color: bundleFormat === f ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontWeight: 700,
                      fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                    }}
                  >{f}</button>
                ))}
              </div>
              {bundleFormat === 'rar' && (
                <div style={{ marginTop: 8, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  RAR requires WinRAR or 7-Zip to be installed. Falls back to ZIP automatically if unavailable.
                </div>
              )}
            </div>
            <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Only PDFs that have already been generated are included. Generate PDFs from History and Documents first.
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Client"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
};

export default ClientsPage;
