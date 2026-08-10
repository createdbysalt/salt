/**
 * Golden payload fixtures for the QuickBooks capture adapter.
 *
 * PROVENANCE: synthesized 2026-08-01 from the QuickBooks Online invoice
 * entity shape (the per-row form the backfill flattens out of
 * QUICKBOOKS_CUSTOMER_BALANCE_DETAIL reports) — not yet captured live.
 * Replace with a live row when the first QuickBooks backfill runs against
 * a sandbox company.
 */

/** Paid invoice row (backfill). */
export const QUICKBOOKS_INVOICE_BACKFILL = {
  Id: "1042",
  DocNumber: "INV-1042",
  TotalAmt: 2060.0,
  Balance: 0,
  CurrencyRef: { value: "CAD" },
  DueDate: "2026-08-20",
  CustomerRef: { name: "Northwind Studio" },
  BillEmail: { Address: "billing@northwind.com" },
  MetaData: { LastUpdatedTime: "2026-08-01T12:00:00Z" },
};
