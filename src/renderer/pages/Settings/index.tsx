import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Star, Building2, CreditCard, Sliders, Layout, Lock, FolderOpen, Archive, AlertTriangle, Mail, ChevronDown, ChevronUp, FileInput } from 'lucide-react';
import { PhoneInput } from '../../components/UI/PhoneInput';
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

function PreferencesTab({ activeBusiness, onBackup, backupLoading }: { activeBusiness: import('@shared/types').Business; onBackup: () => void; backupLoading: boolean }) {
  const [savePath, setSavePath] = useState('');
  const addToast = useAppStore((s) => s.addToast);

  useEffect(() => {
    window.electronAPI.settings.get('invoice_save_path').then((v) => setSavePath(v || ''));
  }, []);

  const pickFolder = async () => {
    const picked = await window.electronAPI.shell.pickFolder('Choose Invoice Save Folder');
    if (!picked) return;
    await window.electronAPI.settings.set('invoice_save_path', picked);
    setSavePath(picked);
    addToast({ type: 'success', title: 'Save location updated' });
  };

  const openFolder = () => {
    if (savePath) window.electronAPI.shell.openPath(savePath);
  };

  return (
    <div>
      <h3 className="settings-section-title" style={{ marginBottom: 16 }}>Invoice Preferences</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 480 }}>
        <Input label="Invoice Prefix" value={activeBusiness.invoice_prefix} hint="e.g. TBD/INV → TBD/INV/2026/0001" readOnly />
        <Input label="Default Tax %" value={String(activeBusiness.default_tax)} hint="Applied to new invoices" readOnly />
      </div>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 8, marginBottom: 20 }}>Edit these by clicking the edit button on your business profile.</p>

      <h3 className="settings-section-title" style={{ marginBottom: 12 }}>Invoice Save Location</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520 }}>
        <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>Current location</div>
          <div style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: 'var(--color-text)', wordBreak: 'break-all' }}>
            {savePath || 'Documents/BizDesk/Invoices (default)'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={pickFolder}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--color-primary-light)', border: '1px solid var(--color-primary-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-primary)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer' }}
          >
            <FolderOpen size={14} /> Change Folder
          </button>
          {savePath && (
            <button
              onClick={openFolder}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}
            >
              Open Folder
            </button>
          )}
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          Invoices are saved as: <span style={{ fontFamily: 'var(--font-mono)' }}>{savePath || 'Documents/BizDesk/Invoices'}/Business Name - Invoices/</span>
        </p>
      </div>

      <h3 className="settings-section-title" style={{ marginBottom: 12, marginTop: 28 }}>Backup & Export</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520 }}>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          Export all your invoices as PDF files bundled into a single ZIP archive. Choose a folder to save the backup.
        </p>
        <button
          onClick={onBackup}
          disabled={backupLoading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: backupLoading ? 'wait' : 'pointer', width: 'fit-content', opacity: backupLoading ? 0.7 : 1 }}
        >
          <Archive size={14} />
          {backupLoading ? 'Creating backup…' : 'Export All Bills as ZIP'}
        </button>
      </div>
    </div>
  );
}

export const SettingsPage: React.FC = () => {
  const { businesses, activeBusiness, refresh } = useBusinessStore();
  const addToast = useAppStore((s) => s.addToast);
  const [activeTab, setActiveTab] = useState<'business' | 'upi' | 'template' | 'preferences' | 'security' | 'email'>('business');
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
  const [factoryResetStep, setFactoryResetStep] = useState<0 | 1 | 2>(0);
  const [backupLoading, setBackupLoading] = useState(false);
  const [authSuccess, setAuthSuccess] = useState('');

  // Email settings state
  const [gmailUser, setGmailUser] = useState('');
  const [gmailPass, setGmailPass] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  // Import invoice state
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  // Remove auth modal state
  const [showRemoveAuthModal, setShowRemoveAuthModal] = useState(false);
  const [removeAuthPassword, setRemoveAuthPassword] = useState('');
  const [removeAuthError, setRemoveAuthError] = useState('');

  const [bizForm, setBizForm] = useState({ name: '', owner_name: '', email: '', phone: '', address: '', gst: '', pan: '', cin: '', invoice_prefix: 'TBD/INV', default_tax: '18' });
  const [upiForm, setUpiForm] = useState({ label: '', upi_id: '', upi_name: '', is_primary: false });

  useEffect(() => {
    if (activeBusiness) {
      window.electronAPI.upi.getForBusiness(activeBusiness.id).then(setUpiIds);
    }
    window.electronAPI.auth.isSetup().then(setAuthSetup);
    window.electronAPI.settings.get('gmail_user').then((v) => { if (v) setGmailUser(v); });
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

  const handleRemoveAuth = () => {
    setRemoveAuthPassword('');
    setRemoveAuthError('');
    setShowRemoveAuthModal(true);
  };

  const handleConfirmRemoveAuth = async () => {
    setRemoveAuthError('');
    if (!removeAuthPassword) { setRemoveAuthError('Enter your current password'); return; }
    const ok = await window.electronAPI.auth.verify(removeAuthPassword);
    if (!ok) { setRemoveAuthError('Incorrect password'); return; }
    await window.electronAPI.auth.reset();
    setAuthSetup(false);
    setShowRemoveAuthModal(false);
    setRemoveAuthPassword('');
    addToast({ type: 'success', title: 'Password protection removed' });
  };

  const handleSaveEmailSettings = async () => {
    setEmailSaving(true);
    setEmailSaved(false);
    try {
      await window.electronAPI.settings.set('gmail_user', gmailUser);
      await window.electronAPI.settings.set('gmail_pass', gmailPass);
      setEmailSaved(true);
    } catch {
      addToast({ type: 'error', title: 'Failed to save email settings' });
    } finally {
      setEmailSaving(false);
    }
  };

  const handleImportInvoice = async () => {
    setImportResult(null);
    const filePath = await window.electronAPI.shell.pickFile({
      title: 'Select Invoice HTML',
      filters: [{ name: 'HTML Files', extensions: ['html'] }],
    });
    if (!filePath) return;
    setImportLoading(true);
    try {
      const content = await window.electronAPI.shell.readFile(filePath);
      if (!content) { setImportResult({ success: false, message: 'Could not read the selected file' }); setImportLoading(false); return; }
      const result = await window.electronAPI.invoice.importFromHTML(content);
      if (result.success && result.invoice) {
        setImportResult({ success: true, message: `Invoice imported successfully! Invoice #${result.invoice.invoice_number} added to history.` });
      } else {
        setImportResult({ success: false, message: result.error || 'Import failed' });
      }
    } catch (err) {
      setImportResult({ success: false, message: String(err) });
    } finally {
      setImportLoading(false);
    }
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

  const handleFactoryReset = async () => {
    if (factoryResetStep === 1) { setFactoryResetStep(2); return; }
    try {
      await window.electronAPI.settings.factoryReset();
      window.location.reload();
    } catch {
      addToast({ type: 'error', title: 'Factory reset failed' });
      setFactoryResetStep(0);
    }
  };

  const handleBackup = async () => {
    const folder = await window.electronAPI.shell.pickFolder('Choose Backup Save Location');
    if (!folder) return;
    setBackupLoading(true);
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const destPath = `${folder}\\BizDesk-Backup-${ts}.zip`;
      const result = await window.electronAPI.invoice.exportBackup(destPath);
      addToast({ type: 'success', title: `Backup created — ${result.count} invoice${result.count !== 1 ? 's' : ''}`, message: result.zipPath });
      await window.electronAPI.shell.showInFolder(result.zipPath);
    } catch (err) {
      addToast({ type: 'error', title: 'Backup failed', message: String(err) });
    } finally {
      setBackupLoading(false);
    }
  };

  const tabs = [
    { id: 'business', label: 'Business Profiles', icon: <Building2 size={15} /> },
    { id: 'upi', label: 'UPI IDs', icon: <CreditCard size={15} /> },
    { id: 'template', label: 'Templates', icon: <Layout size={15} /> },
    { id: 'preferences', label: 'Preferences', icon: <Sliders size={15} /> },
    { id: 'security', label: 'Security', icon: <Lock size={15} /> },
    { id: 'email', label: 'Email', icon: <Mail size={15} /> },
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
            <div style={{ maxWidth: 480 }}>
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

              {/* Danger Zone */}
              <div style={{ marginTop: 36, borderTop: '1px solid var(--color-border)', paddingTop: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <AlertTriangle size={14} style={{ color: 'var(--color-danger)' }} />
                  <h3 className="settings-section-title" style={{ color: 'var(--color-danger)', margin: 0 }}>Danger Zone</h3>
                </div>
                <div style={{ border: '1px solid #FECACA', borderRadius: 8, padding: '16px 18px', background: '#FFF5F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: '#991B1B' }}>Factory Reset</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: '#B91C1C', marginTop: 3, lineHeight: 1.5 }}>
                      Permanently deletes all businesses, invoices, and financial data. Resets the app to a fresh state. Cannot be undone.
                    </div>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => setFactoryResetStep(1)}>Reset</Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && activeBusiness && (
            <PreferencesTab activeBusiness={activeBusiness} onBackup={handleBackup} backupLoading={backupLoading} />
          )}

          {activeTab === 'email' && (
            <div style={{ maxWidth: 520 }}>
              {/* Gmail SMTP */}
              <h3 className="settings-section-title" style={{ marginBottom: 6 }}>Gmail SMTP</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                BizDesk uses your Gmail account to send professional emails to clients. Your credentials are stored locally and never leave your device.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                <Input
                  label="Gmail Address"
                  placeholder="yourname@gmail.com"
                  type="email"
                  value={gmailUser}
                  onChange={(e) => { setGmailUser(e.target.value); setEmailSaved(false); }}
                />
                <Input
                  label="App Password"
                  placeholder="xxxx xxxx xxxx xxxx"
                  type="password"
                  value={gmailPass}
                  onChange={(e) => { setGmailPass(e.target.value); setEmailSaved(false); }}
                  hint="Not your regular Gmail password — use a Google App Password"
                />
              </div>

              <Button variant="primary" onClick={handleSaveEmailSettings} loading={emailSaving}>
                Save Email Settings
              </Button>

              {emailSaved && (
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, padding: '10px 14px', fontSize: 'var(--text-sm)', color: '#166534' }}>
                    Settings saved. Restart the app for changes to take effect.
                  </div>
                  <Button variant="secondary" onClick={() => window.electronAPI.system.restartApp()}>
                    Restart Now
                  </Button>
                </div>
              )}

              {/* Setup Guide */}
              <div style={{ marginTop: 24, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <button
                  onClick={() => setGuideOpen((o) => !o)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--color-surface-2)', border: 'none', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
                >
                  How to get an App Password?
                  {guideOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
                {guideOpen && (
                  <div style={{ padding: '14px 16px', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
                    <ol style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[
                        'Open Google Account settings at myaccount.google.com',
                        'Go to Security (left sidebar)',
                        'Enable 2-Step Verification if not already enabled',
                        'Go back to Security — scroll down to "App passwords" (appears only after 2FA is enabled)',
                        'Click "Create app password" → choose name "BizDesk" → click Create',
                        'Copy the 16-character password (spaces don\'t matter)',
                        'Paste it in the "App Password" field above',
                      ].map((step, i) => (
                        <li key={i} style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>

              {/* Import Invoice */}
              <div style={{ marginTop: 36, borderTop: '1px solid var(--color-border)', paddingTop: 24 }}>
                <h3 className="settings-section-title" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileInput size={15} />
                  Import Invoice
                </h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
                  Import an invoice from an HTML file generated by this app. The invoice will be added to your history.
                </p>
                <Button
                  variant="secondary"
                  onClick={handleImportInvoice}
                  loading={importLoading}
                >
                  Select Invoice HTML File
                </Button>
                {importResult && (
                  <div style={{
                    marginTop: 12,
                    background: importResult.success ? '#F0FDF4' : '#FEF2F2',
                    border: `1px solid ${importResult.success ? '#BBF7D0' : '#FECACA'}`,
                    borderRadius: 6,
                    padding: '10px 14px',
                    fontSize: 'var(--text-sm)',
                    color: importResult.success ? '#166534' : '#991B1B',
                  }}>
                    {importResult.message}
                  </div>
                )}
              </div>
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
          <PhoneInput label="Phone" value={bizForm.phone} onChange={(v) => setBizForm((f) => ({ ...f, phone: v }))} />
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

      {/* Remove Auth Modal */}
      <Modal
        isOpen={showRemoveAuthModal}
        onClose={() => setShowRemoveAuthModal(false)}
        title="Confirm Password Removal"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowRemoveAuthModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleConfirmRemoveAuth}>Remove Protection</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input
            label="Enter current password to confirm"
            type="password"
            placeholder="Current password"
            value={removeAuthPassword}
            onChange={(e) => { setRemoveAuthPassword(e.target.value); setRemoveAuthError(''); }}
          />
          {removeAuthError && (
            <div style={{ fontSize: 12, color: 'var(--color-danger)', background: '#FEF2F2', padding: '8px 12px', borderRadius: 6 }}>
              {removeAuthError}
            </div>
          )}
        </div>
      </Modal>

      {/* Factory Reset Modal */}
      <Modal
        isOpen={factoryResetStep > 0}
        onClose={() => setFactoryResetStep(0)}
        title={factoryResetStep === 1 ? 'Factory Reset' : 'Final Confirmation — Are You Sure?'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFactoryResetStep(0)}>Cancel</Button>
            <Button variant="danger" onClick={handleFactoryReset}>
              {factoryResetStep === 1 ? 'Continue' : 'Yes, Delete Everything'}
            </Button>
          </>
        }
      >
        {factoryResetStep === 1 ? (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
            This will permanently delete <strong>all businesses, invoices, transactions, and settings</strong>.
            The app will restart and show the initial setup screen. This cannot be undone.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '12px 14px', fontSize: 'var(--text-sm)', color: '#991B1B', fontWeight: 600 }}>
              This is your absolute final warning.
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
              All data will be wiped permanently. Invoice numbering will reset to /0001.
              Make sure you have a backup if you need any of this data.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};
