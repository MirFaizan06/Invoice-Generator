import React, { useState } from 'react';
import { FileText, Building2, CreditCard, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
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
}

const steps = [
  { id: 0, title: 'Welcome', icon: <FileText size={24} /> },
  { id: 1, title: 'Your Profile', icon: <FileText size={24} /> },
  { id: 2, title: 'Business Details', icon: <Building2 size={24} /> },
  { id: 3, title: 'Payment Setup', icon: <CreditCard size={24} /> },
  { id: 4, title: 'Complete', icon: <CheckCircle size={24} /> },
];

export const OnboardingPage: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const addToast = useAppStore((s) => s.addToast);

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
      });

      if (form.upi_id.trim()) {
        await window.electronAPI.upi.add({
          business_id: business.id,
          label: form.upi_label || 'Primary UPI',
          upi_id: form.upi_id.trim(),
          is_primary: true,
        });
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

  const progress = ((step) / (steps.length - 1)) * 100;

  return (
    <div className="onboarding">
      <div className="onboarding-left">
        <div className="onboarding-brand">
          <div className="onboarding-brand-icon">
            <FileText size={28} color="#fff" />
          </div>
          <div className="onboarding-brand-name">InvoiceGenerator</div>
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
              <h1 className="onboarding-title">Welcome to InvoiceGenerator</h1>
              <p className="onboarding-desc">
                Your professional invoicing solution. Let's set up your business profile in just a few steps.
                It takes less than 2 minutes.
              </p>
              <div className="onboarding-features">
                {[
                  'Generate professional PDF invoices',
                  'Track revenue and expenses',
                  'UPI QR code payment support',
                  'Multi-business profile support',
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
                <Input label="Your Full Name" placeholder="Mir Faizan" value={form.owner_name} onChange={(e) => update('owner_name', e.target.value)} error={errors.owner_name} />
                <Input label="Business Name" placeholder="Tech Bytes Design" value={form.name} onChange={(e) => update('name', e.target.value)} error={errors.name} />
                <Input label="Business Email" type="email" placeholder="techbytesdesign@gmail.com" value={form.email} onChange={(e) => update('email', e.target.value)} error={errors.email} />
                <Input label="Phone Number" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
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
                <Input label="UPI ID" placeholder="yourname@upi" value={form.upi_id} onChange={(e) => update('upi_id', e.target.value)} hint="e.g. techbytes@okaxis" />
                <Input label="UPI Label" placeholder="Primary UPI" value={form.upi_label} onChange={(e) => update('upi_label', e.target.value)} hint="A name for this UPI ID" />
              </div>
              <div className="onboarding-upi-info">
                <CreditCard size={14} />
                <span>QR codes are generated locally — no internet required</span>
              </div>
            </div>
          )}

          {step === 4 && (
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
