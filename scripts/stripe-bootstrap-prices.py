#!/usr/bin/env python3
"""
Create the Salt SaaS products and prices in Stripe.

Idempotent: prices are looked up by `lookup_key` first, so re-running returns
the existing ids instead of creating duplicates. Stripe prices are immutable —
changing an amount always means a new price object — so a pricing change adds
new lookup keys (see `app/_lib/usage/pricing-versions.ts`) rather than editing
these.

Amounts mirror the `2026-08` pricing version exactly. If they drift, the
published-numbers test in `tiers.test.ts` is the source of truth, not this file.

Usage:
    op run --env-file=.env.1password -- python3 scripts/stripe-bootstrap-prices.py [--live]
"""

import json
import os
import subprocess
import sys
import urllib.parse

API = "https://api.stripe.com/v1"
PRICING_VERSION = "2026-08"

# tier -> (label, monthly cents, annual cents)
TIERS = {
    "starter": ("Salt Starter", 2900, 29000),
    "pro": ("Salt Pro", 7900, 79000),
    "max": ("Salt Max", 14900, 149000),
}


def call(path: str, data: dict | None = None, method: str = "GET") -> dict:
    """
    Shells out to curl rather than urllib: the python.org build on macOS ships
    without a configured CA bundle, so urllib fails TLS verification against
    Stripe while curl (using the system trust store) succeeds.

    The key is passed via `-u` from the environment, never interpolated into a
    logged string.
    """
    key = os.environ.get("STRIPE_SECRET_KEY", "")
    if not key:
        sys.exit("STRIPE_SECRET_KEY not set — run under `op run --env-file=.env.1password`")

    cmd = ["curl", "-sS", "-X", method, f"{API}/{path}", "-u", f"{key}:"]
    for field, value in (data or {}).items():
        cmd += ["--data-urlencode", f"{field}={value}"]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f"curl failed on {method} {path}: {result.stderr.strip()}")

    payload = json.loads(result.stdout)
    if "error" in payload:
        sys.exit(f"Stripe error on {method} {path}: {payload['error'].get('message')}")
    return payload


def guard_mode(allow_live: bool) -> None:
    key = os.environ.get("STRIPE_SECRET_KEY", "")
    if key.startswith("sk_live_") and not allow_live:
        sys.exit("Refusing to write to LIVE mode without --live.")
    print(f"Mode: {'LIVE' if key.startswith('sk_live_') else 'TEST'}\n")


def find_price_by_lookup_key(lookup_key: str) -> dict | None:
    found = call(f"prices?lookup_keys[]={urllib.parse.quote(lookup_key)}&limit=1")
    data = found.get("data", [])
    return data[0] if data else None


def ensure_product(tier: str, label: str) -> str:
    existing = call("products?limit=100&active=true")
    for product in existing.get("data", []):
        if product.get("metadata", {}).get("tier") == tier:
            print(f"  product exists  {product['id']:<24} {label}")
            return product["id"]

    created = call(
        "products",
        {
            "name": label,
            "metadata[tier]": tier,
            "metadata[pricing_version]": PRICING_VERSION,
        },
        method="POST",
    )
    print(f"  product created {created['id']:<24} {label}")
    return created["id"]


def ensure_price(product_id: str, tier: str, interval: str, amount: int) -> str:
    # Matches the SAAS_PRICE_IDS key naming so the two are easy to reconcile.
    suffix = "monthly" if interval == "month" else "annual"
    lookup_key = f"{tier}_{suffix}_{PRICING_VERSION}"

    existing = find_price_by_lookup_key(lookup_key)
    if existing:
        print(f"  price exists    {existing['id']:<32} {lookup_key}")
        return existing["id"]

    created = call(
        "prices",
        {
            "product": product_id,
            "currency": "usd",
            "unit_amount": amount,
            "recurring[interval]": interval,
            "lookup_key": lookup_key,
            "metadata[tier]": tier,
            "metadata[pricing_version]": PRICING_VERSION,
        },
        method="POST",
    )
    print(f"  price created   {created['id']:<32} {lookup_key}  ${amount / 100:,.2f}")
    return created["id"]


def main() -> None:
    guard_mode("--live" in sys.argv)

    env_lines: list[tuple[str, str]] = []

    for tier, (label, monthly, annual) in TIERS.items():
        print(f"{label}:")
        product_id = ensure_product(tier, label)
        monthly_id = ensure_price(product_id, tier, "month", monthly)
        annual_id = ensure_price(product_id, tier, "year", annual)
        env_lines.append((f"STRIPE_PRICE_{tier.upper()}_MONTHLY", monthly_id))
        env_lines.append((f"STRIPE_PRICE_{tier.upper()}_ANNUAL", annual_id))
        print()

    live = os.environ.get("STRIPE_SECRET_KEY", "").startswith("sk_live_")
    section = "pricing-live" if live else "pricing"
    target = "Vercel Production" if live else "Vercel Preview (staging branch)"

    print("=" * 68)
    print(f"Price IDs — store in 1Password section `{section}`")
    print("(vault salt-software-development -> item `stripe`)")
    print(f"and set on {target}.")
    print("=" * 68)
    for name, value in env_lines:
        print(f"{name}={value}")
    print(
        "\nSet Vercel vars via the REST API with type=encrypted, not `vercel env add`"
        "\n— the CLI creates them as write-only `sensitive`, which cannot be audited."
        "\nSee docs/architecture/billing-metering.md.",
    )


if __name__ == "__main__":
    main()
