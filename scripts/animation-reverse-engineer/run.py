#!/usr/bin/env python3
"""
Page Replication Pipeline

Extracts the complete "feel" of a webpage and outputs a working Next.js page
with animations, design tokens, and branding layer ready for client customization.

Stages:
  0. DivMagic     - Extract JSX skeleton with Tailwind
  1. Recon        - Detect animation libraries + CSS rules
  1.5 Tokens      - Extract design system (colors, typography, spacing)
  2. Explore      - Browser Use Cloud finds all animations
  3. Capture      - Playwright records at 60fps (parallel)
  4. Analyze      - Claude generates TSX components (parallel + cached)
  5. Merge        - Combine into working page with brand layer

Usage:
    python run.py https://example.com
    python run.py https://example.com --skip-stages 0,2
    python run.py https://example.com --no-divmagic
    python run.py https://example.com --merge-only
"""

import asyncio
import json
import os
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

import click
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

# Load environment variables
load_dotenv()

console = Console()

# Output directory
OUTPUT_BASE = Path(__file__).parent.parent.parent / ".claude" / "replicator-output"


def get_site_slug(url: str) -> str:
    """Convert URL to a filesystem-safe slug."""
    parsed = urlparse(url)
    domain = parsed.netloc.replace("www.", "")
    slug = domain.replace(".", "-").replace(":", "-")
    return slug


def ensure_output_dirs(slug: str) -> Path:
    """Create output directory structure."""
    base = OUTPUT_BASE / slug
    (base / "captures").mkdir(parents=True, exist_ok=True)
    (base / "frames").mkdir(parents=True, exist_ok=True)
    (base / "traces").mkdir(parents=True, exist_ok=True)
    (base / "code").mkdir(parents=True, exist_ok=True)
    (base / "components").mkdir(parents=True, exist_ok=True)
    (base / "styles").mkdir(parents=True, exist_ok=True)
    return base


def check_env_vars() -> dict:
    """Check required environment variables."""
    return {
        "ANTHROPIC_API_KEY": bool(os.getenv("ANTHROPIC_API_KEY")),
        "BROWSER_USE_API_KEY": bool(os.getenv("BROWSER_USE_API_KEY")),
        "DIVMAGIC_API_KEY": bool(os.getenv("DIVMAGIC_API_KEY")),
    }


async def run_stage_0(url: str, output_dir: Path) -> dict:
    """Stage 0: DivMagic skeleton extraction."""
    from divmagic import run_divmagic

    console.print("\n[bold magenta]Stage 0: DIVMAGIC[/bold magenta]")
    console.print("Extracting JSX + Tailwind skeleton...")

    result = await run_divmagic(url, output_dir)

    jsx_ok = "error" not in result.get("jsx", {})
    console.print(f"  Skeleton: [{'green' if jsx_ok else 'red'}]{'OK' if jsx_ok else 'FAILED'}[/]")

    return result


async def run_stage_1(url: str, output_dir: Path) -> dict:
    """Stage 1: Recon - detect libraries and CSS rules."""
    from recon import run_recon

    console.print("\n[bold blue]Stage 1: RECON[/bold blue]")
    console.print("Detecting animation libraries and CSS rules...")

    result = await run_recon(url, output_dir)

    console.print(f"  Libraries: [cyan]{', '.join(result.get('libraries', [])) or 'none'}[/cyan]")
    console.print(f"  CSS animations: [cyan]{len(result.get('css_animations', []))}[/cyan]")

    return result


async def run_stage_1_5(url: str, output_dir: Path) -> dict:
    """Stage 1.5: Extract design tokens."""
    from tokens import run_token_extraction

    result = await run_token_extraction(url, output_dir)
    return result


async def run_stage_2(url: str, output_dir: Path, recon: dict) -> list:
    """Stage 2: Browser Use Cloud exploration."""
    from explore import run_explore

    console.print("\n[bold blue]Stage 2: EXPLORE[/bold blue]")
    console.print("Browser Use Cloud agent finding animations...")

    manifest = await run_explore(url, output_dir, recon)

    console.print(f"  Found: [green]{len(manifest)} animations[/green]")
    for anim in manifest[:5]:
        console.print(f"    - {anim['id']} ({anim['trigger']})")
    if len(manifest) > 5:
        console.print(f"    ... and {len(manifest) - 5} more")

    return manifest


async def run_stage_3(url: str, output_dir: Path, manifest: list, animations_filter: list = None) -> list:
    """Stage 3: Capture animations at 60fps."""
    from capture import run_capture

    console.print("\n[bold blue]Stage 3: CAPTURE[/bold blue]")

    if animations_filter:
        manifest = [a for a in manifest if a["id"] in animations_filter]
        console.print(f"Filtered to: {', '.join(animations_filter)}")

    console.print(f"Recording {len(manifest)} animations at 60fps...")

    captured = await run_capture(url, output_dir, manifest)

    successful = sum(1 for c in captured if c.get("success"))
    console.print(f"  Captured: [green]{successful}/{len(manifest)}[/green]")

    return captured


async def run_stage_4(output_dir: Path, manifest: list, recon: dict) -> list:
    """Stage 4: Analyze with Claude (parallel + cached)."""
    from analyze import run_analyze

    console.print("\n[bold blue]Stage 4: ANALYZE[/bold blue]")
    console.print("Claude analyzing frames → Framer Motion TSX...")
    console.print("[dim]Using parallel processing + prompt caching[/dim]")

    results = await run_analyze(output_dir, manifest, recon)

    successful = [r for r in results if r.get("success")]
    console.print(f"  Components: [green]{len(successful)}/{len(results)}[/green]")

    return results


async def run_stage_5(output_dir: Path) -> dict:
    """Stage 5: Merge into working page."""
    from merge import run_merge

    result = await run_merge(output_dir)
    return result


def print_summary(output_dir: Path, results: dict, elapsed: float):
    """Print final summary."""
    console.print("\n")

    # Output structure
    table = Table(title="Page Replication Complete")
    table.add_column("Output", style="cyan")
    table.add_column("Description", style="white")
    table.add_column("Status", style="green")

    outputs = [
        ("skeleton.jsx", "Page structure (DivMagic)", output_dir / "skeleton.jsx"),
        ("design-tokens.json", "Colors, typography, spacing", output_dir / "design-tokens.json"),
        ("brand-layer.css", "CSS variables for branding", output_dir / "brand-layer.css"),
        ("manifest.json", "Animation inventory", output_dir / "manifest.json"),
        ("components/ReplicatedPage.tsx", "Complete animated page", output_dir / "components" / "ReplicatedPage.tsx"),
        ("components/animations/", "Framer Motion components", output_dir / "components" / "animations"),
        ("page.tsx", "Next.js page entry", output_dir / "page.tsx"),
    ]

    for name, desc, path in outputs:
        exists = path.exists() if not str(path).endswith("/") else path.is_dir()
        status = "[green]✓[/green]" if exists else "[dim]—[/dim]"
        table.add_row(name, desc, status)

    console.print(table)

    # Stats
    animations_dir = output_dir / "components" / "animations"
    anim_count = len(list(animations_dir.glob("*.tsx"))) if animations_dir.exists() else 0

    console.print(f"\n[dim]Elapsed: {elapsed:.1f}s[/dim]")
    console.print(f"[dim]Animations: {anim_count} components[/dim]")
    console.print(f"[dim]Output: {output_dir}[/dim]")

    # Next steps
    console.print("\n[bold]Next Steps:[/bold]")
    console.print("1. Copy `components/` and `styles/` to your Next.js project")
    console.print("2. Edit `styles/brand-tokens.css` with client's colors/fonts")
    console.print("3. Import `<ReplicatedPage />` in your page")
    console.print("")
    console.print(f"[bold green]Done![/bold green] Open: [cyan]open {output_dir}[/cyan]")


@click.command()
@click.argument("url")
@click.option("--skip-stages", default="", help="Stages to skip (0,1,2,3,4,5)")
@click.option("--animations", default="", help="Specific animation IDs to process")
@click.option("--no-divmagic", is_flag=True, help="Skip DivMagic skeleton")
@click.option("--merge-only", is_flag=True, help="Only run merge stage (Stage 5)")
@click.option("--open-output", is_flag=True, help="Open output folder when done")
def main(url: str, skip_stages: str, animations: str, no_divmagic: bool, merge_only: bool, open_output: bool):
    """
    Replicate a webpage into a working Next.js page with animations.

    Extracts the complete "feel" — layout, animations, colors, typography —
    and outputs components ready for client branding customization.

    Examples:
        python run.py https://linear.app
        python run.py https://vercel.com --no-divmagic
        python run.py https://stripe.com --merge-only
    """
    # Validate URL
    if not url.startswith("http"):
        url = f"https://{url}"

    # Parse options
    skip = set(int(s) for s in skip_stages.split(",") if s)
    if no_divmagic:
        skip.add(0)
    if merge_only:
        skip.update([0, 1, 2, 3, 4])  # Only run stage 5
    animations_filter = [a.strip() for a in animations.split(",") if a.strip()] or None

    # Setup
    slug = get_site_slug(url)
    output_dir = ensure_output_dirs(slug)

    # Check env vars
    env_status = check_env_vars()

    console.print(Panel(
        f"[bold]Page Replication Pipeline[/bold]\n\n"
        f"URL: {url}\n"
        f"Output: {output_dir}\n"
        f"Skip: {sorted(skip) or 'none'}\n\n"
        f"[dim]API Keys:[/dim]\n"
        f"  ANTHROPIC: [{'green' if env_status['ANTHROPIC_API_KEY'] else 'red'}]{'✓' if env_status['ANTHROPIC_API_KEY'] else '✗'}[/]\n"
        f"  BROWSER_USE: [{'green' if env_status['BROWSER_USE_API_KEY'] else 'red'}]{'✓' if env_status['BROWSER_USE_API_KEY'] else '✗'}[/]\n"
        f"  DIVMAGIC: [{'green' if env_status['DIVMAGIC_API_KEY'] else 'yellow'}]{'✓' if env_status['DIVMAGIC_API_KEY'] else '—'}[/]",
        title="Starting"
    ))

    # Validate required keys
    if not env_status["ANTHROPIC_API_KEY"]:
        console.print("[red]Error: ANTHROPIC_API_KEY required[/red]")
        sys.exit(1)

    if 2 not in skip and not env_status["BROWSER_USE_API_KEY"]:
        console.print("[red]Error: BROWSER_USE_API_KEY required for exploration[/red]")
        console.print("Skip with --skip-stages 2 or add the key to .env.local")
        sys.exit(1)

    start_time = time.time()

    async def run_pipeline():
        results = {
            "divmagic": {},
            "recon": {},
            "tokens": {},
            "manifest": [],
            "captured": [],
            "analyzed": [],
            "merged": {},
        }

        # Stage 0: DivMagic
        if 0 not in skip and env_status["DIVMAGIC_API_KEY"]:
            try:
                results["divmagic"] = await run_stage_0(url, output_dir)
            except Exception as e:
                console.print(f"[yellow]Stage 0 error: {e}[/yellow]")
        elif 0 not in skip:
            console.print("[dim]Stage 0 skipped (no DIVMAGIC_API_KEY)[/dim]")

        # Stage 1: Recon
        if 1 not in skip:
            results["recon"] = await run_stage_1(url, output_dir)
        else:
            recon_file = output_dir / "recon.json"
            if recon_file.exists():
                results["recon"] = json.loads(recon_file.read_text())

        # Stage 1.5: Tokens
        if 1 not in skip:  # Run with recon
            try:
                results["tokens"] = await run_stage_1_5(url, output_dir)
            except Exception as e:
                console.print(f"[yellow]Token extraction error: {e}[/yellow]")

        # Stage 2: Explore
        if 2 not in skip:
            results["manifest"] = await run_stage_2(url, output_dir, results["recon"])
        else:
            manifest_file = output_dir / "manifest.json"
            if manifest_file.exists():
                results["manifest"] = json.loads(manifest_file.read_text())
                console.print(f"[dim]Loaded existing manifest ({len(results['manifest'])} animations)[/dim]")

        # Stage 3: Capture
        if 3 not in skip and results["manifest"]:
            results["captured"] = await run_stage_3(url, output_dir, results["manifest"], animations_filter)
        elif 3 in skip:
            console.print("[dim]Stage 3 skipped[/dim]")

        # Stage 4: Analyze
        if 4 not in skip and results["manifest"]:
            results["analyzed"] = await run_stage_4(output_dir, results["manifest"], results["recon"])
        elif 4 in skip:
            console.print("[dim]Stage 4 skipped[/dim]")

        # Stage 5: Merge
        if 5 not in skip:
            try:
                results["merged"] = await run_stage_5(output_dir)
            except Exception as e:
                console.print(f"[yellow]Stage 5 error: {e}[/yellow]")
        elif 5 in skip:
            console.print("[dim]Stage 5 skipped[/dim]")

        return results

    # Run
    try:
        results = asyncio.run(run_pipeline())
        elapsed = time.time() - start_time
        print_summary(output_dir, results, elapsed)

        if open_output:
            os.system(f"open {output_dir}")

    except KeyboardInterrupt:
        console.print("\n[yellow]Interrupted[/yellow]")
        sys.exit(1)
    except Exception as e:
        console.print(f"\n[red]Failed: {e}[/red]")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
