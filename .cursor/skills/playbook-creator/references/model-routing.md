# Model Routing

Salt chooses models centrally. Users should not choose model tiers for playbooks; quality and consistency are product responsibilities.

## Routing Principle

Route by stakes:

- **Client-facing copy** uses a premium model slot.
- **Internal/utility copy** uses the cheaper play personalization slot.
- **Extraction/classification** should stay cheap unless evals show quality issues.
- **Deep reasoning** uses a strong reasoning route outside compiled play steps.
- **Ask Salt chat** uses a fast tool-calling route.

## Playbook Slots

Use these slots in `llm` steps:

| Slot | Use When | Default |
| --- | --- | --- |
| `copyClientFacing` | The text may be sent to a client, partner, vendor, or collaborator. | Premium Sonnet-class route |
| `playPersonalize` | Internal brief, utility text, extraction, classification, or scratch copy. | Cheap route |

Default to `copyClientFacing` if the output could plausibly leave Salt. Downgrade only after a blind or benchmarked comparison shows the cheaper slot performs equally well.

## Examples

Client-facing:

```json
{
  "kind": "llm",
  "purpose": "draft_client_follow_up",
  "modelSlot": "copyClientFacing",
  "instructions": "Draft a warm follow-up email...",
  "inputs": ["meeting.summary", "client.name"],
  "maxTokens": 400,
  "bind": "followUp"
}
```

Internal:

```json
{
  "kind": "llm",
  "purpose": "summarize_internal_notes",
  "modelSlot": "playPersonalize",
  "instructions": "Summarize the notes for an internal brief...",
  "inputs": ["transcript.summary"],
  "maxTokens": 300,
  "bind": "summary"
}
```

## Cost Control

Cost control comes from:

- bounded `maxTokens` (`<= 600`),
- narrow inputs (`<= 5` paths),
- deterministic fetch/render steps,
- eval-proven downgrades,
- central environment overrides.

Do not expose model pickers to users in the normal product. A future advanced override can exist, but the default path should be curated.
