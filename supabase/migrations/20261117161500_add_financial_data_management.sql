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
END;
$function$;

REVOKE ALL ON FUNCTION public.reset_user_financial_data(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_user_financial_data(TEXT) TO authenticated;
