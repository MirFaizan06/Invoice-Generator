import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Star, Building2, CreditCard, Sliders, Layout, Lock } from 'lucide-react';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Modal } from '../../components/UI/Modal';
import { Badge } from '../../components/UI/Badge';
import { useBusinessStore } from '../../store/business.store';
import { useAppStore } from '../../store/app.store';
import type { Business, UpiId } from '@shared/types';
import './Settings.css';

const TEMPLATES = [
  { id: 'modern-blue', name: 'Modern Blue', description: 'Clean blue accents, professional', colors: ['#2563EB', '#1E293B', '#F8FAFF'] },
  { id: 'minimal-white', name: 'Minimal White', description: 'Pure minimal, no colors', colors: ['#ffffff', '#9CA3AF', '#F9FAFB'] },
  { id: 'dark-corporate', name: 'Dark Corporate', description: 'Dark navy, bold presence', colors: ['#0F172A', '#3B82F6', '#ffffff'] },
  { id: 'forest-green', name: 'Forest Green', description: 'Fresh green, natural feel', colors: ['#166534', '#16A34A', '#F0FDF4'] },
  { id: 'classic-serif', name: 'Classic Serif', description: 'Traditional, serif fonts', colors: ['#111827', '#374151', '#ffffff'] },
  { id: 'executive-gold', name: 'Executive Gold', description: 'Navy & gold, premium look', colors: ['#1E3A5F', '#D4A017', '#ffffff'] },
  { id: 'tech-purple', name: 'Tech Purple', description: 'Purple gradient, modern tech', colors: ['#4F46E5', '#7C3AED', '#ffffff'] },
  { id: 'warm-amber', name: 'Warm Amber', description: 'Warm amber, creative freelancer', colors: ['#D97706', '#F59E0B', '#FFFBEB'] },
  { id: 'pastel-creative', name: 'Pastel Creative', description: 'Soft pastels, creative studio', colors: ['#7C3AED', '#EC4899', '#FAF5FF'] },
  { id: 'monochrome', name: 'Monochrome', description: 'Black & white, minimal print', colors: ['#000000', '#374151', '#ffffff'] },
];

export const SettingsPage: React.FC = () => {
  const { businesses, activeBusiness, refresh } = useBusinessStore();
  const addToast = useAppStore((s) => s.addToast);
  const [activeTab, setActiveTab] = useState<'business' | 'upi' | 'template' | 'preferences' | 'security'>('business');
  const [upiIds, setUpiIds] = useState<UpiId[]>([]);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'business' | 'upi'; id: number; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [authSetup, setAuthSetup] = useState(false);
  const [authForm, setAuthForm] = useState({ oldPass: '', newPass: '', confirmPass: '' });
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  const [bizForm, setBizForm] = useState({ name: '', owner_name: '', email: '', phone: '', address: '', gst: '', pan: '', cin: '', invoice_prefix: 'TBD/INV', default_tax: '18' });
  const [upiForm, setUpiForm] = useState({ label: '', upi_id: '', upi_name: '', is_primary: false });

  useEffect(() => {
    if (activeBusiness) {
      window.electronAPI.upi.getForBusiness(activeBusiness.id).then(setUpiIds);
    }
    window.electronAPI.auth.isSetup().then(setAuthSetup);
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
    } catch {
      addToast({ type: 'error', title: 'Failed to save business' });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadLogo = async (businessId: number) => {
    const filePath = await window.electronAPI.shell.pickFile({
      title: 'Select Business Logo',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] }],
    });
    if (!filePath) return;
    try {
      await window.electronAPI.business.saveLogo(businessId, filePath);
      await refresh();
      addToast({ type: 'success', title: 'Logo updated' });
    } catch {
      addToast({ type: 'error', title: 'Failed to upload logo' });
    }
  };

  const saveUpi = async () => {
    if (!activeBusiness) return;
    if (!upiForm.upi_id || !upiForm.label) { addToast({ type: 'error', title: 'Label and UPI ID are required' }); return; }
    setSaving(true);
    try {
      await window.electronAPI.upi.add({ business_id: activeBusiness.id, label: upiForm.label, upi_id: upiForm.upi_id, upi_name: upiForm.upi_name, is_primary: upiForm.is_primary });
      const updated = await window.electronAPI.upi.getForBusiness(activeBusiness.id);
      setUpiIds(updated);
      setShowUpiModal(false);
      setUpiForm({ label: '', upi_id: '', upi_name: '', is_primary: false });
      addToast({ type: 'success', title: 'UPI ID added' });
    } catch {
      addToast({ type: 'error', title: 'Failed to add UPI ID' });
    } finally {
      setSaving(false);
    }
  };

  const handleParseUpi = async () => {
    if (!upiForm.upi_id.trim()) return;
    try {
      const result = await window.electronAPI.upi.parseUpiId(upiForm.upi_id);
      if (result.suggested_name && !upiForm.upi_name) {
        setUpiForm((f) => ({ ...f, upi_name: result.suggested_name }));
      }
    } catch {}
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
    const updated = await window.electronAPI.upi.getForBusiness(id);
    setUpiIds(updated);
    addToast({ type: 'success', title: 'Active business switched' });
  };

  const setPrimaryUpi = async (id: number) => {
    if (!activeBusiness) return;
    await window.electronAPI.upi.update(id, { is_primary: true });
    const updated = await window.electronAPI.upi.getForBusiness(activeBusiness.id);
    setUpiIds(updated);
  };

  const selectTemplate = async (templateId: string) => {
    if (!activeBusiness) return;
    setTemplateSaving(true);
    try {
      await window.electronAPI.business.update(activeBusiness.id, { template_id: templateId });
      await refresh();
      addToast({ type: 'success', title: 'Template updated', message: TEMPLATES.find(t => t.id === templateId)?.name });
    } catch {
      addToast({ type: 'error', title: 'Failed to update template' });
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setAuthError(''); setAuthSuccess('');
    if (!authForm.oldPass) { setAuthError('Enter your current password'); return; }
    if (!authForm.newPass || authForm.newPass.length < 4) { setAuthError('New password must be at least 4 characters'); return; }
    if (authForm.newPass !== authForm.confirmPass) { setAuthError('Passwords do not match'); return; }
    const ok = await window.electronAPI.auth.changePassword(authForm.oldPass, authForm.newPass);
    if (ok) { setAuthSuccess('Password changed successfully'); setAuthForm({ oldPass: '', newPass: '', confirmPass: '' }); }
    else { setAuthError('Current password is incorrect'); }
  };

  const handleRemoveAuth = async () => {
    await window.electronAPI.auth.reset();
    setAuthSetup(false);
    addToast({ type: 'success', title: 'Password protection removed' });
  };

  const handleSetupAuth = async () => {
    setAuthError(''); setAuthSuccess('');
    if (!authForm.newPass || authForm.newPass.length < 4) { setAuthError('Password must be at least 4 characters'); return; }
    if (authForm.newPass !== authForm.confirmPass) { setAuthError('Passwords do not match'); return; }
    await window.electronAPI.auth.setup(authForm.newPass, '');
    setAuthSetup(true);
    setAuthSuccess('Password protection enabled');
    setAuthForm({ oldPass: '', newPass: '', confirmPass: '' });
  };

  const tabs = [
    { id: 'business', label: 'Business Profiles', icon: <Building2 size={15} /> },
    { id: 'upi', label: 'UPI IDs', icon: <CreditCard size={15} /> },
    { id: 'template', label: 'Templates', icon: <Layout size={15} /> },
    { id: 'preferences', label: 'Preferences', icon: <Sliders size={15} /> },
    { id: 'security', label: 'Security', icon: <Lock size={15} /> },
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
                    <div className="settings-item-icon">
                      {b.logo_path ? (
                        <img src={`file://${b.logo_path}`} alt="logo" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 4 }} />
                      ) : (
                        <Building2 size={16} />
                      )}
                    </div>
                    <div className="settings-item-info">
                      <div className="settings-item-name">
                        {b.name}
                        {b.is_active && <Badge variant="primary">Active</Badge>}
                      </div>
                      <div className="settings-item-sub">{b.owner_name} · {b.email}</div>
                      {b.gst && <div className="settings-item-sub">GST: {b.gst}</div>}
                    </div>
                    <div className="settings-item-actions">
                      <button className="settings-action-btn" title="Upload Logo" onClick={() => handleUploadLogo(b.id)} style={{ fontSize: 10, gap: 3, display: 'flex', alignItems: 'center' }}>
                        Logo
                      </button>
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
                      {u.upi_name && <div className="settings-item-sub">Display name: {u.upi_name}</div>}
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

          {activeTab === 'template' && (
            <div>
              <div className="settings-section-header">
                <div>
                  <h3 className="settings-section-title">Invoice Templates</h3>
                  <p className="settings-section-sub">Active business: <strong>{activeBusiness?.name}</strong></p>
                </div>
              </div>
              {activeBusiness && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: '8px' }}>
                  {TEMPLATES.map((t) => {
                    const selected = (activeBusiness.template_id || 'modern-blue') === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => !templateSaving && selectTemplate(t.id)}
                        style={{
                          border: selected ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                          borderRadius: '12px',
                          padding: '14px',
                          cursor: templateSaving ? 'wait' : 'pointer',
                          background: selected ? '#EFF6FF' : '#fff',
                          position: 'relative',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {selected && (
                          <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--color-primary)', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={12} color="#fff" />
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                          {t.colors.map((c, i) => (
                            <div key={i} style={{ width: i === 0 ? '32px' : '16px', height: '32px', borderRadius: '6px', background: c, border: '1px solid rgba(0,0,0,0.08)', flexShrink: 0 }} />
                          ))}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>{t.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{t.description}</div>
                        {selected && <div style={{ marginTop: '8px', fontSize: '10px', fontWeight: 600, color: 'var(--color-primary)' }}>Currently Active</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <div style={{ maxWidth: 420 }}>
              <h3 className="settings-section-title" style={{ marginBottom: 16 }}>Password Protection</h3>
              <div style={{ background: authSetup ? '#F0FDF4' : '#FFFBEB', border: `1px solid ${authSetup ? '#BBF7D0' : '#FDE68A'}`, borderRadius: 8, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: authSetup ? '#166534' : '#92400E' }}>
                {authSetup ? 'Password protection is active. App requires password on startup.' : 'No password set. Anyone can open this app.'}
              </div>

              {authSetup ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Input label="Current Password" type="password" placeholder="Enter current password" value={authForm.oldPass} onChange={(e) => setAuthForm((f) => ({ ...f, oldPass: e.target.value }))} />
                  <Input label="New Password" type="password" placeholder="At least 4 characters" value={authForm.newPass} onChange={(e) => setAuthForm((f) => ({ ...f, newPass: e.target.value }))} />
                  <Input label="Confirm New Password" type="password" placeholder="Repeat new password" value={authForm.confirmPass} onChange={(e) => setAuthForm((f) => ({ ...f, confirmPass: e.target.value }))} />
                  {authError && <div style={{ fontSize: 12, color: 'var(--color-danger)', background: '#FEF2F2', padding: '8px 12px', borderRadius: 6 }}>{authError}</div>}
                  {authSuccess && <div style={{ fontSize: 12, color: 'var(--color-success)', background: '#F0FDF4', padding: '8px 12px', borderRadius: 6 }}>{authSuccess}</div>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="primary" onClick={handleChangePassword}>Change Password</Button>
                    <Button variant="danger" onClick={handleRemoveAuth}>Remove Protection</Button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Input label="New Password" type="password" placeholder="At least 4 characters" value={authForm.newPass} onChange={(e) => setAuthForm((f) => ({ ...f, newPass: e.target.value }))} />
                  <Input label="Confirm Password" type="password" placeholder="Repeat password" value={authForm.confirmPass} onChange={(e) => setAuthForm((f) => ({ ...f, confirmPass: e.target.value }))} />
                  {authError && <div style={{ fontSize: 12, color: 'var(--color-danger)', background: '#FEF2F2', padding: '8px 12px', borderRadius: 6 }}>{authError}</div>}
                  {authSuccess && <div style={{ fontSize: 12, color: 'var(--color-success)', background: '#F0FDF4', padding: '8px 12px', borderRadius: 6 }}>{authSuccess}</div>}
                  <Button variant="primary" onClick={handleSetupAuth}>Enable Password Protection</Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'preferences' && activeBusiness && (
            <div>
              <h3 className="settings-section-title" style={{ marginBottom: 16 }}>Invoice Preferences</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 480 }}>
                <Input label="Invoice Prefix" value={activeBusiness.invoice_prefix} hint="e.g. TBD/INV → TBD/INV/2026/0001" readOnly />
                <Input label="Default Tax %" value={String(activeBusiness.default_tax)} hint="Applied to new invoices" readOnly />
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
          <Input label="Business Name" placeholder="Tech Bytes Design" value={bizForm.name} onChange={(e) => setBizForm((f) => ({ ...f, name: e.target.value }))} required />
          <Input label="Owner Name" placeholder="Mir Faizan" value={bizForm.owner_name} onChange={(e) => setBizForm((f) => ({ ...f, owner_name: e.target.value }))} required />
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
          <Input
            label="UPI ID"
            placeholder="yourname@okaxis"
            value={upiForm.upi_id}
            onChange={(e) => setUpiForm((f) => ({ ...f, upi_id: e.target.value }))}
            onBlur={handleParseUpi}
            hint="Tab out after entering to auto-suggest display name"
          />
          <Input
            label="UPI Display Name"
            placeholder="John Doe"
            value={upiForm.upi_name}
            onChange={(e) => setUpiForm((f) => ({ ...f, upi_name: e.target.value }))}
            hint="Name shown on receiver's UPI app"
          />
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
