#!/usr/bin/env python3
"""
Design Token Extraction

Extracts the visual "feel" of a page:
- Colors (backgrounds, text, accents, borders)
- Typography (fonts, sizes, weights, line-heights)
- Spacing (padding, margins, gaps)
- Borders & Shadows
- Motion tokens (from animation analysis)

Outputs CSS variables that can be swapped for client branding.

Output: design-tokens.json, brand-layer.css
"""

import asyncio
import json
import re
from pathlib import Path
from collections import Counter

from playwright.async_api import async_playwright
from rich.console import Console

console = Console()


async def extract_design_tokens(url: str, output_dir: Path) -> dict:
    """
    Extract design tokens from a page.

    Returns a structured token system that captures the page's visual feel.
    """
    console.print(f"  Extracting design tokens from {url}...")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
        )
        page = await context.new_page()

        await page.goto(url, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)

        # Extract tokens via JavaScript
        tokens = await page.evaluate("""
        () => {
            const tokens = {
                colors: {
                    backgrounds: [],
                    text: [],
                    borders: [],
                    accents: [],
                },
                typography: {
                    fonts: [],
                    headings: [],
                    body: [],
                },
                spacing: {
                    padding: [],
                    margin: [],
                    gap: [],
                },
                borders: {
                    radius: [],
                    width: [],
                },
                shadows: [],
                transitions: {
                    durations: [],
                    easings: [],
                },
            };

            // Get all elements
            const elements = document.querySelectorAll('*');
            const seen = {
                colors: new Set(),
                fonts: new Set(),
                spacing: new Set(),
                shadows: new Set(),
            };

            elements.forEach(el => {
                const style = getComputedStyle(el);

                // Colors
                const bgColor = style.backgroundColor;
                if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && !seen.colors.has(bgColor)) {
                    seen.colors.add(bgColor);
                    tokens.colors.backgrounds.push(bgColor);
                }

                const textColor = style.color;
                if (textColor && !seen.colors.has('text:' + textColor)) {
                    seen.colors.add('text:' + textColor);
                    tokens.colors.text.push(textColor);
                }

                const borderColor = style.borderColor;
                if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)' && !seen.colors.has('border:' + borderColor)) {
                    seen.colors.add('border:' + borderColor);
                    tokens.colors.borders.push(borderColor);
                }

                // Typography
                const fontFamily = style.fontFamily;
                if (fontFamily && !seen.fonts.has(fontFamily)) {
                    seen.fonts.add(fontFamily);
                    tokens.typography.fonts.push(fontFamily);
                }

                const tagName = el.tagName.toLowerCase();
                if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                    tokens.typography.headings.push({
                        tag: tagName,
                        fontSize: style.fontSize,
                        fontWeight: style.fontWeight,
                        lineHeight: style.lineHeight,
                        letterSpacing: style.letterSpacing,
                    });
                } else if (['p', 'span', 'li', 'a'].includes(tagName) && el.textContent.trim().length > 20) {
                    const bodyStyle = {
                        fontSize: style.fontSize,
                        fontWeight: style.fontWeight,
                        lineHeight: style.lineHeight,
                    };
                    const key = JSON.stringify(bodyStyle);
                    if (!seen.spacing.has('body:' + key)) {
                        seen.spacing.add('body:' + key);
                        tokens.typography.body.push(bodyStyle);
                    }
                }

                // Spacing (sample from sections and containers)
                if (tagName === 'section' || el.className.includes('container') || el.className.includes('wrapper')) {
                    const padding = style.padding;
                    if (padding && padding !== '0px' && !seen.spacing.has('p:' + padding)) {
                        seen.spacing.add('p:' + padding);
                        tokens.spacing.padding.push(padding);
                    }
                }

                const gap = style.gap;
                if (gap && gap !== 'normal' && !seen.spacing.has('g:' + gap)) {
                    seen.spacing.add('g:' + gap);
                    tokens.spacing.gap.push(gap);
                }

                // Borders
                const borderRadius = style.borderRadius;
                if (borderRadius && borderRadius !== '0px' && !seen.spacing.has('br:' + borderRadius)) {
                    seen.spacing.add('br:' + borderRadius);
                    tokens.borders.radius.push(borderRadius);
                }

                // Shadows
                const boxShadow = style.boxShadow;
                if (boxShadow && boxShadow !== 'none' && !seen.shadows.has(boxShadow)) {
                    seen.shadows.add(boxShadow);
                    tokens.shadows.push(boxShadow);
                }

                // Transitions
                const transition = style.transition;
                if (transition && transition !== 'all 0s ease 0s') {
                    const durationMatch = transition.match(/([\d.]+)s/);
                    if (durationMatch) {
                        tokens.transitions.durations.push(parseFloat(durationMatch[1]) * 1000);
                    }
                    const easingMatch = transition.match(/cubic-bezier\([^)]+\)/);
                    if (easingMatch) {
                        tokens.transitions.easings.push(easingMatch[0]);
                    }
                }
            });

            return tokens;
        }
        """)

        await browser.close()

    # Process and dedupe tokens
    processed = process_tokens(tokens)

    # Save tokens
    tokens_file = output_dir / "design-tokens.json"
    tokens_file.write_text(json.dumps(processed, indent=2))
    console.print(f"  Saved design tokens to {tokens_file}")

    # Generate CSS variables
    css = generate_brand_layer_css(processed)
    css_file = output_dir / "brand-layer.css"
    css_file.write_text(css)
    console.print(f"  Saved brand layer CSS to {css_file}")

    return processed


def process_tokens(raw: dict) -> dict:
    """Process raw tokens into a usable design system."""

    def most_common(items, n=5):
        """Get most common items."""
        if not items:
            return []
        counter = Counter(str(x) if isinstance(x, dict) else x for x in items)
        return [item for item, _ in counter.most_common(n)]

    def dedupe_headings(headings):
        """Get unique heading styles by tag."""
        by_tag = {}
        for h in headings:
            tag = h.get('tag', 'h1')
            if tag not in by_tag:
                by_tag[tag] = h
        return list(by_tag.values())

    return {
        "colors": {
            "primary": {
                "backgrounds": most_common(raw["colors"]["backgrounds"], 3),
                "text": most_common(raw["colors"]["text"], 3),
                "borders": most_common(raw["colors"]["borders"], 2),
            },
            "all": {
                "backgrounds": list(set(raw["colors"]["backgrounds"]))[:10],
                "text": list(set(raw["colors"]["text"]))[:10],
                "borders": list(set(raw["colors"]["borders"]))[:5],
            }
        },
        "typography": {
            "fonts": list(set(raw["typography"]["fonts"]))[:3],
            "headings": dedupe_headings(raw["typography"]["headings"]),
            "body": most_common(raw["typography"]["body"], 2),
        },
        "spacing": {
            "padding": most_common(raw["spacing"]["padding"], 5),
            "gap": most_common(raw["spacing"]["gap"], 5),
        },
        "borders": {
            "radius": most_common(raw["borders"]["radius"], 4),
        },
        "shadows": most_common(raw["shadows"], 3),
        "motion": {
            "durations": sorted(set(raw["transitions"]["durations"]))[:5],
            "easings": list(set(raw["transitions"]["easings"]))[:3],
        }
    }


def generate_brand_layer_css(tokens: dict) -> str:
    """Generate CSS variables for easy brand swapping."""

    lines = [
        "/* Brand Layer - Swap these for client branding */",
        "/* Generated by animation-reverse-engineer */",
        "",
        ":root {",
        "  /* =========================== */",
        "  /* COLORS - Easy to swap      */",
        "  /* =========================== */",
    ]

    # Colors
    colors = tokens.get("colors", {}).get("primary", {})
    bgs = colors.get("backgrounds", [])
    texts = colors.get("text", [])

    if bgs:
        lines.append(f"  --color-bg-primary: {bgs[0]};")
        if len(bgs) > 1:
            lines.append(f"  --color-bg-secondary: {bgs[1]};")
        if len(bgs) > 2:
            lines.append(f"  --color-bg-accent: {bgs[2]};")

    if texts:
        lines.append(f"  --color-text-primary: {texts[0]};")
        if len(texts) > 1:
            lines.append(f"  --color-text-secondary: {texts[1]};")
        if len(texts) > 2:
            lines.append(f"  --color-text-muted: {texts[2]};")

    lines.extend([
        "",
        "  /* =========================== */",
        "  /* TYPOGRAPHY                  */",
        "  /* =========================== */",
    ])

    # Typography
    fonts = tokens.get("typography", {}).get("fonts", [])
    if fonts:
        # Clean font names
        primary_font = fonts[0].split(",")[0].strip().strip("'\"")
        lines.append(f"  --font-primary: {fonts[0]};")
        if len(fonts) > 1:
            lines.append(f"  --font-secondary: {fonts[1]};")

    # Headings
    headings = tokens.get("typography", {}).get("headings", [])
    for h in headings:
        tag = h.get("tag", "h1")
        lines.append(f"  --{tag}-size: {h.get('fontSize', '2rem')};")
        lines.append(f"  --{tag}-weight: {h.get('fontWeight', '700')};")
        lines.append(f"  --{tag}-leading: {h.get('lineHeight', '1.2')};")

    lines.extend([
        "",
        "  /* =========================== */",
        "  /* SPACING                     */",
        "  /* =========================== */",
    ])

    # Spacing
    padding = tokens.get("spacing", {}).get("padding", [])
    for i, p in enumerate(padding[:3]):
        lines.append(f"  --spacing-section-{i+1}: {p};")

    gap = tokens.get("spacing", {}).get("gap", [])
    for i, g in enumerate(gap[:3]):
        lines.append(f"  --spacing-gap-{i+1}: {g};")

    lines.extend([
        "",
        "  /* =========================== */",
        "  /* BORDERS & SHADOWS           */",
        "  /* =========================== */",
    ])

    # Borders
    radius = tokens.get("borders", {}).get("radius", [])
    for i, r in enumerate(radius[:3]):
        lines.append(f"  --radius-{i+1}: {r};")

    # Shadows
    shadows = tokens.get("shadows", [])
    for i, s in enumerate(shadows[:2]):
        lines.append(f"  --shadow-{i+1}: {s};")

    lines.extend([
        "",
        "  /* =========================== */",
        "  /* MOTION                      */",
        "  /* =========================== */",
    ])

    # Motion
    durations = tokens.get("motion", {}).get("durations", [])
    for i, d in enumerate(durations[:3]):
        lines.append(f"  --duration-{i+1}: {d}ms;")

    easings = tokens.get("motion", {}).get("easings", [])
    for i, e in enumerate(easings[:2]):
        lines.append(f"  --easing-{i+1}: {e};")

    lines.extend([
        "}",
        "",
        "/* Dark mode overrides - customize as needed */",
        "@media (prefers-color-scheme: dark) {",
        "  :root {",
        "    /* Swap colors for dark mode */",
        "  }",
        "}",
    ])

    return "\n".join(lines)


async def run_token_extraction(url: str, output_dir: Path) -> dict:
    """Run design token extraction as part of the pipeline."""
    console.print("\n[bold cyan]TOKENS: DESIGN SYSTEM EXTRACTION[/bold cyan]")

    tokens = await extract_design_tokens(url, output_dir)

    # Summary
    console.print(f"  Colors: {len(tokens['colors']['all']['backgrounds'])} backgrounds, {len(tokens['colors']['all']['text'])} text")
    console.print(f"  Fonts: {len(tokens['typography']['fonts'])}")
    console.print(f"  Headings: {len(tokens['typography']['headings'])} styles")
    console.print(f"  Motion: {len(tokens['motion']['durations'])} durations, {len(tokens['motion']['easings'])} easings")

    return tokens


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python tokens.py <url>")
        sys.exit(1)

    url = sys.argv[1]
    output_dir = Path("./output")
    output_dir.mkdir(exist_ok=True)

    tokens = asyncio.run(run_token_extraction(url, output_dir))
    print(json.dumps(tokens, indent=2))
