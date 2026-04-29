import { getDB } from '../database/index';
import type { Transaction, FinanceSummary, AddExpenseData } from '../../shared/types';

export function getTransactions(filters: { type?: string; year?: number; month?: number; business_id?: number } = {}): Transaction[] {
  let query = `
    SELECT t.*, b.name as business_name
    FROM transactions t
    LEFT JOIN businesses b ON t.business_id = b.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (filters.type) { query += ' AND t.type = ?'; params.push(filters.type); }
  if (filters.year) { query += " AND strftime('%Y', t.date) = ?"; params.push(String(filters.year)); }
  if (filters.month) { query += " AND strftime('%m', t.date) = ?"; params.push(String(filters.month).padStart(2, '0')); }
  if (filters.business_id) { query += ' AND t.business_id = ?'; params.push(filters.business_id); }

  query += ' ORDER BY t.date DESC, t.created_at DESC';
  return getDB().prepare(query).all(...params) as Transaction[];
}

export function addExpense(data: AddExpenseData): Transaction {
  const db = getDB();
  const result = db.prepare('INSERT INTO transactions (business_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?)').run(data.business_id, 'expense', data.amount, data.description, data.date);
  const row = db.prepare(`
    SELECT t.*, b.name as business_name
    FROM transactions t
    LEFT JOIN businesses b ON t.business_id = b.id
    WHERE t.id = ?
  `).get(result.lastInsertRowid) as Transaction;
  return row;
}

export function deleteTransaction(id: number): void {
  getDB().prepare('DELETE FROM transactions WHERE id = ?').run(id);
}

export function getFinanceSummary(year?: number): FinanceSummary {
  const db = getDB();
  const y = year || new Date().getFullYear();
  const yearStr = String(y);

  const revenue = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'revenue' AND strftime('%Y', date) = ?").get(yearStr) as { total: number };
  const expenses = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND strftime('%Y', date) = ?").get(yearStr) as { total: number };

  const invoiceCounts = db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid, SUM(CASE WHEN status = 'unpaid' THEN 1 ELSE 0 END) as unpaid FROM invoices WHERE strftime('%Y', date) = ?").get(yearStr) as { total: number; paid: number; unpaid: number };

  const monthlyRows = db.prepare(`
    SELECT
      strftime('%Y-%m', date) as month,
      SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END) as revenue,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
    FROM transactions
    WHERE strftime('%Y', date) = ?
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month
  `).all(yearStr) as { month: string; revenue: number; expenses: number }[];

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const allMonths = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    const key = `${yearStr}-${m}`;
    const found = monthlyRows.find((r) => r.month === key);
    return {
      month: monthNames[i],
      revenue: found?.revenue || 0,
      expenses: found?.expenses || 0,
      profit: (found?.revenue || 0) - (found?.expenses || 0),
    };
  });

  return {
    total_revenue: revenue.total,
    total_expenses: expenses.total,
    net_profit: revenue.total - expenses.total,
    invoice_count: invoiceCounts.total,
    paid_count: invoiceCounts.paid,
    unpaid_count: invoiceCounts.unpaid,
    monthly_data: allMonths,
  };
}
