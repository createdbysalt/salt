# Health Scoring

How Memory Hygiene calculates overall health score.

## Formula

```
health_score = 100 - penalty

penalty = (critical_count * 3 + high_count * 2 + medium_count * 1) / total_records * 100
```

Each issue penalizes the score based on severity:
- Critical issues: 3x weight
- High issues: 2x weight
- Medium issues: 1x weight
- Low issues: not counted

## Grade Thresholds

| Score | Grade | Description |
|-------|-------|-------------|
| 90-100 | A | Excellent — Memory is well-maintained |
| 80-89 | B | Good — Minor gaps to address |
| 70-79 | C | Fair — Noticeable data quality issues |
| 60-69 | D | Poor — Many records need attention |
| < 60 | F | Critical — Significant cleanup required |

## Example Calculations

### Example 1: Healthy Memory
```
Total records: 100
Critical issues: 0
High issues: 2
Medium issues: 5

Penalty = (0*3 + 2*2 + 5*1) / 100 * 100 = 9
Health score = 100 - 9 = 91 (Grade A)
```

### Example 2: Needs Work
```
Total records: 100
Critical issues: 3
High issues: 10
Medium issues: 15

Penalty = (3*3 + 10*2 + 15*1) / 100 * 100 = 44
Health score = 100 - 44 = 56 (Grade F)
```

### Example 3: Small Memory
```
Total records: 10
Critical issues: 1
High issues: 1
Medium issues: 2

Penalty = (1*3 + 1*2 + 2*1) / 10 * 100 = 70
Health score = 100 - 70 = 30 (Grade F)
```

Note: Small memories are more sensitive to individual issues.

## Score Capping

- Score is capped at 0 (cannot go negative)
- Score is capped at 100
- Archived records are excluded from total_records

## Trend Tracking

Hygiene tracks health score over time:

```
Week 1: 72 (C)
Week 2: 78 (C) ↑
Week 3: 85 (B) ↑
Week 4: 88 (B) ↑
```

Trend indicators:
- ↑ Improving (score increased by 3+)
- → Stable (change within ±2)
- ↓ Declining (score decreased by 3+)

## Score Components

The report breaks down score impact:

```
Health Score: 78 (C)

Score Impact by Category:
- Missing required fields: -12
- Stale records: -6
- Orphan records: -4
Total penalty: -22

Top 3 Quick Wins:
1. Add email to 4 people (+8 points)
2. Archive 3 stale contacts (+4 points)
3. Link 2 orphan files (+2 points)
```

## Workspace Benchmarks

Target scores by workspace maturity:

| Stage | Target | Notes |
|-------|--------|-------|
| New (< 50 records) | 80+ | Small datasets should be clean |
| Growing (50-200) | 75+ | Some gaps expected during growth |
| Mature (200-500) | 80+ | Should have established hygiene |
| Large (500+) | 85+ | Needs active maintenance |

## Health Score in UI

Health score is displayed in:
- Weekly hygiene report header
- HQ dashboard widget (if enabled)
- Settings > Memory health

Badge colors:
- A: Green
- B: Blue
- C: Yellow
- D: Orange
- F: Red
