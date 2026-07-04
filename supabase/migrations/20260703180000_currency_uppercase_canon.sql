-- ============================================================================
-- CURRENCY CANON: UPPERCASE ISO-4217, REGISTRY 10-VALUE SET
-- (keeper-field-contracts decision table — the deferred half of Phase 3.3)
-- ============================================================================
--
-- Lands together with the code switch (billing zod + selects move to the
-- uppercase registry set in the same PR — a mixed-case interim would break
-- writes, which is why this was deferred until now).
--
-- Tables with lowercase currency data/CHECKs: billing_records,
-- billing_payments, meeting_types. proposals already stores uppercase (its
-- CHECK widens to the 10-value canon). projects.currency and
-- workspaces.default_currency are unconstrained TEXT already holding
-- uppercase codes — they gain the canon CHECK too.
-- ============================================================================

CREATE OR REPLACE FUNCTION pg_temp.drop_column_checks(p_table regclass, p_column text)
RETURNS void AS $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = p_table
      AND con.contype = 'c'
      AND EXISTS (
        SELECT 1 FROM unnest(con.conkey) AS k
        JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k
        WHERE a.attname = p_column
      )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', p_table, c.conname);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- billing_records
-- ----------------------------------------------------------------------------
SELECT pg_temp.drop_column_checks('public.billing_records', 'currency');
UPDATE public.billing_records SET currency = upper(currency) WHERE currency <> upper(currency);
ALTER TABLE public.billing_records
  ALTER COLUMN currency SET DEFAULT 'USD',
  ADD CONSTRAINT billing_records_currency_check CHECK (
    currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY', 'SGD', 'NZD', 'INR')
  );

-- ----------------------------------------------------------------------------
-- billing_payments
-- ----------------------------------------------------------------------------
SELECT pg_temp.drop_column_checks('public.billing_payments', 'currency');
UPDATE public.billing_payments SET currency = upper(currency) WHERE currency <> upper(currency);
ALTER TABLE public.billing_payments
  ALTER COLUMN currency SET DEFAULT 'USD',
  ADD CONSTRAINT billing_payments_currency_check CHECK (
    currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY', 'SGD', 'NZD', 'INR')
  );

-- ----------------------------------------------------------------------------
-- meeting_types (Cal.com pricing)
-- ----------------------------------------------------------------------------
SELECT pg_temp.drop_column_checks('public.meeting_types', 'currency');
UPDATE public.meeting_types SET currency = upper(currency)
  WHERE currency IS NOT NULL AND currency <> upper(currency);
ALTER TABLE public.meeting_types
  ADD CONSTRAINT meeting_types_currency_check CHECK (
    currency IS NULL OR currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY', 'SGD', 'NZD', 'INR')
  );

-- ----------------------------------------------------------------------------
-- proposals (already uppercase 5 — widen to canon)
-- ----------------------------------------------------------------------------
SELECT pg_temp.drop_column_checks('public.proposals', 'currency');
ALTER TABLE public.proposals
  ADD CONSTRAINT proposals_currency_check CHECK (
    currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY', 'SGD', 'NZD', 'INR')
  );

-- ----------------------------------------------------------------------------
-- projects + workspaces + project_files (unconstrained TEXT gains the canon)
-- ----------------------------------------------------------------------------
UPDATE public.projects SET currency = upper(currency)
  WHERE currency IS NOT NULL AND currency <> upper(currency);
ALTER TABLE public.projects
  ADD CONSTRAINT projects_currency_check CHECK (
    currency IS NULL OR currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY', 'SGD', 'NZD', 'INR')
  );

UPDATE public.workspaces SET default_currency = upper(default_currency)
  WHERE default_currency IS NOT NULL AND default_currency <> upper(default_currency);
ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_default_currency_check CHECK (
    default_currency IS NULL OR default_currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY', 'SGD', 'NZD', 'INR')
  );

UPDATE public.project_files SET currency = upper(currency)
  WHERE currency IS NOT NULL AND currency <> upper(currency);
ALTER TABLE public.project_files
  ADD CONSTRAINT project_files_currency_check CHECK (
    currency IS NULL OR currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY', 'SGD', 'NZD', 'INR')
  );
