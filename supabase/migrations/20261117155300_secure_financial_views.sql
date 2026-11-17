ALTER VIEW public.v_envelope_status
    SET (security_invoker = true);

ALTER VIEW public.v_weekly_budget_summary
    SET (security_invoker = true);

ALTER VIEW public.v_debt_summary
    SET (security_invoker = true);

ALTER VIEW public.v_debt_target_progress
    SET (security_invoker = true);
