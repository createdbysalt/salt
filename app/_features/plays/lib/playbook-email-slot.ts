/**
 * A play drafts in one inbox. Gmail and Outlook are the same email slot,
 * not two parallel destinations. Adding a second inbox replaces the first.
 * Billing can still fan out across Stripe and QuickBooks.
 */

export const EMAIL_PROVIDERS = ["gmail", "outlook"] as const;

export type EmailProvider = (typeof EMAIL_PROVIDERS)[number];

export const EMAIL_TOOLS_BY_CAPABILITY = {
  read_email: {
    gmail: "GMAIL_FETCH_EMAILS",
    outlook: "OUTLOOK_LIST_MESSAGES",
  },
  draft_message: {
    gmail: "GMAIL_CREATE_EMAIL_DRAFT",
    outlook: "OUTLOOK_CREATE_DRAFT",
  },
  send_message: {
    gmail: "GMAIL_SEND_EMAIL",
    outlook: "OUTLOOK_SEND_EMAIL",
  },
} as const;

/** Billing can use more than one app. Each selected app adds its sibling tool. */
export const BILLING_TOOLS_BY_CAPABILITY = {
  read_invoices: {
    stripe: "STRIPE_LIST_INVOICES",
    quickbooks: "QUICKBOOKS_GET_AGED_RECEIVABLES_REPORT",
  },
  create_invoice: {
    stripe: "STRIPE_CREATE_INVOICE",
    quickbooks: "QUICKBOOKS_CREATE_INVOICE",
  },
} as const;

export const BILLING_PROVIDERS = ["stripe", "quickbooks"] as const;
export type BillingProvider = (typeof BILLING_PROVIDERS)[number];

const TOOL_TO_EMAIL_CAPABILITY: Record<
  string,
  keyof typeof EMAIL_TOOLS_BY_CAPABILITY
> = {
  GMAIL_FETCH_EMAILS: "read_email",
  OUTLOOK_LIST_MESSAGES: "read_email",
  GMAIL_CREATE_EMAIL_DRAFT: "draft_message",
  OUTLOOK_CREATE_DRAFT: "draft_message",
  GMAIL_SEND_EMAIL: "send_message",
  OUTLOOK_SEND_EMAIL: "send_message",
};

const TOOL_TO_BILLING_CAPABILITY: Record<
  string,
  keyof typeof BILLING_TOOLS_BY_CAPABILITY
> = {
  STRIPE_LIST_INVOICES: "read_invoices",
  QUICKBOOKS_GET_AGED_RECEIVABLES_REPORT: "read_invoices",
  STRIPE_CREATE_INVOICE: "create_invoice",
  QUICKBOOKS_CREATE_INVOICE: "create_invoice",
};

export function isBillingProvider(
  provider: string
): provider is BillingProvider {
  return (BILLING_PROVIDERS as readonly string[]).includes(provider);
}

export function isEmailProvider(provider: string): provider is EmailProvider {
  return (EMAIL_PROVIDERS as readonly string[]).includes(provider);
}

/** Keep the last email inbox; leave every other category untouched. */
export function constrainPlaybookAppSelections(
  providers: readonly string[]
): string[] {
  let lastEmail: string | null = null;
  const rest: string[] = [];
  for (const provider of providers) {
    if (isEmailProvider(provider)) {
      lastEmail = provider;
    } else {
      rest.push(provider);
    }
  }
  return lastEmail ? [...rest, lastEmail] : rest;
}

export function selectedEmailProvider(
  selections: readonly string[]
): EmailProvider | null {
  const constrained = constrainPlaybookAppSelections(selections);
  const email = constrained.find(isEmailProvider);
  return email ?? null;
}

export function selectedProvidersFromSets(
  connected: Iterable<string> | undefined,
  excluded: ReadonlySet<string> | undefined
): string[] {
  return constrainPlaybookAppSelections(
    [...(connected ?? [])].filter((provider) => !excluded?.has(provider))
  );
}

export function selectedBillingProviders(
  selections: readonly string[]
): BillingProvider[] {
  return constrainPlaybookAppSelections(selections).filter(isBillingProvider);
}

export function resolvePlaybookToolSlug(
  declared: string,
  selections: readonly string[]
): string {
  const expanded = expandPlaybookToolSlugs(declared, selections);
  return expanded[0] ?? declared;
}

/**
 * Email is one inbox (swap). Billing can be many apps (add a sibling per
 * selected provider). Everything else stays as authored.
 */
export function expandPlaybookToolSlugs(
  declared: string,
  selections: readonly string[]
): string[] {
  const emailCapability = TOOL_TO_EMAIL_CAPABILITY[declared];
  if (emailCapability) {
    const email = selectedEmailProvider(selections);
    return [
      email
        ? EMAIL_TOOLS_BY_CAPABILITY[emailCapability][email]
        : declared,
    ];
  }

  const billingCapability = TOOL_TO_BILLING_CAPABILITY[declared];
  if (billingCapability) {
    const billing = selectedBillingProviders(selections);
    if (billing.length === 0) return [declared];
    return billing.map(
      (provider) => BILLING_TOOLS_BY_CAPABILITY[billingCapability][provider]
    );
  }

  return [declared];
}

export function resolvePlaybookToolAllowlist(
  declared: readonly string[],
  selections: readonly string[]
): string[] {
  return [
    ...new Set(
      declared.flatMap((slug) => expandPlaybookToolSlugs(slug, selections))
    ),
  ];
}

/** Sibling slugs to hydrate so a swapped inbox or billing app can validate. */
export function collectEmailToolSiblings(
  declared: readonly string[]
): string[] {
  const siblings = new Set<string>();
  for (const slug of declared) {
    const emailCapability = TOOL_TO_EMAIL_CAPABILITY[slug];
    if (emailCapability) {
      for (const sibling of Object.values(
        EMAIL_TOOLS_BY_CAPABILITY[emailCapability]
      )) {
        if (sibling !== slug) siblings.add(sibling);
      }
    }
    const billingCapability = TOOL_TO_BILLING_CAPABILITY[slug];
    if (billingCapability) {
      for (const sibling of Object.values(
        BILLING_TOOLS_BY_CAPABILITY[billingCapability]
      )) {
        if (sibling !== slug) siblings.add(sibling);
      }
    }
  }
  return [...siblings];
}

/**
 * Gmail drafts use `recipient_email`. Outlook drafts use `to_recipients`.
 * Subject and body share names.
 */
export function remapEmailToolArgs(
  fromSlug: string,
  toSlug: string,
  args: Record<string, unknown>
): Record<string, unknown> {
  if (fromSlug === toSlug) return args;

  if (
    toSlug === EMAIL_TOOLS_BY_CAPABILITY.draft_message.outlook ||
    toSlug === EMAIL_TOOLS_BY_CAPABILITY.send_message.outlook
  ) {
    const recipient = firstRecipient(args);
    const next: Record<string, unknown> = {
      subject: args.subject,
      body: args.body,
    };
    if (typeof args.is_html === "boolean") next.is_html = args.is_html;
    if (recipient) next.to_recipients = [recipient];
    const cc = stringArray(args.cc);
    if (cc) next.cc_recipients = cc;
    const bcc = stringArray(args.bcc);
    if (bcc) next.bcc_recipients = bcc;
    return next;
  }

  if (
    toSlug === EMAIL_TOOLS_BY_CAPABILITY.draft_message.gmail ||
    toSlug === EMAIL_TOOLS_BY_CAPABILITY.send_message.gmail
  ) {
    const recipient = firstRecipient(args);
    return {
      recipient_email: recipient ?? args.recipient_email,
      subject: args.subject,
      body: args.body,
      ...(typeof args.is_html === "boolean" ? { is_html: args.is_html } : {}),
    };
  }

  return args;
}

function firstRecipient(args: Record<string, unknown>): string | null {
  if (typeof args.recipient_email === "string" && args.recipient_email.trim()) {
    return args.recipient_email;
  }
  if (typeof args.to_email === "string" && args.to_email.trim()) {
    return args.to_email;
  }
  // Playbook-authored steps sometimes use the generic `to` — without this the
  // remap silently drops the recipient in both directions.
  if (typeof args.to === "string" && args.to.trim()) {
    return args.to;
  }
  const fromList = stringArray(args.to_recipients);
  return fromList?.[0] ?? null;
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.filter((item): item is string => typeof item === "string");
  return items.length > 0 ? items : null;
}
