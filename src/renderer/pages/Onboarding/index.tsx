import React, { useState } from 'react';
import { FileText, Building2, CreditCard, CheckCircle, ChevronRight, ChevronLeft, Layout, FolderOpen } from 'lucide-react';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { PhoneInput } from '../../components/UI/PhoneInput';
import { useAppStore } from '../../store/app.store';
import './Onboarding.css';

interface OnboardingProps {
  onComplete: () => void;
}

interface FormData {
  owner_name: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  gst: string;
  pan: string;
  cin: string;
  invoice_prefix: string;
  default_tax: string;
  upi_label: string;
  upi_id: string;
  upi_name: string;
  template_id: string;
}

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

const steps = [
  { id: 0, title: 'Welcome', icon: <FileText size={24} /> },
  { id: 1, title: 'Your Profile', icon: <FileText size={24} /> },
  { id: 2, title: 'Business Details', icon: <Building2 size={24} /> },
  { id: 3, title: 'Payment Setup', icon: <CreditCard size={24} /> },
  { id: 4, title: 'Template', icon: <Layout size={24} /> },
  { id: 5, title: 'Save Location', icon: <FolderOpen size={24} /> },
  { id: 6, title: 'Complete', icon: <CheckCircle size={24} /> },
];

export const OnboardingPage: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const addToast = useAppStore((s) => s.addToast);

  const [invoiceSavePath, setInvoiceSavePath] = useState('');
  const defaultSavePath = 'Documents/InvoDesk/Invoices (default)';

  const [form, setForm] = useState<FormData>({
    owner_name: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    gst: '',
    pan: '',
    cin: '',
    invoice_prefix: 'TBD/INV',
    default_tax: '18',
    upi_label: 'Primary UPI',
    upi_id: '',
    upi_name: '',
    template_id: 'modern-blue',
  });

  const update = (field: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};
    if (step === 1) {
      if (!form.owner_name.trim()) newErrors.owner_name = 'Your name is required';
      if (!form.name.trim()) newErrors.name = 'Business name is required';
      if (!form.email.trim()) newErrors.email = 'Email is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const next = () => {
    if (!validate()) return;
    setDirection('forward');
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const back = () => {
    setDirection('back');
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleParseUpi = async () => {
    if (!form.upi_id.trim()) return;
    try {
      const result = await window.electronAPI.upi.parseUpiId(form.upi_id);
      if (result.suggested_name && !form.upi_name) {
        setForm((f) => ({ ...f, upi_name: result.suggested_name }));
      }
    } catch {}
  };

  const finish = async () => {
    setLoading(true);
    try {
      const business = await window.electronAPI.business.create({
        owner_name: form.owner_name,
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        gst: form.gst,
        pan: form.pan,
        cin: form.cin,
        invoice_prefix: form.invoice_prefix || 'TBD/INV',
        default_tax: parseFloat(form.default_tax) || 18,
        template_id: form.template_id,
      });

      if (form.upi_id.trim()) {
        await window.electronAPI.upi.add({
          business_id: business.id,
          label: form.upi_label || 'Primary UPI',
          upi_id: form.upi_id.trim(),
          upi_name: form.upi_name.trim(),
          is_primary: true,
        });
      }

      if (invoiceSavePath) {
        await window.electronAPI.settings.set('invoice_save_path', invoiceSavePath);
      }
      await window.electronAPI.settings.set('onboarding_complete', 'true');
      addToast({ type: 'success', title: 'Setup complete!', message: `Welcome, ${form.owner_name}!` });
      onComplete();
    } catch (err) {
      addToast({ type: 'error', title: 'Setup failed', message: 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const progress = (step / (steps.length - 1)) * 100;

  return (
    <div className="onboarding">
      <div className="onboarding-left">
        <div className="onboarding-brand">
          <div className="onboarding-brand-icon">
            <FileText size={28} color="#fff" />
          </div>
          <div className="onboarding-brand-name">InvoDesk</div>
          <div className="onboarding-brand-tagline">Professional invoicing for modern businesses</div>
        </div>

        <div className="onboarding-steps-list">
          {steps.map((s, i) => (
            <div key={s.id} className={`onboarding-step-item ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <div className="onboarding-step-dot">
                {i < step ? <CheckCircle size={14} /> : <span>{i + 1}</span>}
              </div>
              <span className="onboarding-step-label">{s.title}</span>
            </div>
          ))}
        </div>

        <div className="onboarding-copy">
          <p>Built by <strong>Tech Bytes Design</strong></p>
          <p>Offline-first · Secure · Fast</p>
        </div>
      </div>

      <div className="onboarding-right">
        <div className="onboarding-progress-bar">
          <div className="onboarding-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className={`onboarding-panel ${direction === 'forward' ? 'animate-slide-forward' : 'animate-slide-back'}`} key={step}>
          {step === 0 && (
            <div className="onboarding-step-content">
              <div className="onboarding-welcome-icon">
                <FileText size={40} />
              </div>
              <h1 className="onboarding-title">Welcome to InvoDesk</h1>
              <p className="onboarding-desc">
                Your professional invoicing solution. Set up your business profile in just a few steps. It takes less than 2 minutes.
              </p>
              <div className="onboarding-features">
                {[
                  'Generate professional PDF invoices with 10 templates',
                  'Track revenue and expenses with analytics',
                  'UPI QR code payment support',
                  'Multi-business profile support',
                  'Client address book for quick invoicing',
                  '100% offline — your data stays local',
                ].map((f) => (
                  <div key={f} className="onboarding-feature">
                    <CheckCircle size={15} className="onboarding-feature-icon" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="onboarding-step-content">
              <h1 className="onboarding-title">Your Profile</h1>
              <p className="onboarding-desc">Tell us about yourself and your business.</p>
              <div className="onboarding-form">
                <Input label="Your Full Name" placeholder="Mir Faizan" value={form.owner_name} onChange={(e) => update('owner_name', e.target.value)} error={errors.owner_name} required />
                <Input label="Business Name" placeholder="Tech Bytes Design" value={form.name} onChange={(e) => update('name', e.target.value)} error={errors.name} required />
                <Input label="Business Email" type="email" placeholder="techbytesdesign@gmail.com" value={form.email} onChange={(e) => update('email', e.target.value)} error={errors.email} required />
                <PhoneInput label="Phone Number" value={form.phone} onChange={(v) => update('phone', v)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-step-content">
              <h1 className="onboarding-title">Business Details</h1>
              <p className="onboarding-desc">Optional details for professional invoices.</p>
              <div className="onboarding-form">
                <Input label="Business Address" placeholder="123 Main Street, City, State 400001" value={form.address} onChange={(e) => update('address', e.target.value)} />
                <Input label="GSTIN" placeholder="22AAAAA0000A1Z5" value={form.gst} onChange={(e) => update('gst', e.target.value)} hint="Optional — appears on invoices" />
                <Input label="PAN Number" placeholder="AAAAA0000A" value={form.pan} onChange={(e) => update('pan', e.target.value)} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Input label="Invoice Prefix" placeholder="TBD/INV" value={form.invoice_prefix} onChange={(e) => update('invoice_prefix', e.target.value)} hint="e.g. TBD/INV" />
                  <Input label="Default Tax %" type="number" placeholder="18" value={form.default_tax} onChange={(e) => update('default_tax', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="onboarding-step-content">
              <h1 className="onboarding-title">Payment Setup</h1>
              <p className="onboarding-desc">Add a UPI ID to generate QR codes on invoices. You can skip this.</p>
              <div className="onboarding-form">
                <div style={{ position: 'relative' }}>
                  <Input
                    label="UPI ID"
                    placeholder="yourname@upi"
                    value={form.upi_id}
                    onChange={(e) => update('upi_id', e.target.value)}
                    onBlur={handleParseUpi}
                    hint="e.g. techbytes@okaxis — we'll suggest a display name"
                  />
                </div>
                <Input
                  label="UPI Display Name"
                  placeholder="John Doe"
                  value={form.upi_name}
                  onChange={(e) => update('upi_name', e.target.value)}
                  hint="Name shown on receiver's UPI app (GPay, PhonePe, etc.)"
                />
                <Input label="UPI Label" placeholder="Primary UPI" value={form.upi_label} onChange={(e) => update('upi_label', e.target.value)} hint="A short label for this UPI ID" />
              </div>
              <div className="onboarding-upi-info">
                <CreditCard size={14} />
                <span>QR codes are generated locally — no internet required</span>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="onboarding-step-content">
              <h1 className="onboarding-title">Choose Invoice Template</h1>
              <p className="onboarding-desc">Select a design for your invoices. You can change this anytime in Settings.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '16px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
                {TEMPLATES.map((t) => {
                  const selected = form.template_id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => update('template_id', t.id)}
                      style={{
                        border: selected ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                        borderRadius: '10px',
                        padding: '12px',
                        cursor: 'pointer',
                        background: selected ? 'var(--color-primary-light, #EFF6FF)' : '#fff',
                        position: 'relative',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {selected && (
                        <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--color-primary)', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CheckCircle size={12} color="#fff" />
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                        {t.colors.map((c, i) => (
                          <div key={i} style={{ width: i === 0 ? '28px' : '14px', height: '28px', borderRadius: '4px', background: c, border: '1px solid rgba(0,0,0,0.08)', flexShrink: 0 }} />
                        ))}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '2px' }}>{t.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{t.description}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="onboarding-step-content">
              <h1 className="onboarding-title">Invoice Save Location</h1>
              <p className="onboarding-desc">Choose where InvoDesk should save your invoices. Each business gets its own folder.</p>
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Save Path</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: invoiceSavePath ? 'var(--color-text)' : 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                    {invoiceSavePath || defaultSavePath}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const picked = await window.electronAPI.shell.pickFolder('Choose Invoice Save Folder');
                    if (picked) setInvoiceSavePath(picked);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--color-primary-light)', border: '1px solid var(--color-primary-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-primary)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', width: 'fit-content' }}
                >
                  <FolderOpen size={15} /> Choose Folder
                </button>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                  Invoices will be saved as:<br />
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{invoiceSavePath || 'Documents/InvoDesk/Invoices'}/</span><br />
                  <span style={{ fontFamily: 'var(--font-mono)' }}>  {form.name || 'Your Business'} - Invoices/HTML/</span><br />
                  <span style={{ fontFamily: 'var(--font-mono)' }}>  {form.name || 'Your Business'} - Invoices/PDF/</span>
                </p>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="onboarding-step-content">
              <div className="onboarding-complete-icon">
                <CheckCircle size={48} />
              </div>
              <h1 className="onboarding-title">All Set!</h1>
              <p className="onboarding-desc">Your business profile is ready. You can always update these details in Settings.</p>
              <div className="onboarding-summary">
                <div className="onboarding-summary-row">
                  <span>Business</span>
                  <strong>{form.name}</strong>
                </div>
                <div className="onboarding-summary-row">
                  <span>Owner</span>
                  <strong>{form.owner_name}</strong>
                </div>
                <div className="onboarding-summary-row">
                  <span>Email</span>
                  <strong>{form.email}</strong>
                </div>
                {form.gst && (
                  <div className="onboarding-summary-row">
                    <span>GSTIN</span>
                    <strong>{form.gst}</strong>
                  </div>
                )}
                {form.upi_id && (
                  <div className="onboarding-summary-row">
                    <span>UPI</span>
                    <strong>{form.upi_id}</strong>
                  </div>
                )}
                <div className="onboarding-summary-row">
                  <span>Template</span>
                  <strong>{TEMPLATES.find((t) => t.id === form.template_id)?.name || 'Modern Blue'}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="onboarding-actions">
          {step > 0 && (
            <Button variant="secondary" icon={<ChevronLeft size={16} />} onClick={back} disabled={loading}>
              Back
            </Button>
          )}
          <div style={{ flex: 1 }} />
          {step < steps.length - 1 ? (
            <Button variant="primary" iconRight={<ChevronRight size={16} />} onClick={next}>
              {step === 0 ? 'Get Started' : 'Continue'}
            </Button>
          ) : (
            <Button variant="success" icon={<CheckCircle size={16} />} onClick={finish} loading={loading}>
              Launch App
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
