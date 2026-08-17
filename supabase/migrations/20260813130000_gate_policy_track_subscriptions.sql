-- Gate policy: add email.track_subscriptions
--
-- New Sources → Customize choice: whether receipts/renewal notices from
-- SaaS vendors the operator pays become payable billing_records
-- (category software, tag subscription) instead of being discarded.
--
--   email.track_subscriptions: 'tracked' (default) | 'ignored'
--
-- The resolver (capture/services/gates/gate-policy.ts) treats a missing key
-- as the default, so existing rows need no backfill. The old constraint
-- ignored unknown keys, so this only tightens validation for the new key.

ALTER TABLE workspaces
  DROP CONSTRAINT capture_gate_policy_shape;

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
        AND (
          NOT (capture_gate_policy -> 'email' ? 'track_subscriptions')
          OR capture_gate_policy -> 'email' ->> 'track_subscriptions'
             IN ('tracked', 'ignored')
        )
      )
    )
  );

COMMENT ON COLUMN workspaces.capture_gate_policy IS 'Workspace intake gate policy choices (Sources → Customize). {} = defaults: automated senders dropped, strangers watched, vendor subscriptions tracked.';
