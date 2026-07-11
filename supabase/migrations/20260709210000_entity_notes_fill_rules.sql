-- ============================================================================
-- ADD fill_rules to keeper-entity-notes (2026-07-09)
-- ============================================================================
--
-- Adds the fill_rules JSON for the entity notes playbook, enabling the Rules
-- tab in the UI to display the pattern → note_kind classification rules.
--
-- Also updates the procedure_md with the latest wiring status and rules docs.
-- ============================================================================

UPDATE public.playbook_blueprints
SET
  fill_rules = '{
    "version": 1,
    "fields": ["note_kind"],
    "rules": [
      {
        "id": "fact-employment",
        "field": "note_kind",
        "when": { "signal": "pattern_employment", "op": "eq", "value": true },
        "set": { "value": "fact" },
        "confidence": 85,
        "because": "Employment facts are objective and verifiable"
      },
      {
        "id": "fact-location",
        "field": "note_kind",
        "when": { "signal": "pattern_location", "op": "eq", "value": true },
        "set": { "value": "fact" },
        "confidence": 80,
        "because": "Location facts are generally reliable"
      },
      {
        "id": "fact-birthday",
        "field": "note_kind",
        "when": { "signal": "pattern_birthday", "op": "eq", "value": true },
        "set": { "value": "fact" },
        "confidence": 90,
        "because": "Date facts are highly specific and verifiable"
      },
      {
        "id": "fact-education",
        "field": "note_kind",
        "when": { "signal": "pattern_education", "op": "eq", "value": true },
        "set": { "value": "fact" },
        "confidence": 80,
        "because": "Education facts are stable and verifiable"
      },
      {
        "id": "preference-explicit",
        "field": "note_kind",
        "when": { "signal": "pattern_preference_explicit", "op": "eq", "value": true },
        "set": { "value": "preference" },
        "confidence": 80,
        "because": "Explicit preference statements are reliable"
      },
      {
        "id": "preference-negative",
        "field": "note_kind",
        "when": { "signal": "pattern_preference_negative", "op": "eq", "value": true },
        "set": { "value": "preference" },
        "confidence": 75,
        "because": "Negative preferences need context verification"
      },
      {
        "id": "preference-time",
        "field": "note_kind",
        "when": { "signal": "pattern_preference_time", "op": "eq", "value": true },
        "set": { "value": "preference" },
        "confidence": 85,
        "because": "Work-time preferences are clear signals"
      },
      {
        "id": "context-milestone",
        "field": "note_kind",
        "when": { "signal": "pattern_context_milestone", "op": "eq", "value": true },
        "set": { "value": "context" },
        "confidence": 85,
        "because": "Milestone context is tied to verifiable events"
      },
      {
        "id": "context-history",
        "field": "note_kind",
        "when": { "signal": "pattern_context_history", "op": "eq", "value": true },
        "set": { "value": "context" },
        "confidence": 70,
        "because": "Historical context benefits from verification"
      },
      {
        "id": "relationship-referral",
        "field": "note_kind",
        "when": { "signal": "pattern_relationship_referral", "op": "eq", "value": true },
        "set": { "value": "relationship" },
        "confidence": 90,
        "because": "Referral chains are high-value relationship context"
      },
      {
        "id": "relationship-connection",
        "field": "note_kind",
        "when": { "signal": "pattern_relationship_connection", "op": "eq", "value": true },
        "set": { "value": "relationship" },
        "confidence": 75,
        "because": "Inferred connections need confirmation"
      },
      {
        "id": "relationship-family",
        "field": "note_kind",
        "when": { "signal": "pattern_relationship_family", "op": "eq", "value": true },
        "set": { "value": "relationship" },
        "confidence": 80,
        "because": "Family context is personal but usually clear"
      },
      {
        "id": "flag-silence",
        "field": "note_kind",
        "when": { "signal": "pattern_flag_silence", "op": "eq", "value": true },
        "set": { "value": "flag" },
        "confidence": 85,
        "because": "Communication gaps are objective and actionable"
      },
      {
        "id": "flag-sentiment",
        "field": "note_kind",
        "when": { "signal": "pattern_flag_sentiment", "op": "eq", "value": true },
        "set": { "value": "flag" },
        "confidence": 70,
        "because": "Sentiment is subjective — always propose"
      },
      {
        "id": "flag-risk",
        "field": "note_kind",
        "when": { "signal": "pattern_flag_risk", "op": "eq", "value": true },
        "set": { "value": "flag" },
        "confidence": 75,
        "because": "Risk signals need human judgment"
      },
      {
        "id": "flag-overdue",
        "field": "note_kind",
        "when": { "signal": "pattern_flag_overdue", "op": "eq", "value": true },
        "set": { "value": "flag" },
        "confidence": 80,
        "because": "Schedule slips are objective but may need context"
      }
    ]
  }'::jsonb,
  updated_at = now()
WHERE slug = 'keeper-entity-notes';
