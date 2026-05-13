#!/bin/bash
# Animation Reverse-Engineer Setup Script
# Run this once to set up the Python environment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================"
echo "  Animation Reverse-Engineer Setup"
echo "========================================"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 not found"
    echo "Install with: brew install python@3.11"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "  Python $PYTHON_VERSION"

# Check FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "ERROR: FFmpeg not found"
    echo "Install with: brew install ffmpeg"
    exit 1
fi
echo "  FFmpeg installed"

# Create virtual environment
if [ ! -d ".venv" ]; then
    echo ""
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate and install
echo ""
echo "Installing Python dependencies..."
source .venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt

# Install Playwright browser
echo ""
echo "Installing Playwright Chromium..."
playwright install chromium

# Check API keys
echo ""
echo "Checking API keys..."

ENV_FILE="$SCRIPT_DIR/../../.env.local"

check_key() {
    local key_name=$1
    local required=$2
    local get_url=$3

    if [ -n "${!key_name}" ]; then
        echo "  $key_name: Set in environment"
    elif [ -f "$ENV_FILE" ] && grep -q "$key_name" "$ENV_FILE"; then
        echo "  $key_name: Found in .env.local"
    else
        if [ "$required" = "required" ]; then
            echo "  $key_name: MISSING (required)"
            echo "    Get it from: $get_url"
        else
            echo "  $key_name: Not set (optional)"
            echo "    Get it from: $get_url"
        fi
    fi
}

check_key "ANTHROPIC_API_KEY" "required" "https://console.anthropic.com"
check_key "BROWSER_USE_API_KEY" "required" "https://cloud.browser-use.com/settings?tab=api-keys"
check_key "DIVMAGIC_API_KEY" "optional" "https://divmagic.com/dashboard"

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "Usage:"
echo ""
echo "  # Activate environment"
echo "  source scripts/animation-reverse-engineer/.venv/bin/activate"
echo ""
echo "  # Run the pipeline"
echo "  python scripts/animation-reverse-engineer/run.py https://example.com"
echo ""
echo "  # Or use Claude Code command"
echo "  /animate-reverse-engineer https://example.com"
echo ""
