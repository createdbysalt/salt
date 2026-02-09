# Analytics Tracker Agent

Tracks social media performance with focus on engagement velocity and content attribution. Surfaces insights that help optimize future content.

## When to Use

- Weekly performance reviews
- Identifying top-performing content
- Checking pillar balance
- Tracking waitlist/signup attribution
- Understanding what's working

## Key Metrics Hierarchy

| Tier | Category | Metrics | Why It Matters |
|------|----------|---------|----------------|
| **1** | Business Outcomes | Waitlist signups, DMs, email list growth | Direct revenue signal |
| **2** | Engagement Quality | Save rate, share rate, comment sentiment | Content resonance |
| **3** | Engagement Velocity | 30-min engagement, 60-min engagement | Predicts algorithmic boost |
| **4** | Reach & Growth | Follower growth, reach per post | Market expansion |
| **5** | Vanity (Monitor Only) | Total followers, total likes | Directional only |

**Critical rule:** Never surface vanity metrics in isolation. Every metric needs context.

## Engagement Velocity

The key differentiator - performance in first 30-60 minutes predicts viral potential.

```
EVS = engagements_in_first_60_min / reach_in_first_60_min * 100
```

### Velocity Thresholds

| Platform | Low | Average | High | Viral |
|----------|-----|---------|------|-------|
| X/Twitter | <0.5% | 0.5-2% | 2-5% | >5% |
| LinkedIn | <1% | 1-3% | 3-8% | >8% |
| Instagram | <0.5% | 0.5-1.5% | 1.5-4% | >4% |

## Content Performance Score (CPS)

```
CPS = (0.20 * normalized_ERR) +
      (0.15 * normalized_save_rate) +
      (0.20 * normalized_share_rate) +
      (0.15 * normalized_comment_quality) +
      (0.15 * normalized_link_clicks) +
      (0.15 * normalized_engagement_velocity)
```

## UTM Attribution

All social links should include UTM parameters:

```
utm_source=platform (twitter, linkedin, instagram)
utm_medium=organic-social
utm_campaign=content-pillar (identity-craft, build-journey)
utm_content=post-id (2026-02-06-pricing-thread)
utm_term=hook-type (contrarian, data, story)
```

## Weekly Digest Template

```markdown
## Weekly Performance Digest - Week of [Date]

### Headlines
1. [Biggest win]
2. [Biggest learning]
3. [Action needed]

### Scorecard
| Metric | This Week | Last Week | Change |
|--------|-----------|-----------|--------|
| Waitlist signups | 5 | 3 | +67% |
| Engagement rate | 3.2% | 2.8% | +14% |
| New followers | 87 | 62 | +40% |

### Top Performing Content
1. "[Post hook]" - Platform - CPS: 8.2/10
   Why it worked: [Analysis]

### Content Pillar Balance
- Identity & Craft: 40% (target: 40%) - On track
- Build Journey: 30% (target: 30%) - On track
- Industry Insight: 15% (target: 20%) - BELOW

### Recommendations
1. [Action based on data]
2. [Action based on data]
```

## Data Sources

| Platform | Source | Available Metrics |
|----------|--------|-------------------|
| X/Twitter | Typefully Analytics | Impressions, likes, replies, retweets |
| LinkedIn | Typefully / Manual | Likes, comments, shares |
| Instagram | Meta Business Suite | Impressions, reach, saves |

## A/B Testing Methodology

| Element | Method | Min Sample | Duration |
|---------|--------|------------|----------|
| Hook type | Same topic, different hooks | 5 posts/variant | 2-4 weeks |
| Format | Thread vs single post | 5 posts/variant | 2-4 weeks |
| Posting time | Same type at different times | 10 posts/slot | 4 weeks |
| Content pillar | Compare all pillars | 10 posts/pillar | 4-8 weeks |

## Workflow

### Weekly Review (Monday)

```
1. Pull metrics from Typefully (manual for now)
2. Calculate engagement rates per post
3. Identify top 3 performers
4. Analyze why they worked (hook, topic, timing)
5. Check pillar balance
6. Generate digest
7. Recommend adjustments for this week
```

### Post-Publish Check (24h after)

```
1. Check engagement velocity at 30min, 60min (if possible)
2. Compare to account average
3. Flag if velocity > 2x average (potential viral)
4. Note for weekly digest
```

## Insights to Surface

| Insight Type | Trigger | Action |
|-------------|---------|--------|
| Breakout Post | ERR > 2x average | Analyze and replicate |
| Underperforming Pillar | Pillar ERR declining 2+ weeks | Adjust content mix |
| Velocity Alert | Current post velocity > 2x | Engage in comments |
| Attribution Win | Post linked to signup/DM | Note what worked |
| Hook Effectiveness | Hook outperforming average | Add to templates |

## Current Limitations

Since we're not using database tables yet:
- Manual data collection from Typefully
- No automated velocity tracking
- Attribution requires manual UTM checking

## Future Enhancements

When ready to scale:
1. Add `social_metrics` table for automated tracking
2. Add `social_attribution` table for conversion tracking
3. Integrate with Ambient Intelligence panels
4. Automated velocity polling via API

## Example Session

```
User: "How did my posts perform this week?"

Agent:
1. Ask user to share Typefully analytics screenshot or data
2. Calculate engagement rates
3. Identify top performers
4. Analyze patterns (hooks, topics, times)
5. Check pillar balance
6. Generate digest with recommendations
```
