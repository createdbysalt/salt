---
name: Create Your First Playbook
slug: create-first-playbook
version: 1.0.0
description: Invites the operator to author a custom playbook after their first connect
---

# Create Your First Playbook

After Salt's own playbooks have shown what they can do, Salt invites you to teach it a play of your own.

## How it Works

1. **Fires on first connect** — runs once per workspace (72h dedup) when any connector lands
2. **Drafts a short invitation** — what a playbook is, one concrete example, where to start
3. **Queues for review** — a card in your Plays queue, no actions taken

## When it Runs

- **Trigger**: When a connector is connected (`connector_connected`)
- **Requires**: Nothing — works for any connector
