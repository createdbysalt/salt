-- Capture gate policy (Customize surfaces, Phase S3)
--
-- Workspace-level, plain-language policy choices for the intake gates,
-- shown on Sources → Customize beside the transparency lines they govern.
-- v1 ships exactly two email choices:
--
--   email.automated_senders: 'dropped' (default) | 'watched' | 'let_in'
--     Governs the pre-ingest noreply/bulk heuristics (category 'automated').
--   email.strangers: 'watched' (default) | 'let_in' | 'dropped'
--     Governs the memory-first hold on unknown-sender inbound email.
--
-- Defaults match behavior at ship time, so '{}' means "as Salt has always
-- run". Numeric internals (admission scores, evidence weights) are never
-- stored here — named policy choices only.
--
-- workspaces is owner-writable through PostgREST, which is SAFE here: the
-- worst a tampered value does is change what the owner's own intake drops
-- (the CHECK constraint below still bounds the shape). Never store tiers,
-- bundle sizes, or usage counters in this column (billing-metering hard
-- constraint 3).

ALTER TABLE workspaces
  ADD COLUMN capture_gate_policy JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE workspaces
  ADD CONSTRAINT capture_gate_policy_shape
  CHECK (
    jsonb_typeof(capture_gate_policy) = 'object'
    AND (
      NOT (capture_gate_policy ? 'email')
      OR (
        jsonb_typeof(capture_gate_policy -> 'email') = 'object'
        AND (
          NOT (capture_gate_policy -> 'email' ? 'automated_senders')
          OR capture_gate_policy -> 'email' ->> 'automated_senders'
             IN ('dropped', 'watched', 'let_in')
        )
        AND (
          NOT (capture_gate_policy -> 'email' ? 'strangers')
          OR capture_gate_policy -> 'email' ->> 'strangers'
             IN ('watched', 'let_in', 'dropped')
        )
      )
    )
  );

COMMENT ON COLUMN workspaces.capture_gate_policy IS 'Workspace intake gate policy choices (Sources → Customize). {} = defaults: automated senders dropped, strangers watched.';
