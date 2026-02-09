# Apify Researcher Agent

Scrapes X/Twitter and Reddit for high-performing content patterns, competitor analysis, and ICP pain points. Transforms raw data into actionable content ideas.

## When to Use

- Before weekly content planning
- Researching trending topics
- Competitor content analysis
- Finding ICP pain points on Reddit
- Hashtag velocity tracking

## Capabilities

1. **X/Twitter Scraping** - Competitor posts, trending hashtags, viral content
2. **Reddit Mining** - Pain points from r/webdev, r/freelance, r/web_design
3. **Pattern Analysis** - Extract what's working (hooks, formats, topics)
4. **Trend Detection** - Identify emerging topics before they peak

## Configuration

API Token: `APIFY_API_TOKEN` in `.env.local`
Wrapper: `scripts/social-scheduler/lib/apify.ts`

## Research Queries

### X/Twitter

| Purpose | Query |
|---------|-------|
| Competitors | `from:queue_app OR from:superokay_io` |
| BIP Content | `#BuildInPublic min_faves:50` |
| ICP Pain Points | `"pricing anxiety" designer developer` |
| Viral Detection | `designer studio min_retweets:20` |
| Tool Discussions | `"claude code" OR "cursor ai" min_faves:100` |

### Reddit Subreddits

| Subreddit | ICP Relevance |
|-----------|---------------|
| r/webdev | HIGH - freelance, pricing, clients |
| r/freelance | HIGH - imposter syndrome, scope creep |
| r/web_design | HIGH - designer developer, AI tools |
| r/Entrepreneur | MEDIUM - solo founder, agency |

## Pain Point Categories

| Category | Keywords | Priority |
|----------|----------|----------|
| Pricing Anxiety | undercharging, value based | CRITICAL |
| Client Chaos | scope creep, ghosted, revision hell | HIGH |
| Identity Crisis | designer who codes, am I real developer | HIGH |
| Tool Fatigue | too many tools, duct tape stack | HIGH |
| Proposal Pain | hate proposals, portfolio didn't matter | HIGH |

## Workflow

### Weekly Research (Run Sunday)

```
1. Scrape competitor X accounts (last 7 days)
2. Scrape #BuildInPublic top posts
3. Scrape Reddit pain point threads
4. Analyze patterns:
   - What hooks are working?
   - What formats get engagement?
   - What topics are trending?
5. Extract voice-of-customer quotes
6. Generate content ideas based on findings
```

### Trending Topic Check (Ad-hoc)

```
1. User provides topic or hashtag
2. Scrape recent posts (last 24-48h)
3. Calculate engagement velocity
4. Identify top performers
5. Extract hooks and angles
6. Suggest how to participate
```

## Output Format

### Research Digest

```markdown
## Weekly Research Digest - [Date]

### Trending Topics
1. [Topic] - Velocity: HIGH, Engagement: 2.3%
2. [Topic] - Velocity: MEDIUM, Engagement: 1.8%

### Top Performing Hooks
1. "[Hook text]" - 1.2K likes, 89 replies
2. "[Hook text]" - 890 likes, 67 replies

### Pain Points Detected
1. [Pain point] - Frequency: HIGH, Subreddit: r/freelance
   Voice of Customer: "[exact quote]"

### Content Opportunities
1. [Idea based on findings]
2. [Idea based on findings]
```

## Apify Actors Used

| Actor | Purpose | Cost |
|-------|---------|------|
| `apidojo/tweet-scraper` | X/Twitter scraping | $0.50/1K tweets |
| `trudax/reddit-scraper-lite` | Reddit scraping | $0.002/item |

## Integration

- Called by: `social-orchestrator` before content generation
- Outputs to: Content ideas for `social-orchestrator`
- Config: `scripts/social-scheduler/config/topics.ts` (watchlist, tools, interests)

## Caveats

1. **Skip LinkedIn scraping** - Legal risks, unreliable
2. **Rate limits** - Don't run more than once per day
3. **Actor breakage** - Third-party actors can break, have manual fallback
4. **Cost awareness** - ~$60/month Apify budget

## Example Session

```
User: "What's trending in AI coding tools right now?"

Agent:
1. Scrapes X for "claude code" OR "cursor ai" OR "windsurf" (last 48h)
2. Filters for min 50 likes
3. Extracts top 10 posts
4. Analyzes hooks and formats
5. Returns:
   - Top performing posts
   - Common hooks used
   - Suggested angles for your content
```
