/**
 * Golden payload fixtures for the Slack capture adapter.
 *
 * PROVENANCE: derived 2026-08-05 from the live Composio trigger payload
 * schemas (composio-trigger-schemas.json). Slack sends the raw event with
 * `user` as a STRING member ID (not an object with email) and `bot_id`
 * set for bot messages: { channel, channel_type, ts, text, user, team_id,
 * thread_ts?, bot_id?, attachments?, blocks?, files?, subtype? }.
 */

/** SLACK_CHANNEL_MESSAGE_RECEIVED — human message in a public channel. */
export const SLACK_TRIGGER_CHANNEL_MESSAGE = {
  channel: "C0123456789",
  channel_type: "channel",
  ts: "1754407800.000200",
  text: "Can we move the Harbor Co review to Thursday?",
  user: "U0AB12CD3",
  team_id: "T0XY98ZW7",
};

/** Threaded reply — thread_ts groups the conversation. */
export const SLACK_TRIGGER_THREADED_REPLY = {
  channel: "C0123456789",
  channel_type: "channel",
  ts: "1754409000.000350",
  thread_ts: "1754407800.000200",
  text: "Thursday works. I'll update the invite.",
  user: "U0EF45GH6",
  team_id: "T0XY98ZW7",
};

/** SLACK_DIRECT_MESSAGE_RECEIVED — DM payload. */
export const SLACK_TRIGGER_DIRECT_MESSAGE = {
  channel: "D0987654321",
  channel_type: "im",
  ts: "1754410500.000101",
  text: "Sending over the signed contract now.",
  user: "U0AB12CD3",
  team_id: "T0XY98ZW7",
  bot_id: "",
};

/** Bot message — bot_id set, no human user. */
export const SLACK_TRIGGER_BOT_MESSAGE = {
  channel: "C0123456789",
  channel_type: "channel",
  ts: "1754411000.000500",
  text: "Daily standup reminder: post your updates!",
  user: "",
  bot_id: "B0BOT123",
  team_id: "T0XY98ZW7",
};

/** No ts — decline. */
export const SLACK_MALFORMED = {
  channel: "C0123456789",
  text: "message with no timestamp",
};
