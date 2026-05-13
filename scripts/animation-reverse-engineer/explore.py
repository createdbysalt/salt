#!/usr/bin/env python3
"""
Stage 2: EXPLORE

Browser Use Cloud AI agent explores the page to find all animations.
Scrolls, hovers, clicks — logs every visual change.

Uses Browser Use Cloud SDK (https://docs.browser-use.com)

Output: manifest.json
"""

import asyncio
import json
import os
from pathlib import Path
from typing import Optional

from browser_use_sdk.v3 import AsyncBrowserUse
from pydantic import BaseModel
from rich.console import Console

console = Console()


# Structured output schema for animations
class AnimationEntry(BaseModel):
    id: str
    selector: str
    trigger: str  # "scroll" | "hover" | "click" | "load"
    trigger_params: dict
    viewport_bbox: Optional[list[int]] = None
    estimated_duration_ms: int
    estimated_easing: str
    library_hint: str
    confidence: float
    notes: str


class AnimationManifest(BaseModel):
    animations: list[AnimationEntry]


# Task prompt for Browser Use agent
EXPLORE_TASK = """
You are an animation hunter. Find EVERY animation on this webpage.

## Recon Data (suspected animations)
{recon_summary}

## Process

1. **Load & Wait**: Navigate to {url}. Wait for full load.

2. **Baseline**: Take a screenshot immediately after load to capture load animations.

3. **Scroll Hunt**: Scroll down the page in ~300px increments.
   - After each scroll, wait 500ms
   - If anything moved, faded, scaled, or transformed — LOG IT
   - Note the scroll position when the animation triggered

4. **Hover Hunt**: Return to top. Find interactive elements:
   - Links, buttons, cards, images with hover states
   - Elements with classes containing: hover, card, btn, link, item, menu
   - Hover each one, wait 300ms, observe any change
   - LOG any hover animations

5. **Click Hunt**: Find toggleable elements:
   - Accordions, tabs, menus, modals, dropdowns
   - Elements with: aria-expanded, data-state, toggle, accordion, tab, menu
   - Click to open, observe animation, click to close
   - LOG any click animations

## What to LOG

For each animation, record:
- id: descriptive kebab-case name (e.g., "hero-title-fade-in")
- selector: CSS selector to target the element
- trigger: "scroll" | "hover" | "click" | "load"
- trigger_params: {{"scroll_y": 500}} or {{"hover_target": "selector"}} etc.
- viewport_bbox: [x, y, width, height] if visible
- estimated_duration_ms: how long the animation takes
- estimated_easing: "ease-out" | "spring" | "linear" | "bounce"
- library_hint: "framer-motion" | "gsap" | "css" | "lottie"
- confidence: 0.0-1.0 how sure you are
- notes: brief description

## What NOT to log
- Focus rings, cursor changes, text selection, scrollbars
- Elements that appear/disappear without animation

Be thorough — premium websites often have 10-20+ animations.
Return all animations found.
"""


async def run_explore(url: str, output_dir: Path, recon: dict) -> list[dict]:
    """
    Run Stage 2 exploration with Browser Use Cloud.

    Args:
        url: Target URL
        output_dir: Output directory
        recon: Recon data from Stage 1

    Returns:
        List of animation manifest entries
    """
    # Prepare recon summary
    recon_summary = f"""
Libraries detected: {', '.join(recon.get('libraries', [])) or 'none'}

CSS animations found ({len(recon.get('css_animations', []))}):
"""
    for anim in recon.get("css_animations", [])[:15]:
        recon_summary += f"- {anim['selector']}: {anim['property']} = {anim['value'][:50]}\n"

    recon_summary += f"\nJS signals: {', '.join(recon.get('js_signals', []))}"

    # Build task
    task = EXPLORE_TASK.format(url=url, recon_summary=recon_summary)

    console.print("  Launching Browser Use Cloud agent...")

    # Initialize client (uses BROWSER_USE_API_KEY env var)
    client = AsyncBrowserUse()

    try:
        # Create session with recording for debugging
        session = await client.sessions.create(
            keep_alive=False,
            enable_recording=True,
        )

        console.print(f"  Session: {session.id}")
        console.print(f"  Live view: {session.live_url}")

        # Run the exploration task with structured output
        result = await client.run(
            task,
            session_id=session.id,
            model="claude-sonnet-4-20250514",
            output_schema=AnimationManifest,
        )

        # Extract manifest
        if hasattr(result, "output") and hasattr(result.output, "animations"):
            manifest = [a.model_dump() for a in result.output.animations]
        else:
            # Fallback: parse from raw output
            manifest = parse_manifest_from_result(result)

        console.print(f"  Found {len(manifest)} animations")

        # Save recording URL if available
        try:
            recording_urls = await client.sessions.wait_for_recording(session.id)
            if recording_urls:
                recording_file = output_dir / "explore-recording.txt"
                recording_file.write_text("\n".join(recording_urls))
                console.print(f"  Recording saved: {recording_file}")
        except Exception:
            pass

        # Save manifest
        output_file = output_dir / "manifest.json"
        output_file.write_text(json.dumps(manifest, indent=2))
        console.print(f"  Saved to {output_file}")

        return manifest

    except Exception as e:
        console.print(f"  [red]Error: {e}[/red]")
        raise

    finally:
        # Clean up session
        try:
            await client.sessions.stop(session.id)
        except Exception:
            pass


def parse_manifest_from_result(result) -> list[dict]:
    """Fallback parser for unstructured output."""
    import re

    text = ""
    if hasattr(result, "output"):
        text = str(result.output)
    elif hasattr(result, "final_result"):
        text = str(result.final_result)

    # Try to find JSON array
    match = re.search(r"\[[\s\S]*\]", text)
    if match:
        try:
            data = json.loads(match.group())
            if isinstance(data, list):
                return data
        except json.JSONDecodeError:
            pass

    console.print("[yellow]  Warning: Could not parse structured output[/yellow]")
    return []


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python explore.py <url>")
        sys.exit(1)

    url = sys.argv[1]
    output_dir = Path("./output")
    output_dir.mkdir(exist_ok=True)

    # Load recon if exists
    recon_file = output_dir / "recon.json"
    recon = json.loads(recon_file.read_text()) if recon_file.exists() else {}

    manifest = asyncio.run(run_explore(url, output_dir, recon))
    print(json.dumps(manifest, indent=2))
