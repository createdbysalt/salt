#!/usr/bin/env python3
"""
Stage 1: RECON

Identify animation libraries and extract CSS animation rules from a URL.
No AI involved - pure static analysis.

Output: recon.json
"""

import asyncio
import json
import re
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
from rich.console import Console

console = Console()

# Animation library signatures
LIBRARY_SIGNATURES = {
    "gsap": ["gsap", "TweenMax", "TweenLite", "TimelineMax", "TimelineLite", "ScrollTrigger"],
    "framer-motion": ["framer-motion", "motion/react", "useMotionValue", "useSpring", "useTransform"],
    "aos": ["aos", "data-aos"],
    "lenis": ["lenis", "@studio-freight/lenis"],
    "lottie": ["lottie", "lottie-web", "lottie-player"],
    "anime": ["anime", "animejs"],
    "motion-one": ["motion", "@motionone"],
    "locomotive": ["locomotive-scroll"],
    "splitting": ["splitting"],
    "barba": ["barba", "@barba/core"],
}

# CSS properties that indicate animation
CSS_ANIMATION_PROPERTIES = [
    "transition",
    "animation",
    "animation-name",
    "animation-duration",
    "animation-timing-function",
    "transform",
    "will-change",
    "scroll-snap",
    "view-timeline",
]

# JS signals that indicate animation code
JS_SIGNALS = [
    "ScrollTrigger",
    "useScroll",
    "useTransform",
    "useSpring",
    "useMotionValue",
    "IntersectionObserver",
    "requestAnimationFrame",
    "gsap.to",
    "gsap.from",
    "gsap.fromTo",
    "timeline",
    "animate(",
    "motion.",
    "whileInView",
    "whileHover",
    "variants",
]


async def fetch_page_content(url: str) -> tuple[str, list[str], list[str]]:
    """
    Fetch fully rendered page using Playwright.
    Returns: (html, stylesheets_content, scripts_content)
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )
        page = await context.new_page()

        # Collect loaded resources
        stylesheets = []
        scripts = []

        async def handle_response(response):
            content_type = response.headers.get("content-type", "")
            if "text/css" in content_type or response.url.endswith(".css"):
                try:
                    text = await response.text()
                    stylesheets.append(text)
                except:
                    pass
            elif "javascript" in content_type or response.url.endswith(".js"):
                try:
                    text = await response.text()
                    scripts.append(text)
                except:
                    pass

        page.on("response", handle_response)

        await page.goto(url, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)  # Extra wait for JS execution

        html = await page.content()

        await browser.close()

        return html, stylesheets, scripts


def detect_libraries(html: str, scripts: list[str]) -> list[str]:
    """Detect which animation libraries are in use."""
    detected = set()

    # Check HTML (script tags, data attributes)
    html_lower = html.lower()
    for lib, signatures in LIBRARY_SIGNATURES.items():
        for sig in signatures:
            if sig.lower() in html_lower:
                detected.add(lib)
                break

    # Check JS bundles
    all_scripts = "\n".join(scripts)
    for lib, signatures in LIBRARY_SIGNATURES.items():
        for sig in signatures:
            if sig in all_scripts:
                detected.add(lib)
                break

    return sorted(detected)


def extract_css_animations(html: str, stylesheets: list[str]) -> list[dict]:
    """Extract CSS rules containing animation properties."""
    animations = []

    # Parse inline styles
    soup = BeautifulSoup(html, "lxml")
    for style in soup.find_all("style"):
        if style.string:
            stylesheets.append(style.string)

    # Parse all CSS
    all_css = "\n".join(stylesheets)

    # Find rules with animation properties
    # Simple regex-based extraction (not a full CSS parser)
    rule_pattern = re.compile(r"([^{}]+)\{([^{}]+)\}", re.MULTILINE)

    for match in rule_pattern.finditer(all_css):
        selector = match.group(1).strip()
        declarations = match.group(2)

        # Check each animation property
        for prop in CSS_ANIMATION_PROPERTIES:
            prop_pattern = re.compile(rf"{prop}\s*:\s*([^;]+);?", re.IGNORECASE)
            prop_match = prop_pattern.search(declarations)
            if prop_match:
                value = prop_match.group(1).strip()
                # Skip generic/trivial values
                if value in ["none", "initial", "inherit", "unset"]:
                    continue
                animations.append({
                    "selector": selector.split(",")[0].strip()[:100],  # First selector, truncated
                    "property": prop,
                    "value": value[:200],  # Truncate long values
                })

    # Extract @keyframes
    keyframe_pattern = re.compile(r"@keyframes\s+([\w-]+)\s*\{", re.IGNORECASE)
    for match in keyframe_pattern.finditer(all_css):
        animations.append({
            "selector": f"@keyframes {match.group(1)}",
            "property": "keyframes",
            "value": match.group(1),
        })

    # Dedupe
    seen = set()
    unique = []
    for a in animations:
        key = (a["selector"], a["property"])
        if key not in seen:
            seen.add(key)
            unique.append(a)

    return unique


def extract_js_signals(scripts: list[str]) -> list[str]:
    """Find JS signals that indicate animation code."""
    found = set()
    all_scripts = "\n".join(scripts)

    for signal in JS_SIGNALS:
        if signal in all_scripts:
            found.add(signal)

    return sorted(found)


async def run_recon(url: str, output_dir: Path) -> dict:
    """
    Run Stage 1 recon on a URL.

    Returns:
        {
            "url": str,
            "libraries": list[str],
            "css_animations": list[dict],
            "js_signals": list[str]
        }
    """
    console.print(f"  Fetching {url}...")
    html, stylesheets, scripts = await fetch_page_content(url)

    console.print(f"  Analyzing {len(stylesheets)} stylesheets, {len(scripts)} scripts...")

    libraries = detect_libraries(html, scripts)
    css_animations = extract_css_animations(html, stylesheets)
    js_signals = extract_js_signals(scripts)

    result = {
        "url": url,
        "libraries": libraries,
        "css_animations": css_animations[:100],  # Cap at 100
        "js_signals": js_signals,
    }

    # Save to file
    output_file = output_dir / "recon.json"
    output_file.write_text(json.dumps(result, indent=2))
    console.print(f"  Saved to {output_file}")

    return result


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python recon.py <url>")
        sys.exit(1)

    url = sys.argv[1]
    output_dir = Path("./output")
    output_dir.mkdir(exist_ok=True)

    result = asyncio.run(run_recon(url, output_dir))
    print(json.dumps(result, indent=2))
