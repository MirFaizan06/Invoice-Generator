import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, FileText, CheckCircle, Clock, FilePlus, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { StatCard } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { useBusinessStore } from '../../store/business.store';
import type { FinanceSummary, Invoice } from '@shared/types';
import './Dashboard.css';

function formatINR(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow-md)', fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--color-text)' }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: 'var(--color-text-secondary)' }}>{p.name}:</span>
          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>₹{p.value.toLocaleString('en-IN')}</span>
        </div>
      ))}
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeBusiness } = useBusinessStore();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, invoices] = await Promise.all([
        window.electronAPI.finance.getSummary(year),
        window.electronAPI.invoice.getAll({ sortBy: 'date', sortOrder: 'desc' }),
      ]);
      setSummary(s);
      setRecentInvoices(invoices.slice(0, 5));
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const chartData = summary?.monthly_data || [];
  const pending = summary ? summary.invoice_count - summary.paid_count : 0;

  return (
    <div className="page-content dashboard-page page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {activeBusiness?.name} · {year} Overview
          </p>
        </div>
        <Button variant="primary" icon={<FilePlus size={15} />} onClick={() => navigate('/create-invoice')}>
          New Invoice
        </Button>
      </div>

      <div className="stats-grid">
        <StatCard
          label="Total Revenue"
          value={formatINR(summary?.total_revenue || 0)}
          sub={`${year}`}
          icon={<TrendingUp size={18} />}
          color="blue"
        />
        <StatCard
          label="Total Invoices"
          value={String(summary?.invoice_count || 0)}
          icon={<FileText size={18} />}
          color="purple"
        />
        <StatCard
          label="Paid Invoices"
          value={String(summary?.paid_count || 0)}
          icon={<CheckCircle size={18} />}
          color="green"
        />
        <StatCard
          label="Pending"
          value={String(pending)}
          sub={pending > 0 ? `₹${((summary?.total_revenue || 0) * 0.1).toFixed(0)} est.` : 'All clear'}
          icon={<Clock size={18} />}
          color="orange"
        />
      </div>

      <div className="dashboard-charts">
        <div className="dashboard-chart-card">
          <div className="dashboard-chart-header">
            <h3 className="dashboard-chart-title">Revenue vs Expenses</h3>
            <span className="dashboard-chart-sub">Monthly · {year}</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="grad-revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-expenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#2563EB" strokeWidth={2} fill="url(#grad-revenue)" />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#EF4444" strokeWidth={2} fill="url(#grad-expenses)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-chart-card">
          <div className="dashboard-chart-header">
            <h3 className="dashboard-chart-title">Profit by Month</h3>
            <span className="dashboard-chart-sub">Net Profit · {year}</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="profit" name="Profit" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dashboard-recent">
        <div className="dashboard-section-header">
          <h3 className="dashboard-section-title">Recent Invoices</h3>
          <Button variant="ghost" size="sm" iconRight={<ArrowRight size={14} />} onClick={() => navigate('/history')}>
            View All
          </Button>
        </div>
        <div className="dashboard-invoices-table">
          {loading ? (
            <div className="empty-state">
              <div className="animate-pulse text-muted text-sm">Loading...</div>
            </div>
          ) : recentInvoices.length === 0 ? (
            <div className="empty-state">
              <FileText className="empty-state-icon" />
              <div className="empty-state-title">No invoices yet</div>
              <div className="empty-state-desc">Create your first invoice to get started</div>
              <Button variant="primary" size="sm" icon={<FilePlus size={14} />} onClick={() => navigate('/create-invoice')} style={{ marginTop: 8 }}>
                Create Invoice
              </Button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Project</th>
                  <th>Date</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/invoice/${inv.id}`)}>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{inv.invoice_number}</span></td>
                    <td style={{ fontWeight: 500 }}>{inv.client_name}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{inv.project_name}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                    <td className="text-right" style={{ fontWeight: 600 }}>₹{inv.total.toLocaleString('en-IN')}</td>
                    <td>
                      <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'cancelled' ? 'default' : 'warning'} dot>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
