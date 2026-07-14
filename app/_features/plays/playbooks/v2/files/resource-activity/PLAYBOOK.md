# Resource Activity Playbook

Surfaces activity from Live mode resources (GitHub PRs, Figma updates, Google Docs changes) in the Activity feed.

## Trigger Signals

| Signal | Provider | Description |
|--------|----------|-------------|
| `github_pr_opened` | GitHub | Pull request opened |
| `github_pr_merged` | GitHub | Pull request merged |
| `github_pr_closed` | GitHub | Pull request closed |
| `github_push` | GitHub | Commits pushed |
| `github_issue_opened` | GitHub | Issue opened |
| `github_issue_closed` | GitHub | Issue closed |
| `figma_file_updated` | Figma | File changed |
| `gdrive_doc_updated` | Google Drive | Document changed |
| `linear_issue_updated` | Linear | Issue updated |
| `resource_activity` | Any | Generic activity signal |

## Flow

1. **Signal Received**: Composio webhook delivers resource activity
2. **Route**: Signal router identifies the resource and linked entity
3. **Store**: Signal stored in `resource_signals`, activity entry created
4. **Synthesize**: Playbook drafts human-readable summary
5. **Surface**: Activity entry appears in Activity feed

## Example Output

> PR #42 merged on `acme/widget` — linked to Widget Redesign project

## Related

- Live mode configuration in Resources panel
- Entity connections in Memory
- `resource_signals` table for raw signal data
