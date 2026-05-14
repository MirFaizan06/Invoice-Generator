import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, ClipboardList, Lock, Shield, AlertTriangle, CheckCircle, ChevronRight, ChevronLeft, Plus
} from 'lucide-react';
import { Button } from '../../components/UI/Button';
import { Input, TextArea } from '../../components/UI/Input';
import { Tooltip } from '../../components/Tooltip';
import { useBusinessStore } from '../../store/business.store';
import { useAppStore } from '../../store/app.store';
import type {
  DocType, SavedClient, Project, CreateProjectData,
  MsaFieldValues, SowFieldValues, NdaFieldValues, SlaFieldValues,
  CreateLegalDocumentData, LegalDocument
} from '@shared/types';
import './DocumentGenerator.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface DocTypeOption {
  type: DocType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const DOC_TYPE_OPTIONS: DocTypeOption[] = [
  { type: 'msa', label: 'MSA', description: 'Master Services Agreement — Framework contract for ongoing client relationship', icon: <FileText size={24} strokeWidth={1.5} /> },
  { type: 'sow', label: 'SOW', description: 'Statement of Work — Project-specific scope and deliverables', icon: <ClipboardList size={24} strokeWidth={1.5} /> },
  { type: 'nda', label: 'NDA', description: 'Non-Disclosure Agreement — Protect confidential information', icon: <Lock size={24} strokeWidth={1.5} /> },
  { type: 'sla', label: 'SLA', description: 'Service Level Agreement — Define support and uptime commitments', icon: <Shield size={24} strokeWidth={1.5} /> },
];

const STEP_LABELS = ['Doc Type', 'Client', 'Fields', 'Preview', 'Save'];

// ─── Field forms ──────────────────────────────────────────────────────────────

type MsaForm = MsaFieldValues;
type SowForm = SowFieldValues;
type NdaForm = NdaFieldValues;
type SlaForm = SlaFieldValues;

const defaultMsa: MsaForm = { jurisdiction: '', liability_cap: '', governing_law: 'Laws of India', notice_period_days: 30, payment_due_days: 15 };
const defaultSow: SowForm = { project_description: '', scope: '', out_of_scope: '', milestones: '', total_amount: 0, currency: 'INR', payment_terms: 'Net 30', start_date: '', end_date: '' };
const defaultNda: NdaForm = { confidentiality_period_years: 2, exclusions: '', governing_law: 'Laws of India' };
const defaultSla: SlaForm = { services_description: '', uptime_percent: '99.5', response_time_critical: '2 hours', response_time_high: '8 hours', monthly_fee: 0, currency: 'INR', exclusions: '', support_hours: 'Mon–Fri, 9:00 AM – 6:00 PM IST' };

// ─── Main Component ───────────────────────────────────────────────────────────

export const DocumentGeneratorPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeBusiness } = useBusinessStore();
  const addToast = useAppStore((s) => s.addToast);

  // Wizard state
  const [step, setStep] = useState<WizardStep>(1);

  // Step 1
  const [selectedType, setSelectedType] = useState<DocType | null>(null);

  // Step 2
  const [clients, setClients] = useState<SavedClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ name: '', email: '', phone: '' });
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({ name: '', description: '' });
  const [msaWarning, setMsaWarning] = useState(false);
  const [step2Loading, setStep2Loading] = useState(false);

  // Step 3 — field values per type
  const [msaForm, setMsaForm] = useState<MsaForm>(defaultMsa);
  const [sowForm, setSowForm] = useState<SowForm>(defaultSow);
  const [ndaForm, setNdaForm] = useState<NdaForm>(defaultNda);
  const [slaForm, setSlaForm] = useState<SlaForm>(defaultSla);

  // Step 4
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // Step 5
  const [saveLoading, setSaveLoading] = useState(false);
  const [savedDoc, setSavedDoc] = useState<LegalDocument | null>(null);

  // Load clients on mount
  useEffect(() => {
    if (!activeBusiness) return;
    window.electronAPI.clients.getForBusiness(activeBusiness.id)
      .then(setClients)
      .catch(() => {});
  }, [activeBusiness]);

  // Load projects when client changes
  const loadProjects = useCallback(async (clientId: number) => {
    try {
      const data = await window.electronAPI.project.getForClient(clientId);
      setProjects(data);
    } catch {
      setProjects([]);
    }
  }, []);

  const handleClientChange = async (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedProjectId('');
    setMsaWarning(false);
    if (!clientId) { setProjects([]); return; }
    const id = Number(clientId);
    await loadProjects(id);
    if (selectedType === 'sow' || selectedType === 'sla') {
      const hasMsa = await window.electronAPI.document.hasSignedMSA(id).catch(() => true);
      setMsaWarning(!hasMsa);
    }
  };

  const handleCreateClient = async () => {
    if (!activeBusiness) return;
    if (!newClientForm.name.trim()) {
      addToast({ type: 'error', title: 'Client name is required' });
      return;
    }
    setStep2Loading(true);
    try {
      const created = await window.electronAPI.clients.save({
        business_id: activeBusiness.id,
        name: newClientForm.name.trim(),
        email: newClientForm.email.trim(),
        phone: newClientForm.phone.trim(),
        address: '',
        gst: '',
      } as Parameters<typeof window.electronAPI.clients.save>[0]);
      const updated = await window.electronAPI.clients.getForBusiness(activeBusiness.id);
      setClients(updated);
      setSelectedClientId(String(created.id));
      setShowNewClientForm(false);
      setNewClientForm({ name: '', email: '', phone: '' });
      addToast({ type: 'success', title: 'Client created', message: created.name });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to create client', message: String(err) });
    } finally {
      setStep2Loading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!activeBusiness || !selectedClientId) return;
    if (!newProjectForm.name.trim()) {
      addToast({ type: 'error', title: 'Project name is required' });
      return;
    }
    setStep2Loading(true);
    try {
      const data: CreateProjectData = {
        client_id: Number(selectedClientId),
        business_id: activeBusiness.id,
        name: newProjectForm.name.trim(),
        description: newProjectForm.description.trim(),
        status: 'active',
        start_date: '',
        end_date: '',
      };
      const created = await window.electronAPI.project.create(data);
      await loadProjects(Number(selectedClientId));
      setSelectedProjectId(String(created.id));
      setShowNewProjectForm(false);
      setNewProjectForm({ name: '', description: '' });
      addToast({ type: 'success', title: 'Project created', message: created.name });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to create project', message: String(err) });
    } finally {
      setStep2Loading(false);
    }
  };

  const getFieldValues = (): Record<string, unknown> => {
    switch (selectedType) {
      case 'msa': return msaForm as unknown as Record<string, unknown>;
      case 'sow': return sowForm as unknown as Record<string, unknown>;
      case 'nda': return ndaForm as unknown as Record<string, unknown>;
      case 'sla': return slaForm as unknown as Record<string, unknown>;
      default: return {};
    }
  };

  const handlePreview = async () => {
    if (!selectedType || !selectedClientId || !activeBusiness) return;
    setPreviewLoading(true);
    setStep(4);
    try {
      const result = await window.electronAPI.document.generate(
        selectedType,
        Number(selectedClientId),
        selectedProjectId ? Number(selectedProjectId) : null,
        activeBusiness.id,
        getFieldValues()
      );
      setGeneratedHtml(result.html);
      setGeneratedTitle(result.title);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to generate preview', message: String(err) });
      setStep(3);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSaveAndExport = async () => {
    if (!selectedType || !selectedClientId || !activeBusiness) return;
    setSaveLoading(true);
    setStep(5);
    try {
      const docData: CreateLegalDocumentData = {
        project_id: selectedProjectId ? Number(selectedProjectId) : null,
        client_id: Number(selectedClientId),
        business_id: activeBusiness.id,
        doc_type: selectedType,
        title: generatedTitle,
        content_html: generatedHtml,
        metadata: JSON.stringify(getFieldValues()),
      };
      const doc = await window.electronAPI.document.save(docData);
      setSavedDoc(doc);
      const pdfPath = await window.electronAPI.document.generatePDF(doc.id);
      await window.electronAPI.shell.openPath(pdfPath);
      addToast({ type: 'success', title: 'Document saved and PDF opened!' });
    } catch (err) {
      addToast({ type: 'error', title: 'Save failed', message: String(err) });
      setStep(4);
    } finally {
      setSaveLoading(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setSelectedType(null);
    setSelectedClientId('');
    setSelectedProjectId('');
    setProjects([]);
    setMsaWarning(false);
    setGeneratedHtml('');
    setGeneratedTitle('');
    setSavedDoc(null);
    setMsaForm(defaultMsa);
    setSowForm(defaultSow);
    setNdaForm(defaultNda);
    setSlaForm(defaultSla);
    setShowNewClientForm(false);
    setShowNewProjectForm(false);
  };

  const canGoStep2 = !!selectedType;
  const canGoStep3 = !!selectedClientId;
  const canGoStep4 = (() => {
    switch (selectedType) {
      case 'msa': return !!msaForm.jurisdiction && !!msaForm.liability_cap;
      case 'sow': return !!sowForm.project_description && !!sowForm.scope;
      case 'nda': return true;
      case 'sla': return !!slaForm.services_description;
      default: return false;
    }
  })();

  const needsProject = selectedType === 'sow' || selectedType === 'sla';

  return (
    <div className="page-content docgen-page page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Generate Document</h1>
          <p className="page-subtitle">Create professional legal documents in minutes</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="docgen-steps">
        {STEP_LABELS.map((label, i) => {
          const s = (i + 1) as WizardStep;
          return (
            <React.Fragment key={s}>
              <div className={`docgen-step ${step === s ? 'active' : ''} ${step > s ? 'done' : ''}`}>
                <div className="docgen-step-num">
                  {step > s ? <CheckCircle size={14} /> : s}
                </div>
                <span className="docgen-step-label">{label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && <div className={`docgen-step-connector ${step > s ? 'done' : ''}`} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Wizard card */}
      <div className="docgen-card">

        {/* ── Step 1: Doc Type ── */}
        {step === 1 && (
          <div className="docgen-step-content">
            <h2 className="docgen-section-title">Select Document Type</h2>
            <p className="docgen-section-desc">Choose the type of legal document you want to generate.</p>
            <div className="docgen-type-grid">
              {DOC_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  className={`docgen-type-card ${selectedType === opt.type ? 'selected' : ''}`}
                  onClick={() => setSelectedType(opt.type)}
                >
                  <div className="docgen-type-icon">{opt.icon}</div>
                  <div className="docgen-type-label">{opt.label}</div>
                  <div className="docgen-type-desc">{opt.description}</div>
                </button>
              ))}
            </div>
            <div className="docgen-actions">
              <div />
              <Button
                variant="primary"
                iconRight={<ChevronRight size={15} />}
                onClick={() => setStep(2)}
                disabled={!canGoStep2}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Client ── */}
        {step === 2 && (
          <div className="docgen-step-content">
            <h2 className="docgen-section-title">Select Client</h2>
            <p className="docgen-section-desc">Choose the client this document is for.</p>

            {msaWarning && (
              <div className="docgen-warning">
                <AlertTriangle size={15} />
                <span>No signed MSA found for this client. Consider creating an MSA first.</span>
              </div>
            )}

            <div className="input-wrapper" style={{ marginBottom: 12 }}>
              <label className="input-label">Client</label>
              <select
                className="docgen-select"
                value={selectedClientId}
                onChange={(e) => handleClientChange(e.target.value)}
              >
                <option value="">Select a client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>

            {!showNewClientForm ? (
              <button className="docgen-link-btn" onClick={() => setShowNewClientForm(true)}>
                <Plus size={13} /> Create New Client
              </button>
            ) : (
              <div className="docgen-inline-form">
                <h4 className="docgen-inline-title">New Client</h4>
                <Input label="Name" placeholder="Client name" value={newClientForm.name} onChange={(e) => setNewClientForm((f) => ({ ...f, name: e.target.value }))} />
                <div className="docgen-inline-row">
                  <Input label="Email" type="email" placeholder="email@example.com" value={newClientForm.email} onChange={(e) => setNewClientForm((f) => ({ ...f, email: e.target.value }))} />
                  <Input label="Phone" placeholder="+91 ..." value={newClientForm.phone} onChange={(e) => setNewClientForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="docgen-inline-actions">
                  <button className="docgen-link-btn" onClick={() => setShowNewClientForm(false)}>Cancel</button>
                  <Button variant="primary" size="sm" onClick={handleCreateClient} loading={step2Loading}>Create Client</Button>
                </div>
              </div>
            )}

            {/* Project selection for SOW / SLA */}
            {needsProject && selectedClientId && (
              <div style={{ marginTop: 20 }}>
                <div className="input-wrapper" style={{ marginBottom: 12 }}>
                  <label className="input-label">Project (optional)</label>
                  <select
                    className="docgen-select"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                  >
                    <option value="">No specific project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={String(p.id)}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {!showNewProjectForm ? (
                  <button className="docgen-link-btn" onClick={() => setShowNewProjectForm(true)}>
                    <Plus size={13} /> Create New Project
                  </button>
                ) : (
                  <div className="docgen-inline-form">
                    <h4 className="docgen-inline-title">New Project</h4>
                    <Input label="Name" placeholder="Project name" value={newProjectForm.name} onChange={(e) => setNewProjectForm((f) => ({ ...f, name: e.target.value }))} />
                    <TextArea label="Description" placeholder="Brief description..." value={newProjectForm.description} onChange={(e) => setNewProjectForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
                    <div className="docgen-inline-actions">
                      <button className="docgen-link-btn" onClick={() => setShowNewProjectForm(false)}>Cancel</button>
                      <Button variant="primary" size="sm" onClick={handleCreateProject} loading={step2Loading}>Create Project</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="docgen-actions">
              <Button variant="secondary" icon={<ChevronLeft size={15} />} onClick={() => setStep(1)}>Back</Button>
              <Button variant="primary" iconRight={<ChevronRight size={15} />} onClick={() => setStep(3)} disabled={!canGoStep3}>
                Next
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Fields ── */}
        {step === 3 && (
          <div className="docgen-step-content">
            <h2 className="docgen-section-title">Fill Document Fields</h2>
            <p className="docgen-section-desc">Provide the details that will be included in the document.</p>

            {selectedType === 'msa' && (
              <div className="docgen-fields">
                <div className="input-wrapper">
                  <div className="label-row"><label>Jurisdiction</label><Tooltip text="The city and state where legal disputes will be resolved. Usually where your business is located (e.g., Mumbai, Maharashtra)." /></div>
                  <Input placeholder="e.g. Mumbai, Maharashtra" value={msaForm.jurisdiction} onChange={(e) => setMsaForm((f) => ({ ...f, jurisdiction: e.target.value }))} />
                </div>
                <div className="input-wrapper">
                  <div className="label-row"><label>Liability Cap</label><Tooltip text="The maximum amount you can be held liable for. Common values: '3 months of fees' or a fixed amount like '₹50,000'." /></div>
                  <Input placeholder="e.g. 3 months of fees" value={msaForm.liability_cap} onChange={(e) => setMsaForm((f) => ({ ...f, liability_cap: e.target.value }))} />
                </div>
                <div className="input-wrapper">
                  <div className="label-row"><label>Governing Law</label><Tooltip text="Which country's laws govern this contract. Default is 'Laws of India' for domestic clients." /></div>
                  <Input placeholder="Laws of India" value={msaForm.governing_law} onChange={(e) => setMsaForm((f) => ({ ...f, governing_law: e.target.value }))} />
                </div>
                <div className="docgen-fields-row">
                  <div className="input-wrapper">
                    <div className="label-row"><label>Notice Period (days)</label><Tooltip text="How many days' written notice either party must give before terminating the agreement. 30 days is standard." /></div>
                    <Input type="number" min="1" value={msaForm.notice_period_days} onChange={(e) => setMsaForm((f) => ({ ...f, notice_period_days: Number(e.target.value) }))} />
                  </div>
                  <div className="input-wrapper">
                    <div className="label-row"><label>Payment Due (days)</label><Tooltip text="Number of days after invoice date by which payment must be received. 15 is standard for freelancers." /></div>
                    <Input type="number" min="1" value={msaForm.payment_due_days} onChange={(e) => setMsaForm((f) => ({ ...f, payment_due_days: Number(e.target.value) }))} />
                  </div>
                </div>
              </div>
            )}

            {selectedType === 'sow' && (
              <div className="docgen-fields">
                <div className="input-wrapper">
                  <div className="label-row"><label>Project Overview</label><Tooltip text="A high-level description of the project — what the client wants and why. 2-4 sentences is enough." /></div>
                  <TextArea placeholder="Describe the project..." value={sowForm.project_description} onChange={(e) => setSowForm((f) => ({ ...f, project_description: e.target.value }))} rows={3} />
                </div>
                <div className="input-wrapper">
                  <div className="label-row"><label>Detailed Scope</label><Tooltip text="List specifically what work is included. Be precise — 'Build a 5-page website' not just 'Build website'. Ambiguity causes disputes." /></div>
                  <TextArea placeholder="List all deliverables and tasks..." value={sowForm.scope} onChange={(e) => setSowForm((f) => ({ ...f, scope: e.target.value }))} rows={3} />
                </div>
                <div className="input-wrapper">
                  <div className="label-row"><label>Out of Scope</label><Tooltip text="Explicitly list what is NOT included. This protects you from scope creep. Example: 'Does not include copywriting, hosting, or SEO.'" /></div>
                  <TextArea placeholder="What is explicitly not included..." value={sowForm.out_of_scope} onChange={(e) => setSowForm((f) => ({ ...f, out_of_scope: e.target.value }))} rows={2} />
                </div>
                <div className="input-wrapper">
                  <div className="label-row"><label>Milestones &amp; Deliverables</label><Tooltip text="List what you'll deliver and when. Example: 'Week 1: Wireframes. Week 3: Design mockups. Week 5: Final delivery.'" /></div>
                  <TextArea placeholder="Key milestones and delivery dates..." value={sowForm.milestones} onChange={(e) => setSowForm((f) => ({ ...f, milestones: e.target.value }))} rows={3} />
                </div>
                <div className="docgen-fields-row">
                  <div className="input-wrapper">
                    <div className="label-row"><label>Total Amount</label><Tooltip text="The total project fee in the selected currency. This amount will appear on the SOW and is what the linked invoices should add up to." /></div>
                    <Input type="number" min="0" value={sowForm.total_amount} onChange={(e) => setSowForm((f) => ({ ...f, total_amount: Number(e.target.value) }))} />
                  </div>
                  <div className="input-wrapper">
                    <div className="label-row"><label>Currency</label><Tooltip text="The currency for this project. Choose based on your client's location." /></div>
                    <select className="docgen-select" value={sowForm.currency} onChange={(e) => setSowForm((f) => ({ ...f, currency: e.target.value }))}>
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>
                <div className="input-wrapper">
                  <div className="label-row"><label>Payment Terms</label><Tooltip text="When and how payment is made. '50% upfront' reduces your financial risk for new clients." /></div>
                  <select className="docgen-select" value={sowForm.payment_terms} onChange={(e) => setSowForm((f) => ({ ...f, payment_terms: e.target.value }))}>
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="50% upfront, 50% on delivery">50% upfront, 50% on delivery</option>
                  </select>
                </div>
                <div className="docgen-fields-row">
                  <div className="input-wrapper">
                    <div className="label-row"><label>Start Date</label><Tooltip text="The expected project timeline. These dates appear on the SOW but are not legally binding unless stated as such." /></div>
                    <Input type="date" value={sowForm.start_date} onChange={(e) => setSowForm((f) => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div className="input-wrapper">
                    <div className="label-row"><label>End Date</label><Tooltip text="The expected project end date. These dates appear on the SOW but are not legally binding unless stated as such." /></div>
                    <Input type="date" value={sowForm.end_date} onChange={(e) => setSowForm((f) => ({ ...f, end_date: e.target.value }))} />
                  </div>
                </div>
              </div>
            )}

            {selectedType === 'nda' && (
              <div className="docgen-fields">
                <div className="input-wrapper">
                  <div className="label-row"><label>Confidentiality Period</label><Tooltip text="How long the NDA stays active after signing. 2 years is standard for most software projects." /></div>
                  <select className="docgen-select" value={ndaForm.confidentiality_period_years} onChange={(e) => setNdaForm((f) => ({ ...f, confidentiality_period_years: Number(e.target.value) }))}>
                    <option value={1}>1 Year</option>
                    <option value={2}>2 Years</option>
                    <option value={3}>3 Years</option>
                    <option value={5}>5 Years</option>
                  </select>
                </div>
                <div className="input-wrapper">
                  <div className="label-row"><label>Exclusions</label><Tooltip text="Information that is NOT considered confidential — e.g., information already in the public domain. Leave blank for standard exclusions only." /></div>
                  <TextArea placeholder="List any exclusions to confidentiality..." value={ndaForm.exclusions} onChange={(e) => setNdaForm((f) => ({ ...f, exclusions: e.target.value }))} rows={3} />
                </div>
                <div className="input-wrapper">
                  <div className="label-row"><label>Governing Law</label><Tooltip text="Which country's laws apply. Normally the same as your MSA governing law." /></div>
                  <Input placeholder="Laws of India" value={ndaForm.governing_law} onChange={(e) => setNdaForm((f) => ({ ...f, governing_law: e.target.value }))} />
                </div>
              </div>
            )}

            {selectedType === 'sla' && (
              <div className="docgen-fields">
                <div className="input-wrapper">
                  <div className="label-row"><label>Services Covered</label><Tooltip text="Describe what services are covered by this SLA — e.g., 'Hosting and maintenance of the client's e-commerce website at xyz.com'." /></div>
                  <TextArea placeholder="Describe the services covered by this SLA..." value={slaForm.services_description} onChange={(e) => setSlaForm((f) => ({ ...f, services_description: e.target.value }))} rows={3} />
                </div>
                <div className="docgen-fields-row">
                  <div className="input-wrapper">
                    <div className="label-row"><label>Uptime %</label><Tooltip text="The percentage of time the service is guaranteed to be available. 99.5% = allows ~3.6 hours downtime/month. Never promise 100%." /></div>
                    <Input placeholder="99.5" value={slaForm.uptime_percent} onChange={(e) => setSlaForm((f) => ({ ...f, uptime_percent: e.target.value }))} />
                  </div>
                  <div className="input-wrapper">
                    <div className="label-row"><label>Support Hours</label><Tooltip text="When you're available to respond. Be realistic — e.g., 'Mon–Fri, 9 AM – 6 PM IST'. Clients will hold you to this." /></div>
                    <Input placeholder="Mon–Fri, 9:00 AM – 6:00 PM IST" value={slaForm.support_hours} onChange={(e) => setSlaForm((f) => ({ ...f, support_hours: e.target.value }))} />
                  </div>
                </div>
                <div className="docgen-fields-row">
                  <div className="input-wrapper">
                    <div className="label-row"><label>Response Time – Critical</label><Tooltip text="How quickly you'll respond to a critical issue (service completely down). 2-4 hours is realistic for solo developers." /></div>
                    <Input placeholder="2 hours" value={slaForm.response_time_critical} onChange={(e) => setSlaForm((f) => ({ ...f, response_time_critical: e.target.value }))} />
                  </div>
                  <div className="input-wrapper">
                    <div className="label-row"><label>Response Time – High</label><Tooltip text="Response time for major issues (important feature broken). 4-8 hours is standard." /></div>
                    <Input placeholder="8 hours" value={slaForm.response_time_high} onChange={(e) => setSlaForm((f) => ({ ...f, response_time_high: e.target.value }))} />
                  </div>
                </div>
                <div className="docgen-fields-row">
                  <div className="input-wrapper">
                    <div className="label-row"><label>Monthly Fee</label><Tooltip text="The monthly retainer amount for this SLA. This is separate from project fees." /></div>
                    <Input type="number" min="0" value={slaForm.monthly_fee} onChange={(e) => setSlaForm((f) => ({ ...f, monthly_fee: Number(e.target.value) }))} />
                  </div>
                  <div className="input-wrapper">
                    <div className="label-row"><label>Currency</label><Tooltip text="The currency for this project. Choose based on your client's location." /></div>
                    <select className="docgen-select" value={slaForm.currency} onChange={(e) => setSlaForm((f) => ({ ...f, currency: e.target.value }))}>
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>
                <div className="input-wrapper">
                  <div className="label-row"><label>Exclusions</label><Tooltip text="Situations where the SLA doesn't apply — e.g., client-side server failures, force majeure events, third-party outages." /></div>
                  <TextArea placeholder="What is excluded from this SLA..." value={slaForm.exclusions} onChange={(e) => setSlaForm((f) => ({ ...f, exclusions: e.target.value }))} rows={2} />
                </div>
              </div>
            )}

            <div className="docgen-actions">
              <Button variant="secondary" icon={<ChevronLeft size={15} />} onClick={() => setStep(2)}>Back</Button>
              <Button variant="primary" iconRight={<ChevronRight size={15} />} onClick={handlePreview} disabled={!canGoStep4}>
                Preview Document
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Preview ── */}
        {step === 4 && (
          <div className="docgen-step-content">
            <h2 className="docgen-section-title">Preview</h2>
            {previewLoading ? (
              <div className="docgen-loading">
                <div className="docgen-spinner" />
                <p>Generating document preview...</p>
              </div>
            ) : (
              <>
                {generatedTitle && (
                  <div className="docgen-preview-title">{generatedTitle}</div>
                )}
                <div
                  className="docgen-preview-container"
                  dangerouslySetInnerHTML={{ __html: generatedHtml }}
                />
              </>
            )}
            <div className="docgen-actions">
              <Button variant="secondary" icon={<ChevronLeft size={15} />} onClick={() => setStep(3)} disabled={previewLoading}>Back</Button>
              <Button variant="primary" iconRight={<ChevronRight size={15} />} onClick={handleSaveAndExport} disabled={previewLoading || !generatedHtml}>
                Save & Export PDF
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 5: Done ── */}
        {step === 5 && (
          <div className="docgen-step-content">
            {saveLoading ? (
              <div className="docgen-loading">
                <div className="docgen-spinner" />
                <p>Saving document and generating PDF...</p>
              </div>
            ) : (
              <div className="docgen-success">
                <div className="docgen-success-icon">
                  <CheckCircle size={48} strokeWidth={1.5} />
                </div>
                <h2 className="docgen-success-title">Document Saved!</h2>
                {generatedTitle && <p className="docgen-success-doc">{generatedTitle}</p>}
                <p className="docgen-success-desc">The document has been saved and the PDF has been opened.</p>
                <div className="docgen-success-actions">
                  <Button variant="secondary" onClick={resetWizard}>Create Another Document</Button>
                  <Button variant="primary" onClick={() => navigate('/documents')}>View All Documents</Button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default DocumentGeneratorPage;
