import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Briefcase, Calendar, FileText, Filter } from 'lucide-react';
import { Button } from '../../components/UI/Button';
import { Input, TextArea } from '../../components/UI/Input';
import { Badge } from '../../components/UI/Badge';
import { Modal } from '../../components/UI/Modal';
import { useBusinessStore } from '../../store/business.store';
import { useAppStore } from '../../store/app.store';
import type { Project, SavedClient, ProjectStatus, CreateProjectData } from '@shared/types';
import './Projects.css';

interface ProjectFormData {
  client_id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  start_date: string;
  end_date: string;
}

const emptyForm: ProjectFormData = {
  client_id: '',
  name: '',
  description: '',
  status: 'active',
  start_date: '',
  end_date: '',
};

const statusVariantMap: Record<ProjectStatus, 'success' | 'primary' | 'default'> = {
  active: 'success',
  completed: 'primary',
  archived: 'default',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

export const ProjectsPage: React.FC = () => {
  const { activeBusiness } = useBusinessStore();
  const addToast = useAppStore((s) => s.addToast);

  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<SavedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [docCounts, setDocCounts] = useState<Record<number, number>>({});

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!activeBusiness) return;
    setLoading(true);
    try {
      const [projectData, clientData] = await Promise.all([
        window.electronAPI.project.getForBusiness(activeBusiness.id),
        window.electronAPI.clients.getForBusiness(activeBusiness.id),
      ]);
      setProjects(projectData);
      setClients(clientData);

      // Load doc counts
      const counts: Record<number, number> = {};
      await Promise.all(
        projectData.map(async (p) => {
          const docs = await window.electronAPI.document.getAll({ projectId: p.id }).catch(() => []);
          counts[p.id] = docs.length;
        })
      );
      setDocCounts(counts);
    } finally {
      setLoading(false);
    }
  }, [activeBusiness]);

  useEffect(() => {
    load();
  }, [load]);

  const getClientName = (id: number) => clients.find((c) => c.id === id)?.name || '—';

  const filteredProjects = projects.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (clientFilter !== 'all' && String(p.client_id) !== clientFilter) return false;
    return true;
  });

  const openNewModal = () => {
    setEditTarget(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (project: Project) => {
    setEditTarget(project);
    setFormData({
      client_id: String(project.client_id),
      name: project.name,
      description: project.description,
      status: project.status,
      start_date: project.start_date || '',
      end_date: project.end_date || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!activeBusiness) return;
    if (!formData.name.trim()) {
      addToast({ type: 'error', title: 'Project name is required' });
      return;
    }
    if (!formData.client_id) {
      addToast({ type: 'error', title: 'Please select a client' });
      return;
    }
    setSaving(true);
    try {
      const data: CreateProjectData = {
        client_id: Number(formData.client_id),
        business_id: activeBusiness.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
        start_date: formData.start_date,
        end_date: formData.end_date,
      };
      if (editTarget) {
        await window.electronAPI.project.update(editTarget.id, data);
        addToast({ type: 'success', title: 'Project updated', message: formData.name });
      } else {
        await window.electronAPI.project.create(data);
        addToast({ type: 'success', title: 'Project created', message: formData.name });
      }
      setShowModal(false);
      load();
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to save project', message: String(err) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await window.electronAPI.project.delete(deleteTarget.id);
      addToast({ type: 'success', title: 'Project deleted', message: deleteTarget.name });
      setDeleteTarget(null);
      load();
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to delete project', message: String(err) });
    }
  };

  const field = (key: keyof ProjectFormData) => (
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setFormData((f) => ({ ...f, [key]: e.target.value }))
  );

  return (
    <div className="page-content projects-page page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{filteredProjects.length} of {projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={openNewModal}>
          New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="projects-filters">
        <div className="projects-filter-group">
          <Filter size={14} style={{ color: 'var(--color-text-muted)' }} />
          {(['all', 'active', 'completed', 'archived'] as const).map((s) => (
            <button
              key={s}
              className={`projects-filter-btn ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="projects-client-filter">
          <select
            className="projects-select"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
          >
            <option value="all">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="projects-table-wrap">
        {loading ? (
          <div className="empty-state">
            <div className="animate-pulse" style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Loading...</div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Briefcase size={32} strokeWidth={1.5} /></div>
            <div className="empty-state-title">{projects.length === 0 ? 'No projects yet' : 'No projects match filter'}</div>
            <div className="empty-state-desc">{projects.length === 0 ? 'Create your first project to get started' : 'Try a different status or client filter'}</div>
            {projects.length === 0 && (
              <div style={{ marginTop: 16 }}>
                <Button variant="primary" icon={<Plus size={15} />} onClick={openNewModal}>New Project</Button>
              </div>
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Client</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Documents</th>
                <th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{project.name}</div>
                    {project.description && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2, maxWidth: 240 }} className="truncate">
                        {project.description}
                      </div>
                    )}
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                    {getClientName(project.client_id)}
                  </td>
                  <td>
                    <Badge variant={statusVariantMap[project.status]} dot>
                      {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </Badge>
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontSize: 'var(--text-sm)' }}>
                    {formatDate(project.start_date)}
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontSize: 'var(--text-sm)' }}>
                    {formatDate(project.end_date)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FileText size={12} style={{ color: 'var(--color-text-muted)' }} />
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                        {docCounts[project.id] || 0}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-btn" title="Edit" onClick={() => openEditModal(project)}>
                        <Edit2 size={13} />
                      </button>
                      <button className="action-btn action-btn-danger" title="Delete" onClick={() => setDeleteTarget(project)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editTarget ? 'Edit Project' : 'New Project'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {editTarget ? 'Save Changes' : 'Create Project'}
            </Button>
          </>
        }
      >
        <div className="project-form">
          <div className="input-wrapper">
            <label className="input-label">Client</label>
            <select
              className="projects-select projects-select-full"
              value={formData.client_id}
              onChange={field('client_id')}
            >
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>
          <Input
            label="Project Name"
            placeholder="Website Redesign"
            value={formData.name}
            onChange={field('name') as React.ChangeEventHandler<HTMLInputElement>}
            required
          />
          <TextArea
            label="Description"
            placeholder="Brief description of the project..."
            value={formData.description}
            onChange={field('description') as React.ChangeEventHandler<HTMLTextAreaElement>}
            rows={2}
          />
          <div className="input-wrapper">
            <label className="input-label">Status</label>
            <select className="projects-select projects-select-full" value={formData.status} onChange={field('status')}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="project-form-row">
            <Input
              label="Start Date"
              type="date"
              value={formData.start_date}
              onChange={field('start_date') as React.ChangeEventHandler<HTMLInputElement>}
            />
            <Input
              label="End Date"
              type="date"
              value={formData.end_date}
              onChange={field('end_date') as React.ChangeEventHandler<HTMLInputElement>}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Project"
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

export default ProjectsPage;
