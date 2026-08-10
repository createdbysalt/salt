-- Widen connector_rules.source for the Phase M5 doors: corrections and
-- Ask Salt both write deny rules, and the attribution must be honest
-- (a rule from a correction should not read as hand-typed by the user).

ALTER TABLE connector_rules DROP CONSTRAINT connector_rules_source_check;
ALTER TABLE connector_rules ADD CONSTRAINT connector_rules_source_check
  CHECK (source IN ('user', 'suggested', 'correction', 'ask_salt'));
