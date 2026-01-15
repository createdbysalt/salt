// Billing types for subscription management

export enum SubscriptionPlan {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing'

export interface BillingInfo {
  plan: SubscriptionPlan
  status: SubscriptionStatus
  currentPeriodEnd?: Date
  cancelAtPeriodEnd?: boolean
}
