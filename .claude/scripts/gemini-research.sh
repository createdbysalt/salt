#!/bin/bash
# Gemini Deep Research API Script
# Calls Gemini 2.0 Flash Thinking or Deep Research for pre-build intelligence

set -e

# Configuration
GEMINI_API_KEY="${GEMINI_API_KEY:-${GOOGLE_AI_API_KEY:-}}"
GEMINI_MODEL="${GEMINI_MODEL:-gemini-2.5-pro}"
GEMINI_API_BASE="https://generativelanguage.googleapis.com/v1beta/models"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DEPTH="standard"
OUTPUT_FORMAT="both"
CONTEXT=""
DIMENSIONS="all"
CATEGORY="general"

# Get the project root (where brand-identity folder is)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEFAULT_OUTPUT_DIR="$PROJECT_ROOT/brand-identity/research"

usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS]

Calls Gemini Deep Research API for pre-build intelligence gathering.
Research is automatically saved to brand-identity/research/<category>/ with dated filenames.

OPTIONS:
    -q, --query <query>         Research query (required)
    -d, --depth <level>         Research depth: quick|standard|deep (default: standard)
    -c, --context <context>     Additional context for the research
    -o, --output <format>       Output format: json|markdown|both (default: both)
    -D, --dimensions <dims>     Comma-separated dimensions to research:
                                user-psychology,competitive,technical,validation,ux-patterns
                                or "all" for all dimensions (default: all)
    -C, --category <cat>        Research category folder:
                                icp-profiles, competitor-audits, market-insights,
                                feature-research, or custom folder name (default: general)
    -n, --name <slug>           Custom name slug for the file (default: auto-generated from query)
    -f, --file <path>           Override: save to specific file path instead of default location
    -h, --help                  Show this help message

ENVIRONMENT:
    GEMINI_API_KEY              Gemini API key (required)
    GOOGLE_AI_API_KEY           Alternative API key (fallback)
    GEMINI_MODEL                Model to use (default: gemini-2.5-pro)

OUTPUT LOCATION:
    Default: brand-identity/research/<category>/YYYY-MM-DD-<slug>.md (and .json)

EXAMPLES:
    # ICP research (saves to brand-identity/research/icp-profiles/)
    $(basename "$0") -q "Designer-developer pain points" -C icp-profiles

    # Competitor research (saves to brand-identity/research/competitor-audits/)
    $(basename "$0") -q "How does Bonsai handle proposals?" -C competitor-audits

    # Feature research with custom name
    $(basename "$0") -q "Should we add AI invoice generation?" -C feature-research -n ai-invoicing

    # Quick research on a feature idea
    $(basename "$0") -q "Calendar integration UX patterns" -d quick

    # Deep research with specific dimensions
    $(basename "$0") -q "Client portal messaging" -d deep -D user-psychology,competitive
EOF
    exit 0
}

# Generate a URL-safe slug from text
slugify() {
    echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g' | sed -E 's/^-+|-+$//g' | cut -c1-50
}

error() {
    echo -e "${RED}ERROR:${NC} $1" >&2
    exit 1
}

info() {
    echo -e "${BLUE}INFO:${NC} $1" >&2
}

success() {
    echo -e "${GREEN}SUCCESS:${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}WARNING:${NC} $1" >&2
}

# Parse arguments
QUERY=""
OUTPUT_FILE=""
NAME_SLUG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -q|--query)
            QUERY="$2"
            shift 2
            ;;
        -d|--depth)
            DEPTH="$2"
            shift 2
            ;;
        -c|--context)
            CONTEXT="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        -D|--dimensions)
            DIMENSIONS="$2"
            shift 2
            ;;
        -C|--category)
            CATEGORY="$2"
            shift 2
            ;;
        -n|--name)
            NAME_SLUG="$2"
            shift 2
            ;;
        -f|--file)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Validate required inputs
if [[ -z "$QUERY" ]]; then
    error "Query is required. Use -q or --query to specify."
fi

# Generate output file path if not explicitly specified
if [[ -z "$OUTPUT_FILE" ]]; then
    # Generate slug from query or use provided name
    if [[ -z "$NAME_SLUG" ]]; then
        NAME_SLUG=$(slugify "$QUERY")
    fi

    # Create dated filename
    DATE_PREFIX=$(date +%Y-%m-%d)

    # Create category directory if it doesn't exist
    OUTPUT_DIR="$DEFAULT_OUTPUT_DIR/$CATEGORY"
    mkdir -p "$OUTPUT_DIR"

    # Set output file (without extension - will be added based on format)
    OUTPUT_FILE="$OUTPUT_DIR/${DATE_PREFIX}-${NAME_SLUG}"

    info "Output will be saved to: $OUTPUT_DIR/"
fi

if [[ -z "$GEMINI_API_KEY" ]]; then
    error "GEMINI_API_KEY environment variable is not set."
fi

# Validate depth
case $DEPTH in
    quick|standard|deep)
        ;;
    *)
        error "Invalid depth: $DEPTH. Must be quick, standard, or deep."
        ;;
esac

# Validate output format
case $OUTPUT_FORMAT in
    json|markdown|both)
        ;;
    *)
        error "Invalid output format: $OUTPUT_FORMAT. Must be json, markdown, or both."
        ;;
esac

# Build the research prompt based on depth and dimensions
build_prompt() {
    local depth_instruction=""
    local dimension_instruction=""

    # Depth-based instructions
    case $DEPTH in
        quick)
            depth_instruction="Provide a quick, focused analysis (2-3 key insights per dimension). Prioritize actionable findings over exhaustive research."
            ;;
        standard)
            depth_instruction="Provide a balanced analysis with moderate depth. Include 4-6 key insights per dimension with supporting evidence where available."
            ;;
        deep)
            depth_instruction="Conduct deep, comprehensive research. Explore multiple angles, cite sources where possible, identify edge cases, and provide 8+ insights per dimension with detailed reasoning."
            ;;
    esac

    # Build dimension list
    local dims_to_research=""
    if [[ "$DIMENSIONS" == "all" ]]; then
        dims_to_research="user-psychology, competitive, technical, validation, ux-patterns"
    else
        dims_to_research="$DIMENSIONS"
    fi

    # Dimension definitions
    dimension_instruction="Research the following dimensions:

**user-psychology**: User pain points, desires, behavioral patterns, mental models, emotional triggers, jobs-to-be-done
**competitive**: What users experience elsewhere, market alternatives, competitor approaches, gaps in existing solutions
**technical**: Implementation patterns, technology choices, integration considerations, scalability concerns
**validation**: Real-world demand signals from forums, reviews, social media, existing products, market data
**ux-patterns**: Established UX best practices, accessibility considerations, interaction patterns, cognitive load

Focus on these dimensions: ${dims_to_research}"

    # Build context section
    local context_section=""
    if [[ -n "$CONTEXT" ]]; then
        context_section="
PRODUCT CONTEXT:
${CONTEXT}
"
    fi

    # Construct the full prompt
    cat << PROMPT
You are a Pre-Build Research Intelligence Analyst. Your job is to deeply investigate a feature, UX pattern, or product idea BEFORE development begins.

RESEARCH REQUEST:
${QUERY}
${context_section}

RESEARCH DEPTH: ${DEPTH}
${depth_instruction}

${dimension_instruction}

OUTPUT REQUIREMENTS:

1. For each researched dimension, provide:
   - Key findings (with confidence level: HIGH/MEDIUM/LOW/HYPOTHESIS)
   - Evidence or sources where available
   - Gaps in available information

2. Conclude with a DECISION MATRIX:
   - should_build: YES / NO / NEEDS_MORE_RESEARCH
   - reasoning: Clear explanation
   - risks: What could go wrong
   - opportunities: What could go right
   - recommended_approach: Best way to implement if proceeding
   - alternative_approaches: Other valid approaches

3. End with NEXT STEPS:
   - If proceeding: What to do first
   - If pivoting: Alternative directions
   - Research gaps to fill: What we still don't know

FORMAT YOUR RESPONSE AS VALID JSON with this structure:
{
  "query": "original query",
  "depth": "quick|standard|deep",
  "dimensions_researched": ["list", "of", "dimensions"],
  "findings": {
    "dimension_name": {
      "insights": [
        {
          "finding": "description",
          "confidence": "HIGH|MEDIUM|LOW|HYPOTHESIS",
          "evidence": "source or reasoning",
          "implications": "what this means for the build"
        }
      ],
      "gaps": ["what we don't know"]
    }
  },
  "decision_matrix": {
    "should_build": "YES|NO|NEEDS_MORE_RESEARCH",
    "reasoning": "explanation",
    "risks": ["risk1", "risk2"],
    "opportunities": ["opp1", "opp2"],
    "recommended_approach": "description",
    "alternative_approaches": [
      {
        "approach": "description",
        "tradeoffs": "pros and cons"
      }
    ]
  },
  "next_steps": {
    "if_proceeding": ["step1", "step2"],
    "if_pivoting": ["alt1", "alt2"],
    "research_gaps_to_fill": ["gap1", "gap2"]
  },
  "meta": {
    "research_timestamp": "ISO timestamp",
    "model_used": "model name",
    "confidence_overall": "HIGH|MEDIUM|LOW"
  }
}

Be thorough but practical. Focus on actionable intelligence that helps make better build decisions.
PROMPT
}

# Make the API call
call_gemini() {
    local prompt
    prompt=$(build_prompt)

    # Escape the prompt for JSON
    local escaped_prompt
    escaped_prompt=$(echo "$prompt" | jq -Rs .)

    # Build the request body
    local request_body
    request_body=$(cat << EOF
{
  "contents": [{
    "parts": [{
      "text": ${escaped_prompt}
    }]
  }],
  "generationConfig": {
    "temperature": 0.7,
    "topK": 40,
    "topP": 0.95,
    "maxOutputTokens": 8192
  }
}
EOF
)

    info "Calling Gemini API (model: $GEMINI_MODEL, depth: $DEPTH)..."

    # Make the API call
    local response
    response=$(curl -s -X POST \
        "${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "$request_body")

    # Check for errors
    if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        local error_message
        error_message=$(echo "$response" | jq -r '.error.message // "Unknown error"')
        error "Gemini API error: $error_message"
    fi

    # Extract the text content
    local content
    content=$(echo "$response" | jq -r '.candidates[0].content.parts[0].text // empty')

    if [[ -z "$content" ]]; then
        error "No content in Gemini response"
    fi

    # Try to extract JSON from the response (it might be wrapped in markdown code blocks)
    local json_content
    json_content=$(echo "$content" | sed -n '/^```json/,/^```$/p' | sed '1d;$d')

    if [[ -z "$json_content" ]]; then
        # Try without code blocks
        json_content="$content"
    fi

    # Validate JSON
    if ! echo "$json_content" | jq . > /dev/null 2>&1; then
        warn "Response is not valid JSON. Returning raw content."
        echo "$content"
        return
    fi

    echo "$json_content"
}

# Convert JSON to markdown
json_to_markdown() {
    local json_input="$1"

    cat << MARKDOWN
# Research Report

**Query:** $(echo "$json_input" | jq -r '.query')
**Depth:** $(echo "$json_input" | jq -r '.depth')
**Timestamp:** $(echo "$json_input" | jq -r '.meta.research_timestamp // "N/A"')
**Overall Confidence:** $(echo "$json_input" | jq -r '.meta.confidence_overall // "N/A"')

---

## Findings by Dimension

$(echo "$json_input" | jq -r '
.findings | to_entries[] |
"### \(.key | gsub("-"; " ") | ascii_upcase)\n\n" +
(.value.insights | map(
  "**Finding:** \(.finding)\n" +
  "- Confidence: \(.confidence)\n" +
  "- Evidence: \(.evidence // "N/A")\n" +
  "- Implications: \(.implications // "N/A")\n"
) | join("\n")) +
"\n**Gaps:** " + (.value.gaps | join(", ") // "None identified") + "\n"
')

---

## Decision Matrix

**Should Build:** $(echo "$json_input" | jq -r '.decision_matrix.should_build')

**Reasoning:** $(echo "$json_input" | jq -r '.decision_matrix.reasoning')

### Risks
$(echo "$json_input" | jq -r '.decision_matrix.risks | map("- " + .) | join("\n")')

### Opportunities
$(echo "$json_input" | jq -r '.decision_matrix.opportunities | map("- " + .) | join("\n")')

### Recommended Approach
$(echo "$json_input" | jq -r '.decision_matrix.recommended_approach')

### Alternative Approaches
$(echo "$json_input" | jq -r '.decision_matrix.alternative_approaches | map("- **" + .approach + "**: " + .tradeoffs) | join("\n")')

---

## Next Steps

### If Proceeding
$(echo "$json_input" | jq -r '.next_steps.if_proceeding | map("1. " + .) | join("\n")')

### If Pivoting
$(echo "$json_input" | jq -r '.next_steps.if_pivoting | map("- " + .) | join("\n")')

### Research Gaps to Fill
$(echo "$json_input" | jq -r '.next_steps.research_gaps_to_fill | map("- " + .) | join("\n")')
MARKDOWN
}

# Main execution
main() {
    local result
    result=$(call_gemini)

    # Remove any extension from OUTPUT_FILE for consistent handling
    local base_name="${OUTPUT_FILE%.*}"
    # If no extension was present, base_name equals OUTPUT_FILE
    if [[ "$base_name" == "$OUTPUT_FILE" ]]; then
        base_name="$OUTPUT_FILE"
    fi

    # Handle output format
    case $OUTPUT_FORMAT in
        json)
            if [[ -n "$OUTPUT_FILE" ]]; then
                echo "$result" | jq . > "${base_name}.json"
                success "JSON saved to ${base_name}.json"
            else
                echo "$result" | jq .
            fi
            ;;
        markdown)
            local md_output
            md_output=$(json_to_markdown "$result")
            if [[ -n "$OUTPUT_FILE" ]]; then
                echo "$md_output" > "${base_name}.md"
                success "Markdown saved to ${base_name}.md"
            else
                echo "$md_output"
            fi
            ;;
        both)
            if [[ -n "$OUTPUT_FILE" ]]; then
                echo "$result" | jq . > "${base_name}.json"
                json_to_markdown "$result" > "${base_name}.md"
                success "Research saved to:"
                echo "  - ${base_name}.json" >&2
                echo "  - ${base_name}.md" >&2
            else
                echo "=== JSON OUTPUT ==="
                echo "$result" | jq .
                echo ""
                echo "=== MARKDOWN OUTPUT ==="
                json_to_markdown "$result"
            fi
            ;;
    esac
}

main
