import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, Eye, RotateCcw, ChevronDown, ChevronUp, Users, X } from 'lucide-react';
import { Button } from '../../components/UI/Button';
import { Input, TextArea } from '../../components/UI/Input';
import { useInvoiceStore } from '../../store/invoice.store';
import { useBusinessStore } from '../../store/business.store';
import { useAppStore } from '../../store/app.store';
import type { SavedClient } from '@shared/types';
import './CreateInvoice.css';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR'];
const PAYMENT_TERMS = ['Due on Receipt', 'Net 7', 'Net 15', 'Net 30', 'Net 45', 'Net 60'];

export const CreateInvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const { draft, setDraft, setItem, addItem, removeItem, reset } = useInvoiceStore();
  const { activeBusiness } = useBusinessStore();
  const addToast = useAppStore((s) => s.addToast);
  const [saving, setSaving] = useState(false);
  const [nextNumber, setNextNumber] = useState('');
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const clientInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeBusiness) {
      window.electronAPI.invoice.getNextNumber(activeBusiness.id).then(setNextNumber);
      if (!draft.tax_percent) setDraft({ tax_percent: activeBusiness.default_tax });
      window.electronAPI.clients.getForBusiness(activeBusiness.id).then(setSavedClients);
    }
  }, [activeBusiness]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (clientInputRef.current && !clientInputRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const subtotal = draft.items.reduce((s, i) => s + i.amount, 0);
  const discountAmt = draft.discount_amount || (subtotal * (draft.discount_percent || 0)) / 100;
  const taxableAmount = subtotal - discountAmt;
  const taxAmount = (taxableAmount * draft.tax_percent) / 100;
  const total = taxableAmount + (draft.shipping_charges || 0) + taxAmount;

  const currencySymbol = (c: string) => ({ INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED ', SAR: 'SAR ' }[c] || '₹');
  const sym = currencySymbol(draft.currency);

  const applyClient = (client: SavedClient) => {
    setDraft({
      client_name: client.name,
      client_email: client.email,
      client_phone: client.phone,
      client_address: client.address,
      client_gst: client.gst,
    });
    setClientSearch('');
    setShowClientDropdown(false);
  };

  const saveCurrentClient = async () => {
    if (!activeBusiness || !draft.client_name.trim()) return;
    try {
      const saved = await window.electronAPI.clients.save({
        business_id: activeBusiness.id,
        name: draft.client_name,
        email: draft.client_email,
        phone: draft.client_phone,
        address: draft.client_address,
        gst: draft.client_gst,
      });
      setSavedClients((prev) => [...prev.filter((c) => c.id !== saved.id), saved]);
      addToast({ type: 'success', title: 'Client saved', message: draft.client_name });
    } catch {
      addToast({ type: 'error', title: 'Failed to save client' });
    }
  };

  const validate = (): string[] => {
    const errors: string[] = [];
    if (!draft.client_name.trim()) errors.push('Client Name');
    if (!draft.project_name.trim()) errors.push('Project Name');
    if (draft.items.length === 0 || draft.items.every((i) => !i.title.trim())) errors.push('At least one Line Item');
    draft.items.forEach((item, idx) => {
      if (item.title.trim() && item.unit_price <= 0) errors.push(`Item ${idx + 1} Rate`);
    });
    return errors;
  };

  const handleSave = async (andPreview = false) => {
    if (!activeBusiness) { addToast({ type: 'error', title: 'No active business' }); return; }
    const errors = validate();
    if (errors.length > 0) {
      setValidationErrors(errors);
      addToast({ type: 'error', title: `${errors.length} required field${errors.length > 1 ? 's' : ''} missing`, message: errors.join(', ') });
      return;
    }
    setValidationErrors([]);
    setSaving(true);
    try {
      const invoice = await window.electronAPI.invoice.create({
        business_id: activeBusiness.id,
        client_name: draft.client_name,
        client_address: draft.client_address,
        client_email: draft.client_email,
        client_phone: draft.client_phone,
        client_gst: draft.client_gst,
        project_name: draft.project_name,
        po_number: draft.po_number,
        place_of_supply: draft.place_of_supply,
        payment_terms: draft.payment_terms,
        date: draft.date,
        due_date: draft.due_date,
        tax_percent: draft.tax_percent,
        discount_percent: draft.discount_percent,
        discount_amount: discountAmt,
        shipping_charges: draft.shipping_charges,
        currency: draft.currency,
        bank_account: draft.bank_account,
        bank_name: draft.bank_name,
        bank_ifsc: draft.bank_ifsc,
        bank_holder: draft.bank_holder,
        notes: draft.notes,
        items: draft.items.filter((i) => i.title.trim()),
      });

      addToast({ type: 'success', title: 'Invoice created!', message: invoice.invoice_number });
      reset();
      if (andPreview) navigate(`/invoice/${invoice.id}`);
      else navigate('/history');
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to create invoice', message: String(err) });
    } finally {
      setSaving(false);
    }
  };

  const filteredClients = savedClients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const hasError = (field: string) => validationErrors.some((e) => e.toLowerCase().includes(field.toLowerCase()));

  return (
    <div className="page-content create-invoice-page page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">New Invoice</h1>
          <p className="page-subtitle">Invoice #{nextNumber || '...'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={reset}>Reset</Button>
          <Button variant="secondary" icon={<Eye size={15} />} onClick={() => handleSave(true)} loading={saving}>Save & Preview</Button>
          <Button variant="primary" icon={<Save size={15} />} onClick={() => handleSave(false)} loading={saving}>Save Invoice</Button>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="ci-validation-banner">
          <strong>Please fill required fields:</strong> {validationErrors.join(' · ')}
          <button onClick={() => setValidationErrors([])} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={14} /></button>
        </div>
      )}

      <div className="create-invoice-grid">
        <div className="create-invoice-left">

          {/* Bill To */}
          <div className="ci-section">
            <div className="ci-section-header-row">
              <h3 className="ci-section-title">Bill To</h3>
              <div ref={clientInputRef} style={{ position: 'relative' }}>
                <Button variant="ghost" size="sm" icon={<Users size={13} />} onClick={() => setShowClientDropdown(!showClientDropdown)}>
                  Saved Clients
                </Button>
                {showClientDropdown && (
                  <div className="ci-client-dropdown">
                    <input
                      className="ci-client-search"
                      placeholder="Search clients..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      autoFocus
                    />
                    <div className="ci-client-list">
                      {filteredClients.length === 0 ? (
                        <div className="ci-client-empty">No saved clients</div>
                      ) : filteredClients.map((c) => (
                        <div key={c.id} className="ci-client-item" onClick={() => applyClient(c)}>
                          <div className="ci-client-name">{c.name}</div>
                          {c.email && <div className="ci-client-sub">{c.email}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="ci-form-grid">
              <Input
                label="Client Name"
                placeholder="Acme Corporation"
                value={draft.client_name}
                onChange={(e) => setDraft({ client_name: e.target.value })}
                error={hasError('Client Name') ? 'Client name is required' : ''}
                required
              />
              <Input
                label="Client GSTIN"
                placeholder="22AAAAA0000A1Z5"
                value={draft.client_gst}
                onChange={(e) => setDraft({ client_gst: e.target.value })}
                hint="Optional — for B2B GST invoices"
              />
              <Input label="Client Email" type="email" placeholder="client@example.com" value={draft.client_email} onChange={(e) => setDraft({ client_email: e.target.value })} />
              <Input label="Client Phone" type="tel" placeholder="+91 98765 43210" value={draft.client_phone} onChange={(e) => setDraft({ client_phone: e.target.value })} />
              <div style={{ gridColumn: '1 / -1' }}>
                <TextArea label="Client Address" placeholder="123 Business Street, City, State 400001" value={draft.client_address} onChange={(e) => setDraft({ client_address: e.target.value })} rows={2} />
              </div>
            </div>
            {draft.client_name.trim() && (
              <button className="ci-save-client-btn" onClick={saveCurrentClient} title="Save this client for future use">
                <Users size={12} /> Save client to address book
              </button>
            )}
          </div>

          {/* Invoice Details */}
          <div className="ci-section">
            <h3 className="ci-section-title">Invoice Details</h3>
            <div className="ci-form-grid">
              <Input
                label="Project / Service Name"
                placeholder="Website Development"
                value={draft.project_name}
                onChange={(e) => setDraft({ project_name: e.target.value })}
                error={hasError('Project Name') ? 'Project name is required' : ''}
                required
              />
              <Input
                label="PO Number"
                placeholder="PO-2026-001"
                value={draft.po_number}
                onChange={(e) => setDraft({ po_number: e.target.value })}
                hint="Purchase Order reference (optional)"
              />
              <Input label="Invoice Date" type="date" value={draft.date} onChange={(e) => setDraft({ date: e.target.value })} required />
              <Input label="Due Date" type="date" value={draft.due_date} onChange={(e) => setDraft({ due_date: e.target.value })} hint="Payment due date" />
              <div>
                <label className="input-label">Payment Terms</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {PAYMENT_TERMS.map((pt) => (
                    <button
                      key={pt}
                      className={`ci-term-chip ${draft.payment_terms === pt ? 'active' : ''}`}
                      onClick={() => setDraft({ payment_terms: draft.payment_terms === pt ? '' : pt })}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                label="Place of Supply"
                placeholder="Maharashtra"
                value={draft.place_of_supply}
                onChange={(e) => setDraft({ place_of_supply: e.target.value })}
                hint="State/UT for GST compliance"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="ci-section">
            <div className="ci-items-header">
              <h3 className="ci-section-title">
                Line Items
                {hasError('Line Item') && <span style={{ color: 'var(--color-danger)', fontSize: 11, marginLeft: 8 }}>At least one item required</span>}
              </h3>
              <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={addItem}>Add Item</Button>
            </div>

            <div className="ci-items-table">
              <div className="ci-items-head">
                <div style={{ flex: 1 }}>Description</div>
                <div style={{ width: 80, textAlign: 'center', fontSize: 11, color: 'var(--color-text-muted)' }}>HSN/SAC</div>
                <div style={{ width: 60, textAlign: 'center' }}>Qty</div>
                <div style={{ width: 100, textAlign: 'right' }}>Rate ({sym})</div>
                <div style={{ width: 100, textAlign: 'right' }}>Amount</div>
                <div style={{ width: 32 }} />
              </div>

              {draft.items.map((item, index) => (
                <div key={index} className={`ci-item-row ${hasError(`Item ${index + 1}`) ? 'ci-item-error' : ''}`}>
                  <div className="ci-item-desc">
                    <input
                      className="ci-item-input ci-item-title-input"
                      placeholder="Service or Product Name"
                      value={item.title}
                      onChange={(e) => setItem(index, { title: e.target.value })}
                    />
                    <input
                      className="ci-item-input ci-item-desc-input"
                      placeholder="Optional description..."
                      value={item.description}
                      onChange={(e) => setItem(index, { description: e.target.value })}
                    />
                  </div>
                  <div style={{ width: 80 }}>
                    <input
                      className="ci-item-input ci-item-center-input"
                      placeholder="HSN"
                      value={item.hsn_sac}
                      onChange={(e) => setItem(index, { hsn_sac: e.target.value })}
                      title="HSN/SAC Code"
                    />
                  </div>
                  <div style={{ width: 60 }}>
                    <input
                      type="number"
                      className="ci-item-input ci-item-number-input"
                      min="0"
                      step="0.5"
                      value={item.quantity}
                      onChange={(e) => setItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div style={{ width: 100 }}>
                    <input
                      type="number"
                      className="ci-item-input ci-item-number-input"
                      min="0"
                      step="1"
                      value={item.unit_price}
                      onChange={(e) => setItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="ci-item-amount">
                    {sym}{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <button className="ci-item-delete" onClick={() => removeItem(index)} disabled={draft.items.length === 1}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tax & Discount */}
          <div className="ci-section">
            <h3 className="ci-section-title">Tax, Discount & Shipping</h3>
            <div className="ci-form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div>
                <label className="input-label">Currency</label>
                <select className="ci-select" value={draft.currency} onChange={(e) => setDraft({ currency: e.target.value })}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Input label="Tax %" type="number" min="0" max="100" step="0.5" value={String(draft.tax_percent)} onChange={(e) => setDraft({ tax_percent: parseFloat(e.target.value) || 0 })} />
              <Input label="Discount %" type="number" min="0" max="100" step="0.5" value={String(draft.discount_percent)} onChange={(e) => setDraft({ discount_percent: parseFloat(e.target.value) || 0, discount_amount: 0 })} hint="% of subtotal" />
              <Input label="Shipping (₹)" type="number" min="0" step="1" value={String(draft.shipping_charges)} onChange={(e) => setDraft({ shipping_charges: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>

          {/* Bank Details (collapsible) */}
          <div className="ci-section">
            <button className="ci-collapsible-header" onClick={() => setShowBankDetails(!showBankDetails)}>
              <h3 className="ci-section-title" style={{ margin: 0 }}>Bank Details</h3>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Optional — appears on invoice</span>
              {showBankDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            {showBankDetails && (
              <div className="ci-form-grid" style={{ marginTop: 12 }}>
                <Input label="Account Holder Name" placeholder="Mir Faizan" value={draft.bank_holder} onChange={(e) => setDraft({ bank_holder: e.target.value })} />
                <Input label="Bank Name" placeholder="HDFC Bank" value={draft.bank_name} onChange={(e) => setDraft({ bank_name: e.target.value })} />
                <Input label="Account Number" placeholder="1234567890" value={draft.bank_account} onChange={(e) => setDraft({ bank_account: e.target.value })} />
                <Input label="IFSC Code" placeholder="HDFC0001234" value={draft.bank_ifsc} onChange={(e) => setDraft({ bank_ifsc: e.target.value })} />
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="ci-section">
            <TextArea label="Notes & Terms" placeholder="Payment terms, thank you message, additional instructions..." value={draft.notes} onChange={(e) => setDraft({ notes: e.target.value })} rows={3} />
          </div>
        </div>

        {/* Right: Summary */}
        <div className="create-invoice-right">
          <div className="ci-summary-card">
            <h3 className="ci-section-title" style={{ marginBottom: 16 }}>Invoice Summary</h3>

            <div className="ci-summary-rows">
              <div className="ci-summary-row">
                <span>Items</span>
                <span>{draft.items.filter((i) => i.title).length}</span>
              </div>
              <div className="ci-summary-row">
                <span>Subtotal</span>
                <span>{sym}{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {discountAmt > 0 && (
                <div className="ci-summary-row" style={{ color: 'var(--color-danger)' }}>
                  <span>Discount</span>
                  <span>− {sym}{discountAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {(draft.shipping_charges || 0) > 0 && (
                <div className="ci-summary-row">
                  <span>Shipping</span>
                  <span>{sym}{(draft.shipping_charges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="ci-summary-row">
                <span>Tax ({draft.tax_percent}%)</span>
                <span>{sym}{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="ci-summary-total">
              <span>Total</span>
              <span>{sym}{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div style={{ marginTop: 16 }}>
              <Button variant="primary" fullWidth icon={<Save size={15} />} onClick={() => handleSave(false)} loading={saving}>
                Save Invoice
              </Button>
              <Button variant="secondary" fullWidth icon={<Eye size={15} />} onClick={() => handleSave(true)} loading={saving} style={{ marginTop: 8 }}>
                Save & Preview
              </Button>
            </div>

            {activeBusiness && (
              <div className="ci-business-info">
                <div className="ci-business-name">{activeBusiness.name}</div>
                {activeBusiness.gst && <div className="ci-business-detail">GST: {activeBusiness.gst}</div>}
                {activeBusiness.email && <div className="ci-business-detail">{activeBusiness.email}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
