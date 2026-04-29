import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, Eye, RotateCcw } from 'lucide-react';
import { Button } from '../../components/UI/Button';
import { Input, TextArea } from '../../components/UI/Input';
import { useInvoiceStore } from '../../store/invoice.store';
import { useBusinessStore } from '../../store/business.store';
import { useAppStore } from '../../store/app.store';
import './CreateInvoice.css';

export const CreateInvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const { draft, setDraft, setItem, addItem, removeItem, reset } = useInvoiceStore();
  const { activeBusiness } = useBusinessStore();
  const addToast = useAppStore((s) => s.addToast);
  const [saving, setSaving] = useState(false);
  const [nextNumber, setNextNumber] = useState('');

  useEffect(() => {
    if (activeBusiness) {
      window.electronAPI.invoice.getNextNumber(activeBusiness.id).then(setNextNumber);
      if (!draft.tax_percent) setDraft({ tax_percent: activeBusiness.default_tax });
    }
  }, [activeBusiness]);

  const subtotal = draft.items.reduce((s, i) => s + i.amount, 0);
  const taxAmount = (subtotal * draft.tax_percent) / 100;
  const total = subtotal + taxAmount;

  const handleSave = async (andPreview = false) => {
    if (!activeBusiness) { addToast({ type: 'error', title: 'No active business' }); return; }
    if (!draft.client_name.trim()) { addToast({ type: 'error', title: 'Client name is required' }); return; }
    if (!draft.project_name.trim()) { addToast({ type: 'error', title: 'Project name is required' }); return; }
    if (draft.items.length === 0 || draft.items.every((i) => !i.title.trim())) { addToast({ type: 'error', title: 'Add at least one item' }); return; }

    setSaving(true);
    try {
      const invoice = await window.electronAPI.invoice.create({
        business_id: activeBusiness.id,
        client_name: draft.client_name,
        client_address: draft.client_address,
        client_email: draft.client_email,
        client_phone: draft.client_phone,
        project_name: draft.project_name,
        date: draft.date,
        due_date: draft.due_date,
        tax_percent: draft.tax_percent,
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

  return (
    <div className="page-content create-invoice-page page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">New Invoice</h1>
          <p className="page-subtitle">
            Invoice #{nextNumber || '...'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={reset}>Reset</Button>
          <Button variant="secondary" icon={<Eye size={15} />} onClick={() => handleSave(true)} loading={saving}>
            Save & Preview
          </Button>
          <Button variant="primary" icon={<Save size={15} />} onClick={() => handleSave(false)} loading={saving}>
            Save Invoice
          </Button>
        </div>
      </div>

      <div className="create-invoice-grid">
        <div className="create-invoice-left">
          {/* Client Info */}
          <div className="ci-section">
            <h3 className="ci-section-title">Bill To</h3>
            <div className="ci-form-grid">
              <Input label="Client Name" placeholder="Acme Corporation" value={draft.client_name} onChange={(e) => setDraft({ client_name: e.target.value })} />
              <Input label="Client Email" type="email" placeholder="client@example.com" value={draft.client_email} onChange={(e) => setDraft({ client_email: e.target.value })} />
              <Input label="Phone" type="tel" placeholder="+91 98765 43210" value={draft.client_phone} onChange={(e) => setDraft({ client_phone: e.target.value })} />
              <div style={{ gridColumn: '1 / -1' }}>
                <TextArea label="Client Address" placeholder="123 Business Street, City, State 400001" value={draft.client_address} onChange={(e) => setDraft({ client_address: e.target.value })} rows={2} />
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="ci-section">
            <h3 className="ci-section-title">Invoice Details</h3>
            <div className="ci-form-grid">
              <Input label="Project Name" placeholder="Website Development" value={draft.project_name} onChange={(e) => setDraft({ project_name: e.target.value })} />
              <Input label="Invoice Date" type="date" value={draft.date} onChange={(e) => setDraft({ date: e.target.value })} />
              <Input label="Due Date" type="date" value={draft.due_date} onChange={(e) => setDraft({ due_date: e.target.value })} />
              <Input label="Tax %" type="number" min="0" max="100" step="0.5" value={String(draft.tax_percent)} onChange={(e) => setDraft({ tax_percent: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>

          {/* Items */}
          <div className="ci-section">
            <div className="ci-items-header">
              <h3 className="ci-section-title">Line Items</h3>
              <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={addItem}>Add Item</Button>
            </div>

            <div className="ci-items-table">
              <div className="ci-items-head">
                <div style={{ flex: 1 }}>Description</div>
                <div style={{ width: 70, textAlign: 'center' }}>Qty</div>
                <div style={{ width: 110, textAlign: 'right' }}>Rate (₹)</div>
                <div style={{ width: 110, textAlign: 'right' }}>Amount</div>
                <div style={{ width: 36 }} />
              </div>

              {draft.items.map((item, index) => (
                <div key={index} className="ci-item-row">
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
                  <div style={{ width: 70 }}>
                    <input
                      type="number"
                      className="ci-item-input ci-item-number-input"
                      min="0"
                      step="0.5"
                      value={item.quantity}
                      onChange={(e) => setItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div style={{ width: 110 }}>
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
                    ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <button className="ci-item-delete" onClick={() => removeItem(index)} disabled={draft.items.length === 1}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="ci-section">
            <TextArea label="Notes" placeholder="Payment terms, thank you message, etc." value={draft.notes} onChange={(e) => setDraft({ notes: e.target.value })} rows={3} />
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
                <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="ci-summary-row">
                <span>GST ({draft.tax_percent}%)</span>
                <span>₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="ci-summary-total">
              <span>Total</span>
              <span>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div style={{ marginTop: 20 }}>
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
