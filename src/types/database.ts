// Types sesuai Skema Database & PostgreSQL Views RaksaDana

export type CategoryType = 'EXPENSE' | 'DEBT_PAYMENT' | 'SAVINGS';
export type TransactionType = 'EXPENSE' | 'INCOME' | 'DEBT_PAYMENT';
export type BudgetPeriodType = 'daily' | 'weekly' | 'monthly';
export type EnvelopeStatus = 'AMAN' | 'HABIS' | 'OVERBUDGET';
export type DebtStatus = 'AKTIF' | 'LUNAS' | 'DIARSIPKAN';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
  is_active: boolean;
  created_at: string;
}

export interface BudgetPeriod {
  id: string;
  user_id: string;
  week_start: string; // YYYY-MM-DD period start
  period_type: BudgetPeriodType;
  income: number;
  note?: string | null;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  budget_period_type: BudgetPeriodType;
}

export interface Envelope {
  id: string;
  user_id: string;
  weekly_budget_id: string;
  category_id: string;
  allocated: number;
  created_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  creditor: string;
  principal: number;
  start_date: string;
  is_archived: boolean;
  note?: string | null;
  created_at: string;
}

export interface DebtAdjustment {
  id: string;
  user_id: string;
  debt_id: string;
  date: string;
  delta: number;
  reason: string;
  created_at: string;
}

export interface DebtTarget {
  id: string;
  user_id: string;
  debt_id: string;
  name: string;
  target_amount: number;
  deadline?: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  date: string;
  week_code: string; // e.g. "2026-W47"
  type: TransactionType;
  category_id?: string | null;
  debt_id?: string | null;
  amount: number;
  note?: string | null;
  created_at: string;
}

// PostgreSQL Views Types (Single Source of Truth)
export interface ViewEnvelopeStatus {
  envelope_id: string;
  user_id: string;
  weekly_budget_id: string;
  week_start: string;
  week_end: string;
  category_id: string;
  category_name: string;
  category_type: CategoryType;
  category_color?: string;
  category_icon?: string;
  allocated: number;
  spent: number;
  remaining: number;
  status: EnvelopeStatus;
  spent_percentage: number;
  period_type: BudgetPeriodType;
}

export interface ViewBudgetPeriodSummary {
  weekly_budget_id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  income: number;
  total_allocated: number;
  unallocated_cash: number;
  total_spent: number;
  net_balance: number;
  note?: string | null;
  created_at: string;
  period_type: BudgetPeriodType;
}

export interface ViewDebtSummary {
  debt_id: string;
  user_id: string;
  creditor: string;
  principal: number;
  adjustments_total: number;
  effective_principal: number;
  total_paid: number;
  remaining_debt: number;
  progress_percentage: number;
  status: DebtStatus;
  start_date: string;
  is_archived: boolean;
  note?: string | null;
  created_at: string;
}

export interface ViewDebtTargetProgress {
  target_id: string;
  user_id: string;
  debt_id: string;
  target_name: string;
  target_amount: number;
  deadline?: string | null;
  debt_total_paid: number;
  paid_towards_target: number;
  remaining_towards_target: number;
  is_reached: boolean;
  progress_percentage: number;
  created_at: string;
}
