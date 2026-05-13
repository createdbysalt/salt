#!/usr/bin/env python3
"""
Stage 5: MERGE

Combines all extracted assets into a working Next.js page:
- DivMagic skeleton (structure)
- Animation components (motion)
- Design tokens (feel)
- Brand layer CSS (customizable)

Outputs a complete, animated page ready for client branding tweaks.

Output:
  - components/ReplicatedPage.tsx (main page component)
  - components/animations/ (individual animation components)
  - styles/brand-tokens.css (CSS variables)
  - page.tsx (Next.js page)
"""

import asyncio
import json
import os
import re
from pathlib import Path
from typing import Optional

import anthropic
from rich.console import Console

console = Console()

MERGE_PROMPT = """You are merging extracted web assets into a production Next.js + Tailwind + Framer Motion page.

## Inputs

### 1. Skeleton (DivMagic JSX)
```jsx
{skeleton}
```

### 2. Animation Components Available
{animation_list}

### 3. Design Tokens
```json
{tokens}
```

### 4. Animation Manifest (what animates where)
```json
{manifest}
```

## Your Task

Create a complete, working Next.js page component that:

1. **Uses the skeleton structure** as the base layout
2. **Wraps animated elements** with the appropriate animation components
3. **Applies design tokens** via CSS variables
4. **Preserves the visual feel** of the original page

## Output Format

Return a single TSX file with:
- All necessary imports (framer-motion, animation components)
- CSS variable usage for colors, typography, spacing
- Proper TypeScript types
- Comments marking where animations are applied

## Rules

1. Use `'use client'` directive (animations need client)
2. Import animation components from `./animations/{{AnimationName}}`
3. Use CSS variables: `var(--color-text-primary)`, `var(--font-primary)`, etc.
4. Keep the exact structure from the skeleton
5. Replace hardcoded colors/fonts with CSS variables where sensible
6. Add motion to elements that match the manifest

## Example Pattern

```tsx
'use client'

import {{ HeroFadeIn }} from './animations/HeroFadeIn'
import {{ CardStagger }} from './animations/CardStagger'

export function ReplicatedPage() {{
  return (
    <main className="min-h-screen" style={{{{ fontFamily: 'var(--font-primary)' }}}}>
      <section className="py-20" style={{{{ backgroundColor: 'var(--color-bg-primary)' }}}}>
        <HeroFadeIn>
          <h1 className="text-6xl font-bold" style={{{{ color: 'var(--color-text-primary)' }}}}>
            Headline
          </h1>
        </HeroFadeIn>
      </section>
    </main>
  )
}}
```

Now merge the provided assets into a complete page. Output ONLY the TSX code, no markdown.
"""


def load_skeleton(output_dir: Path) -> str:
    """Load the DivMagic skeleton."""
    jsx_file = output_dir / "skeleton.jsx"
    if jsx_file.exists():
        return jsx_file.read_text()

    html_file = output_dir / "skeleton.html"
    if html_file.exists():
        return html_file.read_text()

    return "<!-- No skeleton available -->"


def load_animation_components(output_dir: Path) -> dict:
    """Load generated animation components."""
    code_dir = output_dir / "code"
    components = {}

    if code_dir.exists():
        for tsx_file in code_dir.glob("*.tsx"):
            name = tsx_file.stem
            components[name] = tsx_file.read_text()

    return components


def load_tokens(output_dir: Path) -> dict:
    """Load design tokens."""
    tokens_file = output_dir / "design-tokens.json"
    if tokens_file.exists():
        return json.loads(tokens_file.read_text())
    return {}


def load_manifest(output_dir: Path) -> list:
    """Load animation manifest."""
    manifest_file = output_dir / "manifest.json"
    if manifest_file.exists():
        return json.loads(manifest_file.read_text())
    return []


async def merge_assets(output_dir: Path) -> dict:
    """
    Merge all extracted assets into a working page.

    Uses Claude to intelligently combine:
    - Skeleton structure
    - Animation components
    - Design tokens
    - Manifest data
    """
    console.print("  Loading extracted assets...")

    # Load all assets
    skeleton = load_skeleton(output_dir)
    animations = load_animation_components(output_dir)
    tokens = load_tokens(output_dir)
    manifest = load_manifest(output_dir)

    console.print(f"  Skeleton: {len(skeleton)} chars")
    console.print(f"  Animations: {len(animations)} components")
    console.print(f"  Tokens: {len(tokens)} categories")
    console.print(f"  Manifest: {len(manifest)} animations")

    if not skeleton or skeleton == "<!-- No skeleton available -->":
        console.print("  [yellow]Warning: No skeleton found, creating minimal structure[/yellow]")
        skeleton = create_minimal_skeleton(manifest, tokens)

    # Build animation list for prompt
    animation_list = "\n".join([
        f"- {name}: {code[:200]}..." if len(code) > 200 else f"- {name}: {code}"
        for name, code in animations.items()
    ]) or "No animation components generated yet."

    # Build prompt
    prompt = MERGE_PROMPT.format(
        skeleton=skeleton[:15000],  # Cap skeleton size
        animation_list=animation_list[:5000],
        tokens=json.dumps(tokens, indent=2)[:3000],
        manifest=json.dumps(manifest, indent=2)[:3000],
    )

    console.print("  Merging with Claude...")

    # Call Claude with prompt caching
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=8192,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt,
                        "cache_control": {"type": "ephemeral"}  # Cache the prompt
                    }
                ]
            }
        ],
    )

    merged_code = response.content[0].text

    # Clean up response (remove markdown if present)
    if merged_code.startswith("```"):
        merged_code = re.sub(r"^```\w*\n", "", merged_code)
        merged_code = re.sub(r"\n```$", "", merged_code)

    # Save outputs
    save_merged_outputs(output_dir, merged_code, animations, tokens)

    return {
        "page_component": merged_code,
        "animations_count": len(animations),
        "tokens_applied": True,
    }


def create_minimal_skeleton(manifest: list, tokens: dict) -> str:
    """Create a minimal skeleton when DivMagic isn't available."""
    sections = set()
    for anim in manifest:
        # Infer section from animation ID
        anim_id = anim.get("id", "")
        if "hero" in anim_id:
            sections.add("hero")
        elif "nav" in anim_id:
            sections.add("nav")
        elif "footer" in anim_id:
            sections.add("footer")
        elif "card" in anim_id or "feature" in anim_id:
            sections.add("features")

    skeleton = "<main className=\"min-h-screen\">\n"

    if "nav" in sections:
        skeleton += "  <nav className=\"py-4 px-6\">Navigation</nav>\n"

    if "hero" in sections:
        skeleton += "  <section className=\"py-20 px-6\"><h1>Hero Section</h1></section>\n"

    if "features" in sections:
        skeleton += "  <section className=\"py-16 px-6\"><div className=\"grid grid-cols-3 gap-8\">Features</div></section>\n"

    if "footer" in sections:
        skeleton += "  <footer className=\"py-8 px-6\">Footer</footer>\n"

    skeleton += "</main>"

    return skeleton


def save_merged_outputs(output_dir: Path, page_code: str, animations: dict, tokens: dict):
    """Save all merged outputs in a clean structure."""

    # Create output structure
    components_dir = output_dir / "components"
    animations_dir = components_dir / "animations"
    styles_dir = output_dir / "styles"

    components_dir.mkdir(exist_ok=True)
    animations_dir.mkdir(exist_ok=True)
    styles_dir.mkdir(exist_ok=True)

    # Save main page component
    page_file = components_dir / "ReplicatedPage.tsx"
    page_file.write_text(page_code)
    console.print(f"  Saved {page_file}")

    # Copy animation components
    for name, code in animations.items():
        anim_file = animations_dir / f"{kebab_to_pascal(name)}.tsx"
        anim_file.write_text(code)

    if animations:
        console.print(f"  Saved {len(animations)} animation components to {animations_dir}")

    # Create animations index
    if animations:
        index_exports = "\n".join([
            f"export {{ {kebab_to_pascal(name)} }} from './{kebab_to_pascal(name)}'"
            for name in animations.keys()
        ])
        index_file = animations_dir / "index.ts"
        index_file.write_text(f"// Animation Components\n{index_exports}\n")

    # Copy brand layer CSS
    brand_css = output_dir / "brand-layer.css"
    if brand_css.exists():
        (styles_dir / "brand-tokens.css").write_text(brand_css.read_text())
        console.print(f"  Saved brand tokens to {styles_dir / 'brand-tokens.css'}")

    # Create a sample page.tsx for Next.js
    next_page = f'''import {{ ReplicatedPage }} from '@/components/ReplicatedPage'
import '@/styles/brand-tokens.css'

export default function Page() {{
  return <ReplicatedPage />
}}

export const metadata = {{
  title: 'Replicated Page',
  description: 'Page replicated with animation-reverse-engineer',
}}
'''
    next_page_file = output_dir / "page.tsx"
    next_page_file.write_text(next_page)
    console.print(f"  Saved Next.js page to {next_page_file}")

    # Create a README
    readme = f"""# Replicated Page

Generated by animation-reverse-engineer.

## Files

- `components/ReplicatedPage.tsx` — Main page component with animations
- `components/animations/` — Individual Framer Motion animation components
- `styles/brand-tokens.css` — CSS variables for colors, typography, spacing
- `page.tsx` — Next.js page entry point

## Usage

1. Copy `components/` and `styles/` to your Next.js project
2. Import `brand-tokens.css` in your layout or page
3. Use `<ReplicatedPage />` or extract individual sections

## Customizing for Client Branding

Edit `styles/brand-tokens.css` to swap:

```css
:root {{
  --color-bg-primary: /* client's background color */;
  --color-text-primary: /* client's text color */;
  --font-primary: /* client's font family */;
}}
```

The page structure and animations remain intact; only the visual tokens change.

## Animation Components

{chr(10).join([f'- `{kebab_to_pascal(name)}` — {name}' for name in animations.keys()]) or 'None generated'}
"""
    readme_file = output_dir / "README.md"
    readme_file.write_text(readme)


def kebab_to_pascal(s: str) -> str:
    """Convert kebab-case to PascalCase."""
    return "".join(word.capitalize() for word in s.replace("_", "-").split("-"))


async def run_merge(output_dir: Path) -> dict:
    """Run Stage 5 merge."""
    console.print("\n[bold green]Stage 5: MERGE[/bold green]")
    console.print("Combining skeleton + animations + tokens into working page...")

    result = await merge_assets(output_dir)

    console.print(f"  [green]Created complete page with {result['animations_count']} animations[/green]")

    return result


if __name__ == "__main__":
    import sys

    output_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("./output")

    if not output_dir.exists():
        print(f"Error: Output directory {output_dir} not found")
        print("Run the full pipeline first, or specify a different directory.")
        sys.exit(1)

    result = asyncio.run(run_merge(output_dir))
    print(json.dumps(result, indent=2, default=str))
