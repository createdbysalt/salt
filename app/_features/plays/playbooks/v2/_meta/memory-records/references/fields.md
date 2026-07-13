# Memory Records Fields

Fields managed by this playbook and their valid values.

## People Fields

### relationship_type
Type: `enum`

Valid values:
- `client` - They pay you for services
- `prospect` - Potential client, not yet paying
- `team` - Part of your organization
- `partner` - Business partner, not client
- `vendor` - You pay them for services
- `personal` - Non-business relationship
- `unknown` - Not enough information yet

### title
Type: `string`
Free-text job title extracted from email signatures or LinkedIn.

### org_link
Type: `uuid` (organization_id)
Links person to their organization.

## Organization Fields

### relationship_status
Type: `enum`

Valid values:
- `prospect` - Potential client organization
- `client` - Active client organization
- `past_client` - Former client
- `partner` - Business partner
- `vendor` - Vendor organization
- `other` - Other relationship

### industry
Type: `string`
Industry classification (auto-detected or manual).

### key_contact
Type: `uuid` (person_id)
Primary contact at this organization.

## Work Fields

### status
Type: `enum`

Valid values:
- `draft` - In planning, not started
- `signed` - Contract signed, ready to start
- `active` - Work in progress
- `on_hold` - Temporarily paused
- `completed` - Work finished
- `archived` - Closed, no longer active

### description
Type: `string`
Description of the work/project.

### deadline
Type: `date`
Due date for the work.

## Billing Fields

### status
Type: `enum`

Valid values:
- `draft` - Not yet sent
- `due` - Sent, awaiting payment
- `overdue` - Past due date
- `paid` - Fully paid
- `partial` - Partially paid
- `refunded` - Refunded
- `disputed` - In dispute

### organizationId, personId, projectId
Type: `uuid`
Links to related entities.

## Meeting Fields

### status
Type: `enum`

Valid values:
- `scheduled` - Upcoming meeting
- `completed` - Meeting happened
- `cancelled` - Meeting cancelled
- `no-show` - One party didn't show

### meeting_type
Type: `enum`

Valid values:
- `discovery` - Initial discovery call
- `kickoff` - Project kickoff
- `check-in` - Regular check-in
- `review` - Review/feedback session
- `presentation` - Presentation or demo
- `workshop` - Working session
- `interview` - Interview
- `other` - Other meeting type

## File Fields

### category
Type: `enum`

Valid values:
- `contract` - Legal contract
- `invoice` - Invoice document
- `proposal` - Proposal document
- `deliverable` - Final deliverable
- `reference` - Reference material
- `other` - Other category

### lifecycle_status
Type: `enum`

Valid values:
- `draft` - In draft
- `sent` - Sent for signature
- `viewed` - Viewed by recipient
- `awaiting_signature` - Waiting for signature
- `signed` - Fully signed
- `expired` - Signature expired
- `archived` - Archived
