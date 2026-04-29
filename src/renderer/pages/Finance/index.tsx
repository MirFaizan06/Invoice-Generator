import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { StatCard } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input, TextArea } from '../../components/UI/Input';
import { Modal } from '../../components/UI/Modal';
import { Badge } from '../../components/UI/Badge';
import { useBusinessStore } from '../../store/business.store';
import { useAppStore } from '../../store/app.store';
import type { FinanceSummary, Transaction } from '@shared/types';
import './Finance.css';

const COLORS = { revenue: '#10B981', expense: '#EF4444', profit: '#2563EB' };

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow-md)', fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.fill, display: 'inline-block' }} />
          <span style={{ color: 'var(--color-text-secondary)' }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>₹{(p.value || 0).toLocaleString('en-IN')}</span>
        </div>
      ))}
    </div>
  );
};

export const FinancePage: React.FC = () => {
  const { activeBusiness } = useBusinessStore();
  const addToast = useAppStore((s) => s.addToast);
  const [year, setYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });
  const [expenseLoading, setExpenseLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        window.electronAPI.finance.getSummary(year),
        window.electronAPI.finance.getTransactions({ year }),
      ]);
      setSummary(s);
      setTransactions(t);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const handleAddExpense = async () => {
    if (!activeBusiness) return;
    if (!expenseForm.amount || !expenseForm.description) {
      addToast({ type: 'error', title: 'Please fill all fields' });
      return;
    }
    setExpenseLoading(true);
    try {
      await window.electronAPI.finance.addExpense({
        business_id: activeBusiness.id,
        amount: parseFloat(expenseForm.amount),
        description: expenseForm.description,
        date: expenseForm.date,
      });
      addToast({ type: 'success', title: 'Expense recorded' });
      setShowExpenseModal(false);
      setExpenseForm({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });
      load();
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to add expense' });
    } finally {
      setExpenseLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    await window.electronAPI.finance.deleteTransaction(id);
    addToast({ type: 'success', title: 'Transaction deleted' });
    load();
  };

  const pieData = summary ? [
    { name: 'Revenue', value: summary.total_revenue },
    { name: 'Expenses', value: summary.total_expenses },
  ] : [];

  const profitPercent = summary && summary.total_revenue > 0
    ? Math.round((summary.net_profit / summary.total_revenue) * 100)
    : 0;

  return (
    <div className="page-content finance-page page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Finance Dashboard</h1>
          <div className="finance-year-nav">
            <button className="finance-year-btn" onClick={() => setYear((y) => y - 1)}><ChevronLeft size={14} /></button>
            <span className="finance-year-label">{year}</span>
            <button className="finance-year-btn" onClick={() => setYear((y) => y + 1)} disabled={year >= new Date().getFullYear()}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowExpenseModal(true)}>
          Add Expense
        </Button>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Revenue" value={`₹${(summary?.total_revenue || 0).toLocaleString('en-IN')}`} icon={<TrendingUp size={18} />} color="green" />
        <StatCard label="Total Expenses" value={`₹${(summary?.total_expenses || 0).toLocaleString('en-IN')}`} icon={<TrendingDown size={18} />} color="red" />
        <StatCard label="Net Profit" value={`₹${(summary?.net_profit || 0).toLocaleString('en-IN')}`} sub={`${profitPercent}% margin`} icon={<DollarSign size={18} />} color="blue" />
        <StatCard label="Paid Invoices" value={`${summary?.paid_count || 0}/${summary?.invoice_count || 0}`} sub={`${summary?.unpaid_count || 0} pending`} icon={<TrendingUp size={18} />} color="purple" />
      </div>

      <div className="finance-charts">
        <div className="finance-chart-card" style={{ flex: 2 }}>
          <div className="finance-chart-header">
            <h3 className="finance-chart-title">Monthly Overview</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={summary?.monthly_data || []} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Revenue" fill={COLORS.revenue} radius={[3, 3, 0, 0]} maxBarSize={20} />
              <Bar dataKey="expenses" name="Expenses" fill={COLORS.expense} radius={[3, 3, 0, 0]} maxBarSize={20} />
              <Bar dataKey="profit" name="Profit" fill={COLORS.profit} radius={[3, 3, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="finance-chart-card" style={{ flex: 1 }}>
          <div className="finance-chart-header">
            <h3 className="finance-chart-title">Revenue Split</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                <Cell fill={COLORS.revenue} />
                <Cell fill={COLORS.expense} />
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transactions */}
      <div className="finance-transactions">
        <div className="finance-section-header">
          <h3 className="finance-section-title">Transactions · {year}</h3>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{transactions.length} entries</span>
        </div>
        <div className="finance-transactions-list">
          {loading ? (
            <div className="empty-state"><div className="animate-pulse text-muted text-sm">Loading...</div></div>
          ) : transactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No transactions for {year}</div>
              <div className="empty-state-desc">Create invoices and mark them as paid to track revenue</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th className="text-right">Amount</th>
                  <th style={{ width: 50 }} />
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>{new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                    <td>{t.description}</td>
                    <td>
                      <Badge variant={t.type === 'revenue' ? 'success' : 'danger'} dot>
                        {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                      </Badge>
                    </td>
                    <td className="text-right" style={{ fontWeight: 600, color: t.type === 'revenue' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {t.type === 'revenue' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                    </td>
                    <td>
                      {t.type === 'expense' && (
                        <button className="action-btn action-btn-danger" onClick={() => handleDeleteTransaction(t.id)}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        title="Add Expense"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowExpenseModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAddExpense} loading={expenseLoading}>Add Expense</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Amount (₹)" type="number" min="0" step="1" placeholder="5000" value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} />
          <TextArea label="Description" placeholder="Office supplies, software license, etc." value={expenseForm.description} onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
          <Input label="Date" type="date" value={expenseForm.date} onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
};
