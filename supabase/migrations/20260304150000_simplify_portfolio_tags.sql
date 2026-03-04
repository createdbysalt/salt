-- ============================================================================
-- SIMPLIFY DEFAULT PORTFOLIO TAGS
-- ============================================================================
-- Remove industry-specific defaults and keep universal project types

-- Remove niche/industry tags that don't apply to all studios
DELETE FROM studio_portfolio_tags
WHERE studio_id IS NULL
  AND name IN (
    'Retainer',
    'One-time',
    'Nonprofit',
    'SaaS',
    'Local Business',
    'Church',
    'Restaurant',
    'Healthcare',
    'Real Estate'
  );

-- Add universal project type tags if they don't exist
INSERT INTO studio_portfolio_tags (studio_id, name, is_default)
VALUES
  (NULL, 'App', true),
  (NULL, 'Marketing', true)
ON CONFLICT (studio_id, name) DO NOTHING;
