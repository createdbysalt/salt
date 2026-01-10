#!/bin/bash
# Stripe webhook forwarding script for local development
# Forwards Stripe events to both SaaS and Connect webhook endpoints

echo "Starting Stripe webhook forwarding..."
echo ""
echo "Forwarding events to:"
echo "  - http://localhost:3000/api/webhook/stripe (SaaS subscriptions)"
echo "  - http://localhost:3000/api/webhook/stripe-connect (Connect/client billing)"
echo ""
echo "Copy the webhook signing secret (whsec_...) to your .env.local:"
echo "  - STRIPE_WEBHOOK_SECRET"
echo "  - STRIPE_CONNECT_WEBHOOK_SECRET"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Forward to both endpoints using the --forward-to flag
# The Stripe CLI will use the same signing secret for all forwarded events
stripe listen \
  --forward-to localhost:3000/api/webhook/stripe \
  --forward-connect-to localhost:3000/api/webhook/stripe-connect
