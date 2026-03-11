-- ============================================================================
-- Align Default Service Categories
-- ============================================================================
-- Updates the seed_default_services function to use categories that match
-- the default service_categories: Design, Development, Strategy, Consulting,
-- Support, Marketing
-- ============================================================================

-- Update the seed function with aligned categories
CREATE OR REPLACE FUNCTION seed_default_services(p_studio_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO studio_services (
    studio_id, name, description, category, pricing_type,
    price_min, price_max, currency, typical_timeline, display_order, is_active
  ) VALUES
    -- Design
    (p_studio_id, 'Logo Design', 'Custom logo with variations and brand mark', 'Design', 'fixed', 500, 2000, 'USD', '1-2 weeks', 1, true),
    (p_studio_id, 'Brand Identity', 'Complete brand system: logo, colors, typography, guidelines', 'Design', 'fixed', 3000, 10000, 'USD', '3-6 weeks', 2, true),
    (p_studio_id, 'Design Retainer', 'Ongoing design support with dedicated hours', 'Design', 'retainer', 2000, 5000, 'USD', 'Monthly', 3, true),

    -- Development
    (p_studio_id, 'Landing Page', 'High-converting single page website with responsive design', 'Development', 'fixed', 1500, 3000, 'USD', '1-2 weeks', 4, true),
    (p_studio_id, 'Business Website', 'Full multi-page website with CMS integration', 'Development', 'fixed', 5000, 15000, 'USD', '4-8 weeks', 5, true),
    (p_studio_id, 'E-commerce Store', 'Online store with payment processing and inventory', 'Development', 'fixed', 8000, 25000, 'USD', '6-12 weeks', 6, true),
    (p_studio_id, 'Web Application', 'Custom web app with user authentication and database', 'Development', 'fixed', 15000, 50000, 'USD', '8-16 weeks', 7, true),
    (p_studio_id, 'Development Retainer', 'Ongoing development and maintenance support', 'Development', 'retainer', 3000, 8000, 'USD', 'Monthly', 8, true),

    -- Consulting
    (p_studio_id, 'Design Consultation', 'Expert design advice and feedback sessions', 'Consulting', 'hourly', 150, 250, 'USD', 'Per hour', 9, true),
    (p_studio_id, 'Technical Consultation', 'Architecture review, code audit, technical guidance', 'Consulting', 'hourly', 200, 350, 'USD', 'Per hour', 10, true)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Update existing services to use aligned categories
-- ============================================================================
UPDATE studio_services SET category = 'Design' WHERE category IN ('Branding');
UPDATE studio_services SET category = 'Development' WHERE category IN ('Web Design');
UPDATE studio_services SET category = 'Design' WHERE category = 'Retainer' AND name LIKE '%Design%';
UPDATE studio_services SET category = 'Development' WHERE category = 'Retainer' AND name LIKE '%Development%';
