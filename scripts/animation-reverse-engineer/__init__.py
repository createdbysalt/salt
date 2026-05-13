"""
Animation Reverse-Engineer Pipeline

Four-stage pipeline for extracting and replicating website animations:
1. RECON - Detect libraries and CSS animation rules
2. EXPLORE - Browser Use AI finds all animations
3. CAPTURE - Playwright records at 60fps
4. ANALYZE - Claude generates Framer Motion code
"""

from pathlib import Path

__version__ = "1.0.0"
__all__ = ["run_recon", "run_explore", "run_capture", "run_analyze"]

# Make imports work when running as scripts
SCRIPT_DIR = Path(__file__).parent
