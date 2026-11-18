import { 
  Category, 
  BudgetPeriod,
  Envelope, 
  Debt, 
  DebtAdjustment, 
  Transaction,
  ViewEnvelopeStatus,
  ViewBudgetPeriodSummary,
  ViewDebtSummary,
  ViewDebtTargetProgress,
  IncomeBreakdown
} from '../types/database';
import { supabase } from '../lib/supabase';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { BudgetPeriodType } from '../types/database';

// Helper ISO Week Code (e.g. 2026-W47)
export const getISOWeekCode = (date: Date = new Date()): string => {
  return format(date, "yyyy-'W'II");
};

// Helper ISO Monday Date string (YYYY-MM-DD)
export const getMondayDateString = (date: Date = new Date()): string => {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return format(monday, 'yyyy-MM-dd');
};

export const getPeriodStartDate = (date: Date, periodType: BudgetPeriodType): string => {
  if (periodType === 'daily') return format(date, 'yyyy-MM-dd');
  if (periodType === 'monthly') return format(startOfMonth(date), 'yyyy-MM-dd');
  return getMondayDateString(date);
};

export const getPeriodEndDate = (periodStart: string, periodType: BudgetPeriodType): string => {
  const start = parseISO(periodStart);
  if (periodType === 'daily') return format(start, 'yyyy-MM-dd');
  if (periodType === 'monthly') return format(endOfMonth(start), 'yyyy-MM-dd');
  return format(addDays(start, 6), 'yyyy-MM-dd');
};

export const shiftPeriodStartDate = (
  periodStart: string,
  periodType: BudgetPeriodType,
  amount: number
): string => {
  const start = parseISO(periodStart);
  if (periodType === 'daily') return getPeriodStartDate(addDays(start, amount), periodType);
  if (periodType === 'monthly') return getPeriodStartDate(addMonths(start, amount), periodType);
  return getPeriodStartDate(addWeeks(start, amount), periodType);
};

// Format Rupiah
export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
};

// ==============================================================================
// PURE SUPABASE DATA SERVICE (ZERO HARDCODED DATA, PRODUCTION READY)
// ==============================================================================
export const parseIncomeBreakdown = (note: string | null | undefined, totalIncome: number): IncomeBreakdown => {
  if (note) {
    try {
      const parsed = JSON.parse(note);
      if (parsed && typeof parsed === 'object') {
        const cash = typeof parsed.cash === 'number' ? parsed.cash : (parseFloat(parsed.cash) || 0);
        const emoney = Array.isArray(parsed.emoney)
          ? parsed.emoney.map((item: any, idx: number) => ({
              id: item.id || `emoney-${idx}-${Date.now()}`,
              name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : `E-Money ${idx + 1}`,
              amount: typeof item.amount === 'number' ? item.amount : (parseFloat(item.amount) || 0),
            }))
          : [];
        return { cash, emoney };
      }
    } catch {
      // note is not JSON
    }
  }

  return {
    cash: totalIncome || 0,
    emoney: [],
  };
};

export const serializeIncomeBreakdown = (breakdown: IncomeBreakdown): string => {
  return JSON.stringify({
    version: 1,
    cash: Math.max(0, breakdown.cash),
    emoney: breakdown.emoney.map(item => ({
      id: item.id,
      name: item.name.trim(),
      amount: Math.max(0, item.amount),
    })),
  });
};

export interface ParsedTransactionNote {
  source: string | null;
  note: string;
}

export const parseTransactionNote = (rawNote: string | null | undefined): ParsedTransactionNote => {
  if (!rawNote) return { source: null, note: '' };

  const trimmed = rawNote.trim();
  const bracketMatch = trimmed.match(/^\[(.*?)\](?:\s*(.*))?$/s);
  if (bracketMatch) {
    return {
      source: bracketMatch[1].trim(),
      note: (bracketMatch[2] || '').trim(),
    };
  }

  return { source: null, note: trimmed };
};

export const formatTransactionNote = (
  source: string | null | undefined,
  userNote: string | null | undefined
): string | null => {
  const cleanNote = (userNote || '').trim();
  const cleanSource = (source || '').trim();
  if (cleanSource) {
    return cleanNote ? `[${cleanSource}] ${cleanNote}` : `[${cleanSource}]`;
  }
  return cleanNote || null;
};

export class DataService {

  static async getBudgetPeriodType(): Promise<BudgetPeriodType> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Pengguna belum login.');

    const { data, error } = await supabase
      .from('user_settings')
      .select('budget_period_type')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;

    const periodType = data?.budget_period_type;
    if (periodType === 'daily' || periodType === 'weekly' || periodType === 'monthly') {
      return periodType;
    }
    if (periodType == null) return 'weekly';
    throw new Error('Siklus anggaran tersimpan tidak valid.');
  }

  static async setBudgetPeriodType(periodType: BudgetPeriodType): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Pengguna belum login.');

    const { error } = await supabase
      .from('user_settings')
      .upsert(
        { user_id: user.id, budget_period_type: periodType },
        { onConflict: 'user_id' }
      );
    if (error) throw error;
  }

  // ----------------------------------------------------------------------------
  // CATEGORIES (CRUD F1)
  // ----------------------------------------------------------------------------
  static async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data || [];
  }

  static async createCategory(name: string, type: 'EXPENSE' | 'DEBT_PAYMENT' | 'SAVINGS', color = '#4f46e5'): Promise<Category> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Pengguna belum login.');

    const { data, error } = await supabase
      .from('categories')
      .insert({ user_id: user.id, name, type, color })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  }

  // ----------------------------------------------------------------------------
  // BUDGET PERIODS & ENVELOPES (F1)
  // ----------------------------------------------------------------------------
  static async getBudgetPeriod(periodStart: string, periodType: BudgetPeriodType): Promise<BudgetPeriod | null> {
    const { data, error } = await supabase
      .from('weekly_budgets')
      .select('*')
      .eq('week_start', periodStart)
      .eq('period_type', periodType)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async setPeriodIncome(
    periodStart: string,
    periodType: BudgetPeriodType,
    income: number,
    note?: string
  ): Promise<BudgetPeriod> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Pengguna belum login.');

    const { data, error } = await supabase
      .from('weekly_budgets')
      .upsert(
        { user_id: user.id, week_start: periodStart, period_type: periodType, income, note },
        { onConflict: 'user_id,period_type,week_start' }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async saveEnvelopeAllocation(weeklyBudgetId: string, categoryId: string, allocated: number): Promise<Envelope> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Pengguna belum login.');

    const { data, error } = await supabase
      .from('envelopes')
      .upsert(
        { user_id: user.id, weekly_budget_id: weeklyBudgetId, category_id: categoryId, allocated },
        { onConflict: 'weekly_budget_id,category_id' }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async deleteEnvelopeAllocation(envelopeId: string): Promise<void> {
    const { error } = await supabase.from('envelopes').delete().eq('id', envelopeId);
    if (error) throw error;
  }

  static async deleteBudgetPeriod(periodStart: string, periodType: BudgetPeriodType): Promise<void> {
    const { error } = await supabase
      .from('weekly_budgets')
      .delete()
      .eq('week_start', periodStart)
      .eq('period_type', periodType);
    if (error) throw error;
  }

  static async resetUserFinancialData(confirmation: string): Promise<void> {
    const { error } = await supabase.rpc('reset_user_financial_data', {
      p_confirmation: confirmation,
    });
    if (error) throw error;
  }

  // ----------------------------------------------------------------------------
  // DYNAMIC VIEWS QUERY (SINGLE SOURCE OF TRUTH)
  // ----------------------------------------------------------------------------
  static async getViewEnvelopeStatus(
    periodStart: string,
    periodType: BudgetPeriodType
  ): Promise<ViewEnvelopeStatus[]> {
    const { data, error } = await supabase
      .from('v_envelope_status')
      .select('*')
      .eq('week_start', periodStart)
      .eq('period_type', periodType);
    if (error) throw error;
    return data || [];
  }

  static async getViewBudgetPeriodSummary(
    periodStart: string,
    periodType: BudgetPeriodType
  ): Promise<ViewBudgetPeriodSummary | null> {
    const { data, error } = await supabase
      .from('v_weekly_budget_summary')
      .select('*')
      .eq('week_start', periodStart)
      .eq('period_type', periodType)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  // ----------------------------------------------------------------------------
  // TRANSACTIONS (LEDGER F2)
  // ----------------------------------------------------------------------------
  static async getTransactions(weekCode?: string): Promise<Transaction[]> {
    let query = supabase.from('transactions').select('*').order('date', { ascending: false });
    if (weekCode) query = query.eq('week_code', weekCode);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async createTransaction(tx: {
    date: string;
    type: 'EXPENSE' | 'INCOME' | 'DEBT_PAYMENT';
    category_id?: string | null;
    debt_id?: string | null;
    amount: number;
    note?: string | null;
  }): Promise<Transaction> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Pengguna belum login.');

    const txDate = new Date(tx.date);
    const week_code = getISOWeekCode(txDate);

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        date: tx.date,
        week_code,
        type: tx.type,
        category_id: tx.category_id || null,
        debt_id: tx.debt_id || null,
        amount: tx.amount,
        note: tx.note || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
  }

  // ----------------------------------------------------------------------------
  // DEBTS & ADJUSTMENTS (F3)
  // ----------------------------------------------------------------------------
  static async getDebts(): Promise<Debt[]> {
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async createDebt(creditor: string, principal: number, startDate: string, note?: string): Promise<Debt> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Pengguna belum login.');

    const { data, error } = await supabase
      .from('debts')
      .insert({
        user_id: user.id,
        creditor,
        principal,
        start_date: startDate,
        note: note || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async addDebtAdjustment(debtId: string, delta: number, reason: string): Promise<DebtAdjustment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Pengguna belum login.');

    const { data, error } = await supabase
      .from('debt_adjustments')
      .insert({
        user_id: user.id,
        debt_id: debtId,
        delta,
        reason,
        date: format(new Date(), 'yyyy-MM-dd'),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getViewDebtSummary(): Promise<ViewDebtSummary[]> {
    const { data, error } = await supabase
      .from('v_debt_summary')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async getViewDebtTargetProgress(): Promise<ViewDebtTargetProgress[]> {
    const { data, error } = await supabase
      .from('v_debt_target_progress')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async toggleArchiveDebt(debtId: string, isArchived: boolean): Promise<void> {
    const { error } = await supabase
      .from('debts')
      .update({ is_archived: isArchived })
      .eq('id', debtId);
    if (error) throw error;
  }
}
