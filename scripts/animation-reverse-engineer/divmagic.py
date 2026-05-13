#!/usr/bin/env python3
"""
DivMagic Integration

Converts a URL to HTML/JSX + Tailwind code using the DivMagic API.
This extracts the static skeleton that animations are applied to.

API Docs: https://docs.divmagic.com/api

Output: skeleton.jsx, skeleton.html
"""

import asyncio
import json
import os
from pathlib import Path

import httpx
from rich.console import Console

console = Console()

DIVMAGIC_API_URL = "https://api.divmagic.com/v1/magic"


async def extract_skeleton(
    url: str,
    output_dir: Path,
    component_format: str = "jsx",
    style_format: str = "tailwind",
    include_media_query: bool = True,
) -> dict:
    """
    Extract HTML/JSX skeleton from a URL using DivMagic.

    Args:
        url: Target URL to extract
        output_dir: Output directory
        component_format: "jsx" or "html"
        style_format: "tailwind", "inline", "local", or "external"
        include_media_query: Include responsive styles

    Returns:
        DivMagic API response with extracted code
    """
    api_key = os.getenv("DIVMAGIC_API_KEY")
    if not api_key:
        raise ValueError("DIVMAGIC_API_KEY environment variable not set")

    console.print(f"  Extracting skeleton from {url}...")
    console.print(f"  Format: {component_format} + {style_format}")

    payload = {
        "apiKey": api_key,
        "url": url,
        "settings": {
            "componentFormat": component_format,
            "styleFormat": style_format,
            "includeMediaQuery": include_media_query,
        },
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            DIVMAGIC_API_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
        )

        if response.status_code != 200:
            console.print(f"  [red]DivMagic API error: {response.status_code}[/red]")
            console.print(f"  {response.text[:500]}")
            raise Exception(f"DivMagic API error: {response.status_code}")

        result = response.json()

    # Save the extracted code
    extension = "jsx" if component_format == "jsx" else "html"
    skeleton_file = output_dir / f"skeleton.{extension}"

    # DivMagic returns the code in different fields depending on format
    code = result.get("code") or result.get("html") or result.get("jsx") or ""

    if code:
        skeleton_file.write_text(code)
        console.print(f"  Saved skeleton to {skeleton_file}")
        console.print(f"  Size: {len(code):,} characters")
    else:
        console.print("  [yellow]Warning: No code returned from DivMagic[/yellow]")

    # Save full response for debugging
    debug_file = output_dir / "divmagic-response.json"
    debug_file.write_text(json.dumps(result, indent=2, default=str))

    return result


async def run_divmagic(url: str, output_dir: Path) -> dict:
    """
    Run DivMagic extraction as part of the pipeline.

    Extracts both JSX and HTML versions for flexibility.

    Args:
        url: Target URL
        output_dir: Output directory

    Returns:
        Combined results
    """
    console.print("\n[bold blue]DivMagic: SKELETON EXTRACTION[/bold blue]")

    results = {}

    # Extract JSX + Tailwind (primary)
    try:
        results["jsx"] = await extract_skeleton(
            url,
            output_dir,
            component_format="jsx",
            style_format="tailwind",
        )
    except Exception as e:
        console.print(f"  [red]JSX extraction failed: {e}[/red]")
        results["jsx"] = {"error": str(e)}

    # Also extract HTML + Tailwind (fallback)
    try:
        results["html"] = await extract_skeleton(
            url,
            output_dir,
            component_format="html",
            style_format="tailwind",
        )
    except Exception as e:
        console.print(f"  [yellow]HTML extraction failed: {e}[/yellow]")
        results["html"] = {"error": str(e)}

    return results


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python divmagic.py <url>")
        print("")
        print("Environment variables:")
        print("  DIVMAGIC_API_KEY - Your DivMagic API key")
        sys.exit(1)

    url = sys.argv[1]
    output_dir = Path("./output")
    output_dir.mkdir(exist_ok=True)

    result = asyncio.run(run_divmagic(url, output_dir))
    print(json.dumps(result, indent=2, default=str))
