-- Grant lifecycle_events for PostgREST / Supabase client access.
-- Table created in 20260626130000_create_lifecycle_events.sql without GRANTs.

DO $$
BEGIN
  IF to_regclass('public.lifecycle_events') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.lifecycle_events TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.lifecycle_events TO service_role;
  END IF;
END $$;

-- Triggers from 20260626130000 still referenced studio_id after workspace rename.
CREATE OR REPLACE FUNCTION public.log_org_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.relationship_status IS DISTINCT FROM NEW.relationship_status THEN
    INSERT INTO public.lifecycle_events (
      workspace_id,
      entity_type,
      entity_id,
      event_type,
      from_value,
      to_value,
      source,
      because,
      created_by
    ) VALUES (
      NEW.workspace_id,
      'organization',
      NEW.id,
      'status_change',
      OLD.relationship_status,
      NEW.relationship_status,
      'manual',
      'Relationship status updated',
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.log_person_relationship_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.relationship_type IS DISTINCT FROM NEW.relationship_type THEN
    INSERT INTO public.lifecycle_events (
      workspace_id,
      entity_type,
      entity_id,
      event_type,
      from_value,
      to_value,
      source,
      because,
      created_by
    ) VALUES (
      NEW.workspace_id,
      'person',
      NEW.id,
      'relationship_change',
      OLD.relationship_type,
      NEW.relationship_type,
      'manual',
      'Relationship type updated',
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.log_person_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.relationship_status IS DISTINCT FROM NEW.relationship_status THEN
    INSERT INTO public.lifecycle_events (
      workspace_id,
      entity_type,
      entity_id,
      event_type,
      from_value,
      to_value,
      source,
      because,
      created_by
    ) VALUES (
      NEW.workspace_id,
      'person',
      NEW.id,
      'status_change',
      OLD.relationship_status,
      NEW.relationship_status,
      'manual',
      'Relationship status updated',
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
