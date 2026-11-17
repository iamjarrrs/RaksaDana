ALTER TABLE public.weekly_budgets
    ADD COLUMN period_type TEXT NOT NULL DEFAULT 'weekly'
    CHECK (period_type IN ('daily', 'weekly', 'monthly'));

ALTER TABLE public.weekly_budgets
    DROP CONSTRAINT weekly_budgets_user_week_unique;

ALTER TABLE public.weekly_budgets
    ADD CONSTRAINT weekly_budgets_user_period_unique
    UNIQUE (user_id, period_type, week_start);

CREATE TABLE public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    budget_period_type TEXT NOT NULL DEFAULT 'weekly'
        CHECK (budget_period_type IN ('daily', 'weekly', 'monthly'))
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;

CREATE POLICY "Users can manage their own settings"
    ON public.user_settings FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

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
