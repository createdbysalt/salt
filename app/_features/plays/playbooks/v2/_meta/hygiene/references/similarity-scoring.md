# Similarity Scoring

How Duplicate Detector calculates match confidence.

## Exact Match Signals

These produce high confidence (85-99%):

| Signal | Score | Notes |
|--------|-------|-------|
| Same email | 98 | Email is a unique identifier |
| Same domain (org) | 95 | Domain uniquely identifies org |
| Same PO number | 95 | PO numbers are unique per vendor |
| Same invoice number | 95 | Invoice numbers are unique |
| Same file hash | 99 | Identical file content |
| Same phone | 85 | Phones can be shared (office) |

## Fuzzy Match Signals

Name similarity uses Jaro-Winkler distance:

| Score | Interpretation |
|-------|----------------|
| 0.95+ | Near identical ("John Smith" vs "John Smith Jr") |
| 0.85-0.94 | Very similar ("Acme Inc" vs "Acme Corporation") |
| 0.75-0.84 | Possibly same ("J. Smith" vs "John Smith") |
| < 0.75 | Unlikely same |

### Name Normalization

Before comparison, names are normalized:
- Lowercase
- Remove titles (Mr, Mrs, Dr, etc.)
- Remove suffixes (Jr, Sr, III, etc.)
- Remove company suffixes (Inc, LLC, Corp, etc.)
- Collapse whitespace

### Boosting Factors

Fuzzy matches are boosted when additional context matches:

| Context | Boost |
|---------|-------|
| Same email domain | +15% |
| Same industry | +10% |
| Same linked org | +12% |
| Same billing history | +8% |
| Recent activity overlap | +5% |

## Compound Signals

Some rules combine multiple signals:

```
dupe-person-fuzzy-name-domain:
  signal: person_name_fuzzy_match (base 55%)
  + same_email_domain boost (+15%)
  + same_org boost (+12%)
  = 82% confidence
```

## Threshold Reference

| Confidence | Action |
|------------|--------|
| 95-100% | High confidence — surface prominently |
| 80-94% | Review needed — show in queue |
| 60-79% | Low priority — batch in weekly scan |
| < 60% | Don't surface — log only |
