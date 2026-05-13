# /vibe — Capture the Vibe

Capture the complete "vibe" of any webpage — layout, animations, colors, typography — and output a working Next.js page ready for client branding.

## Usage

```
/vibe https://linear.app
/vibe https://vercel.com --no-divmagic
/vibe https://stripe.com --merge-only
```

## What You Get

```
components/
├── ReplicatedPage.tsx          # Complete animated page
└── animations/
    ├── HeroFadeIn.tsx          # Framer Motion components
    └── ...

styles/
└── brand-tokens.css            # CSS variables to swap
```

## Rebrand for Client

Edit `brand-tokens.css`:

```css
:root {
  /* Swap these */
  --color-bg-primary: /* client's bg */;
  --color-text-primary: /* client's text */;
  --font-primary: /* client's font */;

  /* Keep these (the feel) */
  --duration-1: 400ms;
  --easing-1: cubic-bezier(0.4, 0, 0.2, 1);
}
```

## Pipeline

| Stage | What        | Output             |
| ----- | ----------- | ------------------ |
| 0     | DivMagic    | skeleton.jsx       |
| 1     | Recon       | recon.json         |
| 1.5   | Tokens      | design-tokens.json |
| 2     | Browser Use | manifest.json      |
| 3     | Capture     | captures/\*.mp4    |
| 4     | Analyze     | code/\*.tsx        |
| 5     | Merge       | ReplicatedPage.tsx |

## Flags

| Flag                | Description           |
| ------------------- | --------------------- |
| `--no-divmagic`     | Skip skeleton         |
| `--merge-only`      | Only merge stage      |
| `--skip-stages 0,2` | Skip stages           |
| `--open-output`     | Open folder when done |

## Setup

```bash
bash scripts/animation-reverse-engineer/setup.sh

# .env.local
ANTHROPIC_API_KEY=sk-ant-...
BROWSER_USE_API_KEY=bu_...
DIVMAGIC_API_KEY=dm_...
```

## Cost

~$1.50–3.00 per page

## Example

```
/vibe https://linear.app
```

→ Get Linear's page with their animations, then swap colors/fonts for your client.

---

$ARGUMENTS

## Execution

<command-workflow>
1. Parse URL
2. Validate API keys
3. Run: `python scripts/animation-reverse-engineer/run.py {URL} {flags}`
4. Report outputs
</command-workflow>
