-- Rename the "People Profile" playbook display name to "People Records".
-- Display-name only change; the slug (people-profile) stays stable so existing
-- profile_playbook_settings, profile_field_provenance, and routes are unaffected.

update public.playbook_blueprints
set name = 'People Records',
    updated_at = now()
where slug = 'people-profile'
  and name = 'People Profile';
