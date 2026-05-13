#!/usr/bin/env python3
"""
Stage 3: CAPTURE

Record each animation from the manifest at 60fps using Playwright.
Extracts timestamped frames for analysis.

Output: captures/*.mp4, frames/*/*.png, traces/*.zip
"""

import asyncio
import json
import subprocess
import shutil
from pathlib import Path

from playwright.async_api import async_playwright
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn

console = Console()


async def capture_animation(
    url: str,
    animation: dict,
    output_dir: Path,
    progress: Progress,
    task_id: int,
) -> dict:
    """
    Capture a single animation.

    Args:
        url: Target URL
        animation: Manifest entry for this animation
        output_dir: Base output directory
        progress: Rich progress bar
        task_id: Progress task ID

    Returns:
        Capture result with paths to video and frames
    """
    anim_id = animation["id"]
    trigger = animation.get("trigger", "load")
    trigger_params = animation.get("trigger_params", {})
    duration_ms = animation.get("estimated_duration_ms", 500)
    selector = animation.get("selector", "body")
    bbox = animation.get("viewport_bbox")

    progress.update(task_id, description=f"[cyan]{anim_id}[/cyan]")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--enable-features=GpuRasterization"],
        )

        # Create context with video recording
        video_path = output_dir / "captures"
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            record_video_dir=str(video_path),
            record_video_size={"width": 1440, "height": 900},
        )

        # Start tracing
        trace_path = output_dir / "traces" / f"{anim_id}.zip"
        await context.tracing.start(
            screenshots=True,
            snapshots=True,
            sources=True,
        )

        page = await context.new_page()

        try:
            # Navigate
            await page.goto(url, wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(1000)  # Let initial animations settle

            # Position viewport if bbox provided
            if bbox:
                x, y, w, h = bbox
                # Scroll to center the element
                center_y = y + h // 2
                viewport_center = 450  # Half of 900px viewport
                scroll_to = max(0, center_y - viewport_center)
                await page.evaluate(f"window.scrollTo(0, {scroll_to})")
                await page.wait_for_timeout(200)

            # Trigger the animation
            if trigger == "scroll":
                scroll_y = trigger_params.get("scroll_y", 500)
                # Smooth scroll
                await page.evaluate(f"""
                    window.scrollTo({{
                        top: {scroll_y},
                        behavior: 'smooth'
                    }})
                """)

            elif trigger == "hover":
                hover_target = trigger_params.get("hover_target", selector)
                try:
                    element = await page.wait_for_selector(hover_target, timeout=5000)
                    if element:
                        await element.hover()
                except:
                    # Fallback: hover at center of bbox if provided
                    if bbox:
                        x, y, w, h = bbox
                        await page.mouse.move(x + w // 2, y + h // 2)

            elif trigger == "click":
                click_target = trigger_params.get("click_target", selector)
                try:
                    await page.click(click_target, timeout=5000)
                except:
                    pass

            # Wait for animation to complete
            await page.wait_for_timeout(duration_ms + 500)

            # Stop tracing
            await context.tracing.stop(path=str(trace_path))

        except Exception as e:
            console.print(f"  [yellow]Warning capturing {anim_id}: {e}[/yellow]")

        finally:
            await page.close()
            await context.close()
            await browser.close()

    # Find the video file (Playwright names it based on page ID)
    video_files = list(video_path.glob("*.webm"))
    video_file = None
    if video_files:
        # Get the most recent one
        video_file = max(video_files, key=lambda f: f.stat().st_mtime)
        # Rename to animation ID
        final_video = video_path / f"{anim_id}.webm"
        shutil.move(str(video_file), str(final_video))
        video_file = final_video

        # Convert to mp4 and extract frames
        mp4_path = video_path / f"{anim_id}.mp4"
        frames_dir = output_dir / "frames" / anim_id
        frames_dir.mkdir(parents=True, exist_ok=True)

        # FFmpeg: convert to mp4
        subprocess.run([
            "ffmpeg", "-y", "-i", str(final_video),
            "-c:v", "libx264", "-preset", "fast",
            str(mp4_path)
        ], capture_output=True)

        # FFmpeg: extract frames every 50ms with timestamps
        subprocess.run([
            "ffmpeg", "-y", "-i", str(mp4_path),
            "-vf", "fps=20,drawtext=text='%{pts\\:hms}':x=10:y=10:fontcolor=white:fontsize=22:box=1:boxcolor=black@0.6",
            str(frames_dir / "frame_%03d.png")
        ], capture_output=True)

        # Clean up webm
        final_video.unlink(missing_ok=True)

        video_file = mp4_path

    return {
        "id": anim_id,
        "video": str(video_file) if video_file else None,
        "frames_dir": str(output_dir / "frames" / anim_id),
        "trace": str(trace_path) if trace_path.exists() else None,
        "success": video_file is not None,
    }


async def run_capture(url: str, output_dir: Path, manifest: list[dict]) -> list[dict]:
    """
    Run Stage 3 capture for all animations in manifest.

    Args:
        url: Target URL
        output_dir: Output directory
        manifest: List of animation entries from Stage 2

    Returns:
        List of capture results
    """
    results = []

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        console=console,
    ) as progress:
        task = progress.add_task("Capturing...", total=len(manifest))

        for animation in manifest:
            result = await capture_animation(url, animation, output_dir, progress, task)
            results.append(result)
            progress.advance(task)

    successful = sum(1 for r in results if r["success"])
    console.print(f"  Captured {successful}/{len(manifest)} animations")

    return results


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python capture.py <url>")
        sys.exit(1)

    url = sys.argv[1]
    output_dir = Path("./output")

    # Load manifest
    manifest_file = output_dir / "manifest.json"
    if not manifest_file.exists():
        print("Error: manifest.json not found. Run explore.py first.")
        sys.exit(1)

    manifest = json.loads(manifest_file.read_text())
    results = asyncio.run(run_capture(url, output_dir, manifest))
    print(json.dumps(results, indent=2))
