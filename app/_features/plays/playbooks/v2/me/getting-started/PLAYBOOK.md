---
name: Getting Started
slug: getting-started
version: 1.0.0
description: Drafts replies to the threads that need you most after your first connect
---

# Getting Started

The first time you connect a source, Salt proves itself in minutes: it finds the 2–3 threads in your recent inbox that most need a reply, drafts each one, and queues the sends for your approval.

## How it Works

1. **Backfills** — Pulls recent inbound mail the classifier already flagged as needing a response
2. **Prioritizes** — Tags each thread (reply now vs. re-engage)
3. **Drafts** — Writes one short, specific reply per thread
4. **Gates the sends** — Each send pauses for your approval; nothing leaves your inbox without you

## When it Runs

- **Trigger**: When a connector is connected (`connector_connected`)
- **Requires**: Email category connected
- **Dedup**: Once per workspace per 72 hours — connecting three tools in one sitting produces one run, not three

## What You'll See

A queued play showing the chain — fetched threads → drafted replies → the send waiting on you — with the draft ready to review, edit, and approve.
