-- ============================================================================
-- Service Deliverables: What clients receive from each service
-- ============================================================================
-- Adds a JSONB array of deliverables to workspace_services.
-- Each deliverable has name, description, format, and is_required flag.
-- ============================================================================

ALTER TABLE public.workspace_services
  ADD COLUMN IF NOT EXISTS deliverables JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.workspace_services
  ADD COLUMN IF NOT EXISTS deliverables_source TEXT
    DEFAULT 'manual'
    CHECK (deliverables_source IN ('manual', 'ai_proposed', 'ai_confirmed'));

COMMENT ON COLUMN public.workspace_services.deliverables IS
$comment$Array of deliverables included in this service. Expected structure:
[
  {
    "name": "Logo files",
    "description": "Primary logo in multiple formats",
    "format": "AI, EPS, PNG, SVG",
    "is_required": true
  },
  {
    "name": "Brand guidelines",
    "description": "Comprehensive usage documentation",
    "format": "PDF",
    "is_required": true
  },
  {
    "name": "Social media templates",
    "description": "Profile and cover images for major platforms",
    "format": "Figma, PNG",
    "is_required": false
  }
]$comment$;

COMMENT ON COLUMN public.workspace_services.deliverables_source IS
  'manual = operator created, ai_proposed = Salt suggested, ai_confirmed = Salt wrote and user approved';
