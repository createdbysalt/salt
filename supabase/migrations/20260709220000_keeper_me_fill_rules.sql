-- ============================================================================
-- ADD fill_rules to keeper-me (2026-07-09)
-- ============================================================================
--
-- Adds the fill_rules JSON for the operator memory facts playbook, enabling
-- the Rules tab in the UI to display pattern → category/kind classification.
--
-- These rules govern how Salt classifies observed facts about the operator
-- into categories (identity, business, preference, goal, voice, relationship)
-- and kinds (fact, preference, procedure).
-- ============================================================================

UPDATE public.playbook_blueprints
SET
  fill_rules = '{
    "version": 1,
    "fields": ["fact_category", "fact_kind"],
    "rules": [
      {
        "id": "identity-signature",
        "field": "fact_category",
        "when": { "signal": "pattern_signature_block", "op": "eq", "value": true },
        "set": { "value": "identity" },
        "confidence": 85,
        "because": "Signature blocks contain identity information (name, title, contact)"
      },
      {
        "id": "identity-timezone",
        "field": "fact_category",
        "when": { "signal": "pattern_timezone_mention", "op": "eq", "value": true },
        "set": { "value": "identity" },
        "confidence": 80,
        "because": "Timezone mentions relate to the operator identity"
      },
      {
        "id": "identity-title",
        "field": "fact_category",
        "when": { "signal": "pattern_title_role", "op": "eq", "value": true },
        "set": { "value": "identity" },
        "confidence": 85,
        "because": "Title and role are core identity fields"
      },
      {
        "id": "identity-name",
        "field": "fact_category",
        "when": { "signal": "pattern_name_correction", "op": "eq", "value": true },
        "set": { "value": "identity" },
        "confidence": 90,
        "because": "Name preferences are explicit identity facts"
      },
      {
        "id": "identity-phone",
        "field": "fact_category",
        "when": { "signal": "pattern_phone_number", "op": "eq", "value": true },
        "set": { "value": "identity" },
        "confidence": 80,
        "because": "Phone numbers are identity contact information"
      },
      {
        "id": "identity-address",
        "field": "fact_category",
        "when": { "signal": "pattern_address_mention", "op": "eq", "value": true },
        "set": { "value": "identity" },
        "confidence": 80,
        "because": "Personal addresses are identity information"
      },
      {
        "id": "identity-credentials",
        "field": "fact_category",
        "when": { "signal": "pattern_credentials", "op": "eq", "value": true },
        "set": { "value": "identity" },
        "confidence": 85,
        "because": "Professional credentials are identity facts"
      },
      {
        "id": "business-name",
        "field": "fact_category",
        "when": { "signal": "pattern_business_name", "op": "eq", "value": true },
        "set": { "value": "business" },
        "confidence": 90,
        "because": "Business name is a core business field"
      },
      {
        "id": "business-legal",
        "field": "fact_category",
        "when": { "signal": "pattern_legal_entity", "op": "eq", "value": true },
        "set": { "value": "business" },
        "confidence": 90,
        "because": "Legal entity type is a business fact"
      },
      {
        "id": "business-tax",
        "field": "fact_category",
        "when": { "signal": "pattern_tax_context", "op": "eq", "value": true },
        "set": { "value": "business" },
        "confidence": 85,
        "because": "Tax context relates to business structure"
      },
      {
        "id": "business-rate",
        "field": "fact_category",
        "when": { "signal": "pattern_rate_pricing", "op": "eq", "value": true },
        "set": { "value": "business" },
        "confidence": 85,
        "because": "Rates and pricing are business facts"
      },
      {
        "id": "business-terms",
        "field": "fact_category",
        "when": { "signal": "pattern_payment_terms", "op": "eq", "value": true },
        "set": { "value": "business" },
        "confidence": 85,
        "because": "Payment terms are business policy"
      },
      {
        "id": "business-currency",
        "field": "fact_category",
        "when": { "signal": "pattern_currency_default", "op": "eq", "value": true },
        "set": { "value": "business" },
        "confidence": 80,
        "because": "Default currency is a business preference"
      },
      {
        "id": "business-address",
        "field": "fact_category",
        "when": { "signal": "pattern_business_address", "op": "eq", "value": true },
        "set": { "value": "business" },
        "confidence": 85,
        "because": "Business address is distinct from personal"
      },
      {
        "id": "preference-communication",
        "field": "fact_category",
        "when": { "signal": "pattern_communication_pref", "op": "eq", "value": true },
        "set": { "value": "preference" },
        "confidence": 80,
        "because": "Communication preferences guide how Salt drafts"
      },
      {
        "id": "preference-scheduling",
        "field": "fact_category",
        "when": { "signal": "pattern_scheduling_pref", "op": "eq", "value": true },
        "set": { "value": "preference" },
        "confidence": 80,
        "because": "Scheduling preferences guide calendar suggestions"
      },
      {
        "id": "preference-workflow",
        "field": "fact_category",
        "when": { "signal": "pattern_workflow_pref", "op": "eq", "value": true },
        "set": { "value": "preference" },
        "confidence": 75,
        "because": "Workflow preferences need context verification"
      },
      {
        "id": "preference-tool",
        "field": "fact_category",
        "when": { "signal": "pattern_tool_pref", "op": "eq", "value": true },
        "set": { "value": "preference" },
        "confidence": 80,
        "because": "Tool preferences are explicit statements"
      },
      {
        "id": "voice-correction",
        "field": "fact_category",
        "when": { "signal": "pattern_voice_correction", "op": "eq", "value": true },
        "set": { "value": "voice" },
        "confidence": 85,
        "because": "Draft corrections are voice learning signals"
      },
      {
        "id": "voice-terminology",
        "field": "fact_category",
        "when": { "signal": "pattern_terminology_pref", "op": "eq", "value": true },
        "set": { "value": "voice" },
        "confidence": 85,
        "because": "Terminology preferences shape voice"
      },
      {
        "id": "voice-tone",
        "field": "fact_category",
        "when": { "signal": "pattern_tone_indicator", "op": "eq", "value": true },
        "set": { "value": "voice" },
        "confidence": 80,
        "because": "Tone indicators guide writing style"
      },
      {
        "id": "relationship-referral",
        "field": "fact_category",
        "when": { "signal": "pattern_referral_source", "op": "eq", "value": true },
        "set": { "value": "relationship" },
        "confidence": 90,
        "because": "Referral sources are high-value relationship context"
      },
      {
        "id": "relationship-partnership",
        "field": "fact_category",
        "when": { "signal": "pattern_partnership_mention", "op": "eq", "value": true },
        "set": { "value": "relationship" },
        "confidence": 80,
        "because": "Partnership mentions indicate business relationships"
      },
      {
        "id": "relationship-team",
        "field": "fact_category",
        "when": { "signal": "pattern_team_context", "op": "eq", "value": true },
        "set": { "value": "relationship" },
        "confidence": 80,
        "because": "Team mentions indicate working relationships"
      },
      {
        "id": "kind-fact-signature",
        "field": "fact_kind",
        "when": { "signal": "pattern_signature_block", "op": "eq", "value": true },
        "set": { "value": "fact" },
        "confidence": 85,
        "because": "Signature information is factual"
      },
      {
        "id": "kind-fact-business",
        "field": "fact_kind",
        "when": { "signal": "pattern_business_name", "op": "eq", "value": true },
        "set": { "value": "fact" },
        "confidence": 90,
        "because": "Business name is an objective fact"
      },
      {
        "id": "kind-fact-legal",
        "field": "fact_kind",
        "when": { "signal": "pattern_legal_entity", "op": "eq", "value": true },
        "set": { "value": "fact" },
        "confidence": 90,
        "because": "Legal entity type is verifiable"
      },
      {
        "id": "kind-fact-rate",
        "field": "fact_kind",
        "when": { "signal": "pattern_rate_pricing", "op": "eq", "value": true },
        "set": { "value": "fact" },
        "confidence": 85,
        "because": "Rates are factual until changed"
      },
      {
        "id": "kind-pref-communication",
        "field": "fact_kind",
        "when": { "signal": "pattern_communication_pref", "op": "eq", "value": true },
        "set": { "value": "preference" },
        "confidence": 80,
        "because": "Communication style is a preference"
      },
      {
        "id": "kind-pref-scheduling",
        "field": "fact_kind",
        "when": { "signal": "pattern_scheduling_pref", "op": "eq", "value": true },
        "set": { "value": "preference" },
        "confidence": 80,
        "because": "Scheduling rules are preferences"
      },
      {
        "id": "kind-pref-tool",
        "field": "fact_kind",
        "when": { "signal": "pattern_tool_pref", "op": "eq", "value": true },
        "set": { "value": "preference" },
        "confidence": 80,
        "because": "Tool choices are preferences"
      },
      {
        "id": "kind-procedure-voice",
        "field": "fact_kind",
        "when": { "signal": "pattern_voice_correction", "op": "eq", "value": true },
        "set": { "value": "procedure" },
        "confidence": 85,
        "because": "Voice corrections teach how to write"
      },
      {
        "id": "kind-procedure-terminology",
        "field": "fact_kind",
        "when": { "signal": "pattern_terminology_pref", "op": "eq", "value": true },
        "set": { "value": "procedure" },
        "confidence": 85,
        "because": "Terminology rules are procedural"
      }
    ]
  }'::jsonb,
  updated_at = now()
WHERE slug = 'keeper-me';
