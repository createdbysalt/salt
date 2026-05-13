#!/usr/bin/env python3
"""
Stage 4: ANALYZE

Send captured frames to Claude for reverse-engineering into TSX code.
Uses multimodal input with PROMPT CACHING for cost reduction.
Processes animations in PARALLEL for speed.

Output: code/*.tsx
"""

import asyncio
import base64
import json
import os
import re
from pathlib import Path
from typing import Any

import anthropic
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn

console = Console()

# System prompt - CACHED for all animations
SYSTEM_PROMPT = """You are an expert at reverse-engineering web animations into production Framer Motion code.

You analyze video frames of animations and produce precise, copy-paste ready React components.

## Your Capabilities

1. **Timing Analysis**: Read timestamps burned into frames to measure exact durations
2. **Easing Detection**: Identify easing curves from frame-to-frame progression
3. **Transform Mapping**: Detect which CSS properties change (opacity, transform, etc.)
4. **Code Generation**: Output complete, typed Framer Motion components

## Common Easing Curves

| Feel | Cubic Bezier | Use Case |
|------|-------------|----------|
| Smooth out | `[0.4, 0, 0.2, 1]` | Entrances, fade-ins |
| Smooth in | `[0.4, 0, 1, 1]` | Exits, fade-outs |
| Smooth both | `[0.4, 0, 0.6, 1]` | Morphs, transforms |
| Springy | `[0.34, 1.56, 0.64, 1]` | Playful, bouncy |
| Sharp | `[0.4, 0, 0.6, 1]` | Quick, snappy |

## Trigger Patterns

| Trigger | Framer Motion |
|---------|---------------|
| On viewport enter | `whileInView` + `viewport={{ once: true }}` |
| On hover | `whileHover` |
| On click/tap | `whileTap` or `AnimatePresence` |
| On load | `initial` + `animate` |
| Scroll-linked | `useScroll` + `useTransform` |

## Output Quality

- Use TypeScript with proper prop types
- Include className prop for customization
- Use CSS variables where appropriate
- Add brief comments only for non-obvious behavior
"""

# Analysis prompt template
ANALYSIS_TEMPLATE = """Analyze this animation and generate a Framer Motion component.

## Animation Details
- **ID**: {animation_id}
- **Trigger**: {trigger}
- **Trigger Params**: {trigger_params}
- **Library Hint**: {library_hint}
- **CSS from Recon**: {recon_match}
- **Notes**: {notes}

## Instructions

1. Examine the frames (timestamps in top-left corner)
2. Measure: start time, end time, duration
3. Identify: what properties change, from what values to what
4. Detect: easing curve from frame progression
5. Generate: complete TSX component

## Output Format

Return ONLY this JSON (no markdown):

{{
  "id": "{animation_id}",
  "library": "framer-motion",
  "duration_ms": 420,
  "delay_ms": 0,
  "easing": "[0.4, 0, 0.2, 1]",
  "transform_from": {{ "opacity": 0, "y": 40 }},
  "transform_to": {{ "opacity": 1, "y": 0 }},
  "trigger": "viewport-enter",
  "trigger_options": {{ "once": true, "amount": 0.3 }},
  "confidence": 0.85,
  "notes": "Brief description",
  "code": "<FULL TSX COMPONENT>"
}}

## Component Template

The `code` field must be complete and copy-paste ready:

```tsx
'use client'

import {{ motion }} from 'framer-motion'

interface {component_name}Props {{
  children: React.ReactNode
  className?: string
}}

export function {component_name}({{ children, className }}: {component_name}Props) {{
  return (
    <motion.div
      initial={{{{ opacity: 0, y: 40 }}}}
      whileInView={{{{ opacity: 1, y: 0 }}}}
      viewport={{{{ once: true, amount: 0.3 }}}}
      transition={{{{ duration: 0.42, ease: [0.4, 0, 0.2, 1] }}}}
      className={{className}}
    >
      {{children}}
    </motion.div>
  )
}}
```

Now analyze the frames.
"""


def load_frames_as_base64(frames_dir: Path, max_frames: int = 15) -> list[dict]:
    """Load frames as base64-encoded images for Claude."""
    frames = sorted(frames_dir.glob("frame_*.png"))

    if not frames:
        return []

    # Sample evenly if too many frames
    if len(frames) > max_frames:
        step = len(frames) // max_frames
        frames = frames[::step][:max_frames]

    result = []
    for frame in frames:
        with open(frame, "rb") as f:
            data = base64.standard_b64encode(f.read()).decode("utf-8")
            result.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": data,
                },
            })

    return result


def kebab_to_pascal(s: str) -> str:
    """Convert kebab-case to PascalCase."""
    return "".join(word.capitalize() for word in s.replace("_", "-").split("-"))


async def analyze_animation(
    animation: dict,
    output_dir: Path,
    recon: dict,
    client: anthropic.Anthropic,
    semaphore: asyncio.Semaphore,
) -> dict:
    """Analyze a single animation (with concurrency control)."""

    async with semaphore:
        anim_id = animation["id"]
        frames_dir = output_dir / "frames" / anim_id

        if not frames_dir.exists() or not list(frames_dir.glob("frame_*.png")):
            return {
                "id": anim_id,
                "success": False,
                "error": "No frames found",
            }

        # Load frames
        frames = load_frames_as_base64(frames_dir)
        if not frames:
            return {
                "id": anim_id,
                "success": False,
                "error": "Could not load frames",
            }

        # Find matching recon CSS
        recon_match = "none"
        selector = animation.get("selector", "")
        for css in recon.get("css_animations", []):
            if selector and selector in css.get("selector", ""):
                recon_match = f"{css['property']}: {css['value']}"
                break

        # Build analysis prompt
        component_name = kebab_to_pascal(anim_id)
        prompt = ANALYSIS_TEMPLATE.format(
            animation_id=anim_id,
            trigger=animation.get("trigger", "load"),
            trigger_params=json.dumps(animation.get("trigger_params", {})),
            library_hint=animation.get("library_hint", "unknown"),
            recon_match=recon_match,
            notes=animation.get("notes", ""),
            component_name=component_name,
        )

        # Build message content: text + images
        content = [{"type": "text", "text": prompt}]
        content.extend(frames)

        try:
            # Use synchronous API (anthropic doesn't have native async)
            response = await asyncio.to_thread(
                client.messages.create,
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                system=[
                    {
                        "type": "text",
                        "text": SYSTEM_PROMPT,
                        "cache_control": {"type": "ephemeral"}  # CACHE the system prompt
                    }
                ],
                messages=[{"role": "user", "content": content}],
            )

            # Extract JSON from response
            response_text = response.content[0].text
            result = parse_analysis_result(response_text)
            result["id"] = anim_id
            result["success"] = True

            # Save code to file
            if result.get("code"):
                code_file = output_dir / "code" / f"{anim_id}.tsx"
                code_file.write_text(result["code"])

            return result

        except Exception as e:
            return {
                "id": anim_id,
                "success": False,
                "error": str(e),
            }


def parse_analysis_result(text: str) -> dict:
    """Parse the JSON result from Claude's analysis."""
    # Try to extract JSON
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    return {
        "error": "Could not parse response",
        "raw": text[:500],
    }


async def run_analyze(output_dir: Path, manifest: list[dict], recon: dict) -> list[dict]:
    """
    Run Stage 4 analysis for all captured animations.
    Uses PARALLEL processing with concurrency limit.
    Uses PROMPT CACHING for cost reduction.
    """
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    # Concurrency limit (avoid rate limits)
    semaphore = asyncio.Semaphore(3)

    # Filter to animations with frames
    analyzable = []
    for anim in manifest:
        frames_dir = output_dir / "frames" / anim["id"]
        if frames_dir.exists() and list(frames_dir.glob("frame_*.png")):
            analyzable.append(anim)

    if not analyzable:
        console.print("  [yellow]No animations with frames to analyze[/yellow]")
        return []

    console.print(f"  Analyzing {len(analyzable)} animations in parallel (3 concurrent)...")
    console.print("  [dim]Using prompt caching for cost reduction[/dim]")

    # Process in parallel
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        console=console,
    ) as progress:
        task = progress.add_task("Analyzing...", total=len(analyzable))

        async def analyze_with_progress(anim):
            result = await analyze_animation(anim, output_dir, recon, client, semaphore)
            progress.advance(task)
            return result

        results = await asyncio.gather(
            *[analyze_with_progress(anim) for anim in analyzable]
        )

    # Summary
    successful = [r for r in results if r.get("success")]
    console.print(f"  Generated {len(successful)}/{len(results)} components")

    # Save results summary
    summary_file = output_dir / "analysis-summary.json"
    summary_file.write_text(json.dumps(results, indent=2))

    return results


if __name__ == "__main__":
    output_dir = Path("./output")

    manifest_file = output_dir / "manifest.json"
    if not manifest_file.exists():
        print("Error: manifest.json not found")
        exit(1)

    manifest = json.loads(manifest_file.read_text())

    recon_file = output_dir / "recon.json"
    recon = json.loads(recon_file.read_text()) if recon_file.exists() else {}

    results = asyncio.run(run_analyze(output_dir, manifest, recon))
    print(json.dumps(results, indent=2))
