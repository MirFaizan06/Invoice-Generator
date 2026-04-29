import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Star, Building2, CreditCard, Sliders } from 'lucide-react';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Modal } from '../../components/UI/Modal';
import { Badge } from '../../components/UI/Badge';
import { useBusinessStore } from '../../store/business.store';
import { useAppStore } from '../../store/app.store';
import type { Business, UpiId } from '@shared/types';
import './Settings.css';

export const SettingsPage: React.FC = () => {
  const { businesses, activeBusiness, refresh } = useBusinessStore();
  const addToast = useAppStore((s) => s.addToast);
  const [activeTab, setActiveTab] = useState<'business' | 'upi' | 'preferences'>('business');
  const [upiIds, setUpiIds] = useState<UpiId[]>([]);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'business' | 'upi'; id: number; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [bizForm, setBizForm] = useState({ name: '', owner_name: '', email: '', phone: '', address: '', gst: '', pan: '', cin: '', invoice_prefix: 'TBD/INV', default_tax: '18' });
  const [upiForm, setUpiForm] = useState({ label: '', upi_id: '', is_primary: false });

  useEffect(() => {
    if (activeBusiness) {
      window.electronAPI.upi.getForBusiness(activeBusiness.id).then(setUpiIds);
    }
  }, [activeBusiness]);

  const openBizModal = (b?: Business) => {
    if (b) {
      setEditingBusiness(b);
      setBizForm({ name: b.name, owner_name: b.owner_name, email: b.email, phone: b.phone, address: b.address, gst: b.gst, pan: b.pan, cin: b.cin, invoice_prefix: b.invoice_prefix, default_tax: String(b.default_tax) });
    } else {
      setEditingBusiness(null);
      setBizForm({ name: '', owner_name: '', email: '', phone: '', address: '', gst: '', pan: '', cin: '', invoice_prefix: 'TBD/INV', default_tax: '18' });
    }
    setShowBusinessModal(true);
  };

  const saveBusiness = async () => {
    if (!bizForm.name || !bizForm.owner_name) { addToast({ type: 'error', title: 'Name and owner name are required' }); return; }
    setSaving(true);
    try {
      const d = { ...bizForm, default_tax: parseFloat(bizForm.default_tax) || 18 };
      if (editingBusiness) {
        await window.electronAPI.business.update(editingBusiness.id, d);
        addToast({ type: 'success', title: 'Business updated' });
      } else {
        await window.electronAPI.business.create(d);
        addToast({ type: 'success', title: 'Business created' });
      }
      await refresh();
      setShowBusinessModal(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to save business' });
    } finally {
      setSaving(false);
    }
  };

  const saveUpi = async () => {
    if (!activeBusiness) return;
    if (!upiForm.upi_id || !upiForm.label) { addToast({ type: 'error', title: 'All fields are required' }); return; }
    setSaving(true);
    try {
      await window.electronAPI.upi.add({ business_id: activeBusiness.id, label: upiForm.label, upi_id: upiForm.upi_id, is_primary: upiForm.is_primary });
      const updated = await window.electronAPI.upi.getForBusiness(activeBusiness.id);
      setUpiIds(updated);
      setShowUpiModal(false);
      setUpiForm({ label: '', upi_id: '', is_primary: false });
      addToast({ type: 'success', title: 'UPI ID added' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to add UPI ID' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'business') {
      await window.electronAPI.business.delete(deleteTarget.id);
      await refresh();
      addToast({ type: 'success', title: 'Business deleted' });
    } else {
      await window.electronAPI.upi.delete(deleteTarget.id);
      if (activeBusiness) {
        const updated = await window.electronAPI.upi.getForBusiness(activeBusiness.id);
        setUpiIds(updated);
      }
      addToast({ type: 'success', title: 'UPI ID deleted' });
    }
    setDeleteTarget(null);
  };

  const setActive = async (id: number) => {
    await window.electronAPI.business.setActive(id);
    await refresh();
    if (activeBusiness) {
      const updated = await window.electronAPI.upi.getForBusiness(id);
      setUpiIds(updated);
    }
    addToast({ type: 'success', title: 'Active business switched' });
  };

  const setPrimaryUpi = async (id: number) => {
    if (!activeBusiness) return;
    await window.electronAPI.upi.update(id, { is_primary: true });
    const updated = await window.electronAPI.upi.getForBusiness(activeBusiness.id);
    setUpiIds(updated);
  };

  const tabs = [
    { id: 'business', label: 'Business Profiles', icon: <Building2 size={15} /> },
    { id: 'upi', label: 'UPI IDs', icon: <CreditCard size={15} /> },
    { id: 'preferences', label: 'Preferences', icon: <Sliders size={15} /> },
  ] as const;

  return (
    <div className="page-content settings-page page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your business profiles and preferences</p>
        </div>
      </div>

      <div className="settings-layout">
        <div className="settings-tabs">
          {tabs.map((t) => (
            <button key={t.id} className={`settings-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="settings-content">
          {activeTab === 'business' && (
            <div>
              <div className="settings-section-header">
                <h3 className="settings-section-title">Business Profiles</h3>
                <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => openBizModal()}>Add Business</Button>
              </div>

              <div className="settings-list">
                {businesses.map((b) => (
                  <div key={b.id} className={`settings-list-item ${b.is_active ? 'active' : ''}`}>
                    <div className="settings-item-icon"><Building2 size={16} /></div>
                    <div className="settings-item-info">
                      <div className="settings-item-name">
                        {b.name}
                        {b.is_active && <Badge variant="primary">Active</Badge>}
                      </div>
                      <div className="settings-item-sub">{b.owner_name} · {b.email}</div>
                      {b.gst && <div className="settings-item-sub">GST: {b.gst}</div>}
                    </div>
                    <div className="settings-item-actions">
                      {!b.is_active && (
                        <button className="settings-action-btn" title="Set Active" onClick={() => setActive(b.id)}>
                          <Check size={13} />
                        </button>
                      )}
                      <button className="settings-action-btn" title="Edit" onClick={() => openBizModal(b)}>
                        <Edit2 size={13} />
                      </button>
                      {!b.is_active && (
                        <button className="settings-action-btn danger" title="Delete" onClick={() => setDeleteTarget({ type: 'business', id: b.id, name: b.name })}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'upi' && (
            <div>
              <div className="settings-section-header">
                <div>
                  <h3 className="settings-section-title">UPI IDs</h3>
                  <p className="settings-section-sub">For: <strong>{activeBusiness?.name}</strong></p>
                </div>
                <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowUpiModal(true)}>Add UPI ID</Button>
              </div>

              <div className="settings-list">
                {upiIds.length === 0 ? (
                  <div className="empty-state" style={{ padding: 32 }}>
                    <CreditCard className="empty-state-icon" />
                    <div className="empty-state-title">No UPI IDs</div>
                    <div className="empty-state-desc">Add a UPI ID to generate QR codes on invoices</div>
                  </div>
                ) : upiIds.map((u) => (
                  <div key={u.id} className={`settings-list-item ${u.is_primary ? 'active' : ''}`}>
                    <div className="settings-item-icon"><CreditCard size={16} /></div>
                    <div className="settings-item-info">
                      <div className="settings-item-name">
                        {u.label}
                        {u.is_primary && <Badge variant="primary" dot>Primary</Badge>}
                      </div>
                      <div className="settings-item-sub" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{u.upi_id}</div>
                    </div>
                    <div className="settings-item-actions">
                      {!u.is_primary && (
                        <button className="settings-action-btn" title="Set Primary" onClick={() => setPrimaryUpi(u.id)}>
                          <Star size={13} />
                        </button>
                      )}
                      <button className="settings-action-btn danger" title="Delete" onClick={() => setDeleteTarget({ type: 'upi', id: u.id, name: u.label })}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'preferences' && activeBusiness && (
            <div>
              <h3 className="settings-section-title" style={{ marginBottom: 16 }}>Invoice Preferences</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 480 }}>
                <Input
                  label="Invoice Prefix"
                  value={activeBusiness.invoice_prefix}
                  hint="e.g. TBD/INV → TBD/INV/2026/0001"
                  readOnly
                />
                <Input
                  label="Default Tax %"
                  value={String(activeBusiness.default_tax)}
                  hint="Applied to new invoices"
                  readOnly
                />
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 12 }}>Edit these by clicking the edit button on your business profile.</p>
            </div>
          )}
        </div>
      </div>

      {/* Business Modal */}
      <Modal isOpen={showBusinessModal} onClose={() => setShowBusinessModal(false)} title={editingBusiness ? 'Edit Business' : 'Add Business'} size="lg"
        footer={<><Button variant="secondary" onClick={() => setShowBusinessModal(false)}>Cancel</Button><Button variant="primary" onClick={saveBusiness} loading={saving}>Save</Button></>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Business Name" placeholder="Tech Bytes Design" value={bizForm.name} onChange={(e) => setBizForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Owner Name" placeholder="Mir Faizan" value={bizForm.owner_name} onChange={(e) => setBizForm((f) => ({ ...f, owner_name: e.target.value }))} />
          <Input label="Email" type="email" value={bizForm.email} onChange={(e) => setBizForm((f) => ({ ...f, email: e.target.value }))} />
          <Input label="Phone" value={bizForm.phone} onChange={(e) => setBizForm((f) => ({ ...f, phone: e.target.value }))} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input label="Address" value={bizForm.address} onChange={(e) => setBizForm((f) => ({ ...f, address: e.target.value }))} />
          </div>
          <Input label="GSTIN" value={bizForm.gst} onChange={(e) => setBizForm((f) => ({ ...f, gst: e.target.value }))} />
          <Input label="PAN" value={bizForm.pan} onChange={(e) => setBizForm((f) => ({ ...f, pan: e.target.value }))} />
          <Input label="CIN" value={bizForm.cin} onChange={(e) => setBizForm((f) => ({ ...f, cin: e.target.value }))} />
          <Input label="Invoice Prefix" value={bizForm.invoice_prefix} onChange={(e) => setBizForm((f) => ({ ...f, invoice_prefix: e.target.value }))} />
          <Input label="Default Tax %" type="number" value={bizForm.default_tax} onChange={(e) => setBizForm((f) => ({ ...f, default_tax: e.target.value }))} />
        </div>
      </Modal>

      {/* UPI Modal */}
      <Modal isOpen={showUpiModal} onClose={() => setShowUpiModal(false)} title="Add UPI ID" size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowUpiModal(false)}>Cancel</Button><Button variant="primary" onClick={saveUpi} loading={saving}>Add</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Label" placeholder="Primary UPI" value={upiForm.label} onChange={(e) => setUpiForm((f) => ({ ...f, label: e.target.value }))} />
          <Input label="UPI ID" placeholder="yourname@okaxis" value={upiForm.upi_id} onChange={(e) => setUpiForm((f) => ({ ...f, upi_id: e.target.value }))} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
            <input type="checkbox" checked={upiForm.is_primary} onChange={(e) => setUpiForm((f) => ({ ...f, is_primary: e.target.checked }))} />
            Set as primary UPI ID
          </label>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Delete" size="sm"
        footer={<><Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="danger" onClick={handleDelete}>Delete</Button></>}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
};
