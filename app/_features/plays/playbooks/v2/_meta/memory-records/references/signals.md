# Memory Records Signals

Signals that trigger this playbook and what they mean.

## People Signals

| Signal | Type | Fires When |
|--------|------|------------|
| `person_created` | Event | New person added to Memory |
| `person_updated` | Event | Person record modified |
| `has_payment_received` | Boolean | Person has paid you at least once |
| `has_stripe_payment` | Boolean | Payment came through Stripe |
| `has_invoice_sent` | Boolean | You've invoiced this person |
| `is_bidirectional_thread` | Boolean | Email thread has back-and-forth |
| `you_initiated` | Boolean | You sent the first email |
| `has_calendar_meeting` | Boolean | Have a calendar event with them |
| `has_signature` | Boolean | Email has parseable signature |
| `email_count` | Number | Total emails exchanged |
| `email_domain_is_personal` | Boolean | Email is from gmail/hotmail/etc |
| `email_domain_matches_workspace` | Boolean | Same domain as your workspace |
| `email_domain_in_partner_list` | Boolean | Domain is in your partner list |
| `email_domain_in_vendor_list` | Boolean | Domain is in your vendor list |

## Organization Signals

| Signal | Type | Fires When |
|--------|------|------------|
| `org_created` | Event | New organization added |
| `org_updated` | Event | Organization record modified |
| `org_domain_known` | Boolean | Organization has a known domain |
| `org_has_payment_received` | Boolean | Someone from org has paid |
| `org_has_invoice_sent` | Boolean | You've invoiced someone at org |
| `org_has_primary_contact` | Boolean | Has a designated key contact |
| `org_has_people` | Boolean | Has linked people |
| `inferred_industry` | String | Industry detected from domain/context |

## Work Signals

| Signal | Type | Fires When |
|--------|------|------------|
| `work_created` | Event | New work/project created |
| `work_updated` | Event | Work record modified |
| `work_has_signed_contract` | Boolean | Contract was signed |
| `work_has_kickoff` | Boolean | Kickoff meeting occurred |
| `work_is_blocked` | Boolean | Work is currently blocked |
| `work_has_completed_deliverable` | Boolean | Final deliverable done |
| `work_has_due_date` | Boolean | Has a deadline set |

## Billing Signals

| Signal | Type | Fires When |
|--------|------|------------|
| `billing_created` | Event | New billing record created |
| `billing_updated` | Event | Billing record modified |
| `billing_payment_matched` | Boolean | Payment matched to record |
| `billing_amount_paid_covers_total` | Boolean | Fully paid |
| `billing_due_date_passed` | Boolean | Due date has passed |
| `billing_party_email_match` | Boolean | Party email matches person |

## Meeting Signals

| Signal | Type | Fires When |
|--------|------|------------|
| `meeting_created` | Event | New meeting created |
| `meeting_updated` | Event | Meeting record modified |
| `meeting_synced_from_calendar` | Boolean | Imported from calendar |
| `meeting_end_passed` | Boolean | Meeting end time has passed |
| `meeting_has_attendance_evidence` | Boolean | Evidence someone attended |
| `meeting_cancelled_by_calendar` | Boolean | Calendar shows cancelled |

## File Signals

| Signal | Type | Fires When |
|--------|------|------------|
| `file_signature_event_sent` | Boolean | Document sent for signature |
| `file_signature_event_viewed` | Boolean | Document was viewed |
| `file_signature_event_signed` | Boolean | Document was signed |
| `file_signature_event_expired` | Boolean | Signature request expired |
