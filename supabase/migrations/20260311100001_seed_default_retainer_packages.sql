-- ============================================================================
-- Update Default Services Seed with Retainer Packages
-- ============================================================================
-- Replaces the existing retainer services with the researched 4-tier structure:
-- Care ($149), Essential ($750), Growth ($1,500), Scale ($3,500)
-- ============================================================================

-- Update the seed function to include proper retainer packages
CREATE OR REPLACE FUNCTION seed_default_services(p_studio_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO studio_services (
    studio_id, name, description, category, pricing_type,
    price_min, price_max, currency, typical_timeline, display_order, is_active,
    hours_included, response_time, rollover_hours, billing_interval, is_recommended, services_included
  ) VALUES
    -- ========================================================================
    -- RETAINER PACKAGES (Care / Essential / Growth / Scale)
    -- ========================================================================

    -- Care ($149/mo) - Lights-on maintenance, no hours
    (p_studio_id, 'Care', 'Keep your site secure, updated, and running smoothly.', 'Support', 'retainer',
     149, 149, 'USD', 'Monthly', 1, true,
     0, '48 business hours', 0, 'monthly', false,
     '["Hosting & backups", "Security monitoring", "Uptime monitoring", "Monthly report", "Emergency fixes only", "Full Bridge access"]'::jsonb),

    -- Essential ($750/mo) - 5 hours
    (p_studio_id, 'Essential', 'Ongoing support for content updates and minor changes.', 'Support', 'retainer',
     750, 750, 'USD', 'Monthly', 2, true,
     5, '48 business hours', 0, 'monthly', false,
     '["Everything in Care", "5 hours/month", "Content updates", "Minor design changes", "Full Bridge access"]'::jsonb),

    -- Growth ($1,500/mo) - 10 hours, RECOMMENDED
    (p_studio_id, 'Growth', 'Ongoing improvements that grow your online presence.', 'Support', 'retainer',
     1500, 1500, 'USD', 'Monthly', 3, true,
     10, '24 business hours', 3, 'monthly', true,
     '["Everything in Essential", "10 hours/month", "Monthly strategy call", "Priority response (24hr)", "3 hour rollover"]'::jsonb),

    -- Scale ($3,500/mo) - 20 hours
    (p_studio_id, 'Scale', 'A strategic partnership for continuous growth and optimization.', 'Support', 'retainer',
     3500, 3500, 'USD', 'Monthly', 4, true,
     20, 'Same business day', 5, 'monthly', false,
     '["Everything in Growth", "20 hours/month", "Bi-weekly calls", "Same-day response", "5 hour rollover", "Scheduled call support"]'::jsonb),

    -- ========================================================================
    -- DESIGN SERVICES
    -- ========================================================================
    (p_studio_id, 'Logo Design', 'Custom logo with variations and brand mark', 'Design', 'fixed', 500, 2000, 'USD', '1-2 weeks', 10, true,
     NULL, NULL, NULL, 'monthly', false, '[]'::jsonb),
    (p_studio_id, 'Brand Identity', 'Complete brand system: logo, colors, typography, guidelines', 'Design', 'fixed', 3000, 10000, 'USD', '3-6 weeks', 11, true,
     NULL, NULL, NULL, 'monthly', false, '[]'::jsonb),

    -- ========================================================================
    -- DEVELOPMENT SERVICES
    -- ========================================================================
    (p_studio_id, 'Landing Page', 'High-converting single page website with responsive design', 'Development', 'fixed', 1500, 3000, 'USD', '1-2 weeks', 20, true,
     NULL, NULL, NULL, 'monthly', false, '[]'::jsonb),
    (p_studio_id, 'Business Website', 'Full multi-page website with CMS integration', 'Development', 'fixed', 5000, 15000, 'USD', '4-8 weeks', 21, true,
     NULL, NULL, NULL, 'monthly', false, '[]'::jsonb),
    (p_studio_id, 'E-commerce Store', 'Online store with payment processing and inventory', 'Development', 'fixed', 8000, 25000, 'USD', '6-12 weeks', 22, true,
     NULL, NULL, NULL, 'monthly', false, '[]'::jsonb),
    (p_studio_id, 'Web Application', 'Custom web app with user authentication and database', 'Development', 'fixed', 15000, 50000, 'USD', '8-16 weeks', 23, true,
     NULL, NULL, NULL, 'monthly', false, '[]'::jsonb),

    -- ========================================================================
    -- CONSULTING SERVICES
    -- ========================================================================
    (p_studio_id, 'Design Consultation', 'Expert design advice and feedback sessions', 'Consulting', 'hourly', 150, 250, 'USD', 'Per hour', 30, true,
     NULL, NULL, NULL, 'monthly', false, '[]'::jsonb),
    (p_studio_id, 'Technical Consultation', 'Architecture review, code audit, technical guidance', 'Consulting', 'hourly', 200, 350, 'USD', 'Per hour', 31, true,
     NULL, NULL, NULL, 'monthly', false, '[]'::jsonb)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;
