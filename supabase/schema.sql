-- ==============================================================================
-- RAKSADANA - SKEMA DATABASE, SQL VIEWS & ROW LEVEL SECURITY (RLS)
-- Versi: 1.0 (MVP) - Sesuai PRD Final RaksaDana
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL: CATEGORIES (Master Kategori Kantong & Pengeluaran)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'EXPENSE' CHECK (type IN ('EXPENSE', 'DEBT_PAYMENT', 'SAVINGS')),
    color TEXT DEFAULT '#4F46E5', -- Hex color untuk badge visual
    icon TEXT DEFAULT 'tag',       -- Nama ikon Lucide
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT categories_user_name_unique UNIQUE (user_id, name)
);

-- 3. TABEL: WEEKLY_BUDGETS (Header Siklus Anggaran)
CREATE TABLE IF NOT EXISTS public.weekly_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL, -- Awal periode harian, mingguan, atau bulanan
    period_type TEXT NOT NULL DEFAULT 'weekly' CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    income NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (income >= 0),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT weekly_budgets_user_period_unique UNIQUE (user_id, period_type, week_start)
);

CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    budget_period_type TEXT NOT NULL DEFAULT 'weekly'
        CHECK (budget_period_type IN ('daily', 'weekly', 'monthly'))
);

-- 4. TABEL: ENVELOPES (Alokasi Dana per Kategori dalam Satu Periode)
CREATE TABLE IF NOT EXISTS public.envelopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    weekly_budget_id UUID NOT NULL REFERENCES public.weekly_budgets(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    allocated NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (allocated >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT envelopes_budget_category_unique UNIQUE (weekly_budget_id, category_id)
);

-- 5. TABEL: DEBTS (Header Daftar Utang)
CREATE TABLE IF NOT EXISTS public.debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    creditor TEXT NOT NULL,
    principal NUMERIC(14, 2) NOT NULL CHECK (principal > 0),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. TABEL: DEBT_ADJUSTMENTS (Riwayat Penambahan Pokok / Koreksi Utang)
CREATE TABLE IF NOT EXISTS public.debt_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    delta NUMERIC(14, 2) NOT NULL, -- Positif untuk top-up, negatif untuk pengurangan/diskon
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. TABEL: DEBT_TARGETS (Target Pelunasan Bertahap: 0..N per Utang)
CREATE TABLE IF NOT EXISTS public.debt_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC(14, 2) NOT NULL CHECK (target_amount > 0),
    deadline DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. TABEL: TRANSACTIONS (Buku Besar / Ledger Transaksi)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    week_code TEXT NOT NULL, -- Format ISO, misal '2026-W47'
    type TEXT NOT NULL CHECK (type IN ('EXPENSE', 'INCOME', 'DEBT_PAYMENT')),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    debt_id UUID REFERENCES public.debts(id) ON DELETE SET NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 9. INDEKS UNTUK PERFORMA
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_budgets_user_date ON public.weekly_budgets(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_envelopes_budget ON public.envelopes(weekly_budget_id);
CREATE INDEX IF NOT EXISTS idx_envelopes_category ON public.envelopes(category_id);
CREATE INDEX IF NOT EXISTS idx_debts_user_archived ON public.debts(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_debt_adjustments_debt ON public.debt_adjustments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_targets_debt ON public.debt_targets(debt_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_week_code ON public.transactions(user_id, week_code);
CREATE INDEX IF NOT EXISTS idx_transactions_debt ON public.transactions(debt_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);

-- ==============================================================================
-- 10. POSTGRESQL VIEWS (SINGLE SOURCE OF TRUTH)
-- ==============================================================================

-- 10.1 View Status Kantong per Periode
CREATE OR REPLACE VIEW public.v_envelope_status
WITH (security_invoker = true) AS
SELECT
    e.id AS envelope_id,
    e.user_id,
    e.weekly_budget_id,
    wb.week_start,
    CASE wb.period_type
        WHEN 'daily' THEN wb.week_start
        WHEN 'monthly' THEN (date_trunc('month', wb.week_start::timestamp) + INTERVAL '1 month - 1 day')::date
        ELSE wb.week_start + 6
    END AS week_end,
    e.category_id,
    c.name AS category_name,
    c.type AS category_type,
    c.color AS category_color,
    c.icon AS category_icon,
    e.allocated,
    COALESCE(t_agg.spent, 0) AS spent,
    (e.allocated - COALESCE(t_agg.spent, 0)) AS remaining,
    CASE
        WHEN COALESCE(t_agg.spent, 0) > e.allocated THEN 'OVERBUDGET'
        WHEN COALESCE(t_agg.spent, 0) = e.allocated AND e.allocated > 0 THEN 'HABIS'
        ELSE 'AMAN'
    END AS status,
    CASE 
        WHEN e.allocated > 0 THEN ROUND((COALESCE(t_agg.spent, 0) / e.allocated) * 100.0, 2)
        ELSE 0 
    END AS spent_percentage,
    wb.period_type
FROM public.envelopes e
JOIN public.weekly_budgets wb ON wb.id = e.weekly_budget_id
JOIN public.categories c ON c.id = e.category_id
LEFT JOIN (
    SELECT 
        t.user_id,
        t.category_id,
        wb2.id AS weekly_budget_id,
        SUM(t.amount) AS spent
    FROM public.transactions t
    JOIN public.weekly_budgets wb2 
      ON wb2.user_id = t.user_id 
     AND t.date >= wb2.week_start 
      AND t.date <= CASE wb2.period_type
         WHEN 'daily' THEN wb2.week_start
         WHEN 'monthly' THEN (date_trunc('month', wb2.week_start::timestamp) + INTERVAL '1 month - 1 day')::date
         ELSE wb2.week_start + 6
      END
    WHERE t.type IN ('EXPENSE', 'DEBT_PAYMENT')
    GROUP BY t.user_id, t.category_id, wb2.id
) t_agg ON t_agg.weekly_budget_id = e.weekly_budget_id AND t_agg.category_id = e.category_id;

-- 10.2 View Ringkasan Anggaran per Periode
CREATE OR REPLACE VIEW public.v_weekly_budget_summary
WITH (security_invoker = true) AS
SELECT
    wb.id AS weekly_budget_id,
    wb.user_id,
    wb.week_start,
    CASE wb.period_type
        WHEN 'daily' THEN wb.week_start
        WHEN 'monthly' THEN (date_trunc('month', wb.week_start::timestamp) + INTERVAL '1 month - 1 day')::date
        ELSE wb.week_start + 6
    END AS week_end,
    wb.income,
    COALESCE(env.total_allocated, 0) AS total_allocated,
    (wb.income - COALESCE(env.total_allocated, 0)) AS unallocated_cash,
    COALESCE(tx.total_spent, 0) AS total_spent,
    (wb.income - COALESCE(tx.total_spent, 0)) AS net_balance,
    wb.note,
    wb.created_at,
    wb.period_type
FROM public.weekly_budgets wb
LEFT JOIN (
    SELECT weekly_budget_id, SUM(allocated) AS total_allocated
    FROM public.envelopes
    GROUP BY weekly_budget_id
) env ON env.weekly_budget_id = wb.id
LEFT JOIN (
    SELECT 
        wb_inner.id AS weekly_budget_id,
        SUM(t.amount) AS total_spent
    FROM public.weekly_budgets wb_inner
    JOIN public.transactions t 
      ON t.user_id = wb_inner.user_id
     AND t.date >= wb_inner.week_start
      AND t.date <= CASE wb_inner.period_type
         WHEN 'daily' THEN wb_inner.week_start
         WHEN 'monthly' THEN (date_trunc('month', wb_inner.week_start::timestamp) + INTERVAL '1 month - 1 day')::date
         ELSE wb_inner.week_start + 6
      END
     AND t.type IN ('EXPENSE', 'DEBT_PAYMENT')
    GROUP BY wb_inner.id
) tx ON tx.weekly_budget_id = wb.id;

-- 10.3 View Ringkasan Pelacak Utang (Debt Summary)
CREATE OR REPLACE VIEW public.v_debt_summary
WITH (security_invoker = true) AS
SELECT
    d.id AS debt_id,
    d.user_id,
    d.creditor,
    d.principal,
    COALESCE(adj.total_delta, 0) AS adjustments_total,
    (d.principal + COALESCE(adj.total_delta, 0)) AS effective_principal,
    COALESCE(pay.total_paid, 0) AS total_paid,
    GREATEST(0, (d.principal + COALESCE(adj.total_delta, 0)) - COALESCE(pay.total_paid, 0)) AS remaining_debt,
    CASE 
        WHEN (d.principal + COALESCE(adj.total_delta, 0)) > 0 THEN
            LEAST(100.0, ROUND((COALESCE(pay.total_paid, 0) / (d.principal + COALESCE(adj.total_delta, 0))) * 100.0, 2))
        ELSE 100.0
    END AS progress_percentage,
    CASE
        WHEN d.is_archived = true THEN 'DIARSIPKAN'
        WHEN ((d.principal + COALESCE(adj.total_delta, 0)) - COALESCE(pay.total_paid, 0)) <= 0 THEN 'LUNAS'
        ELSE 'AKTIF'
    END AS status,
    d.start_date,
    d.is_archived,
    d.note,
    d.created_at
FROM public.debts d
LEFT JOIN (
    SELECT debt_id, SUM(delta) AS total_delta
    FROM public.debt_adjustments
    GROUP BY debt_id
) adj ON adj.debt_id = d.id
LEFT JOIN (
    SELECT debt_id, SUM(amount) AS total_paid
    FROM public.transactions
    WHERE type = 'DEBT_PAYMENT' AND debt_id IS NOT NULL
    GROUP BY debt_id
) pay ON pay.debt_id = d.id;

-- 10.4 View Progres Target Utang (Debt Targets Progress)
CREATE OR REPLACE VIEW public.v_debt_target_progress
WITH (security_invoker = true) AS
SELECT
    dt.id AS target_id,
    dt.user_id,
    dt.debt_id,
    dt.name AS target_name,
    dt.target_amount,
    dt.deadline,
    ds.total_paid AS debt_total_paid,
    LEAST(dt.target_amount, ds.total_paid) AS paid_towards_target,
    GREATEST(0, dt.target_amount - ds.total_paid) AS remaining_towards_target,
    CASE 
        WHEN ds.total_paid >= dt.target_amount THEN true 
        ELSE false 
    END AS is_reached,
    CASE 
        WHEN dt.target_amount > 0 THEN
            LEAST(100.0, ROUND((LEAST(dt.target_amount, ds.total_paid) / dt.target_amount) * 100.0, 2))
        ELSE 100.0
    END AS progress_percentage,
    dt.created_at
FROM public.debt_targets dt
JOIN public.v_debt_summary ds ON ds.debt_id = dt.debt_id;

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Aktifkan RLS di seluruh tabel
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.envelopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;

-- Policy categories
CREATE POLICY "Users can manage their own categories"
    ON public.categories FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy weekly_budgets
CREATE POLICY "Users can manage their own weekly budgets"
    ON public.weekly_budgets FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy envelopes
CREATE POLICY "Users can manage their own envelopes"
    ON public.envelopes FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy debts
CREATE POLICY "Users can manage their own debts"
    ON public.debts FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy debt_adjustments
CREATE POLICY "Users can manage their own debt adjustments"
    ON public.debt_adjustments FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy debt_targets
CREATE POLICY "Users can manage their own debt targets"
    ON public.debt_targets FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy transactions
CREATE POLICY "Users can manage their own transactions"
    ON public.transactions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own settings"
    ON public.user_settings FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Reset only the caller's financial data atomically, while retaining their auth account.
CREATE OR REPLACE FUNCTION public.reset_user_financial_data(p_confirmation TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
    requesting_user_id UUID := auth.uid();
BEGIN
    IF requesting_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
    END IF;

    IF p_confirmation IS DISTINCT FROM 'RESET' THEN
        RAISE EXCEPTION 'Confirmation phrase is invalid' USING ERRCODE = '22023';
    END IF;

    DELETE FROM public.transactions WHERE user_id = requesting_user_id;
    DELETE FROM public.envelopes WHERE user_id = requesting_user_id;
    DELETE FROM public.weekly_budgets WHERE user_id = requesting_user_id;
    DELETE FROM public.debt_targets WHERE user_id = requesting_user_id;
    DELETE FROM public.debt_adjustments WHERE user_id = requesting_user_id;
    DELETE FROM public.debts WHERE user_id = requesting_user_id;
    DELETE FROM public.categories WHERE user_id = requesting_user_id;
    DELETE FROM public.user_settings WHERE user_id = requesting_user_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.reset_user_financial_data(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_user_financial_data(TEXT) TO authenticated;
