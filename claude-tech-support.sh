#!/bin/bash

# Claude Code Tech Support Script
# Usage: ./claude-tech-support.sh [issue-description]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_CONFIG="$SCRIPT_DIR/claude-config.json"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display colored output
print_status() {
    echo -e "${BLUE}[CLAUDE-TECH-SUPPORT]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Claude Code is installed
if ! command -v /home/dentaldiamondhn/.config/nvm/versions/node/v18.20.8/lib/node_modules/@anthropic-ai/claude-code/cli.js &> /dev/null; then
    print_error "Claude Code CLI not found. Please install it first:"
    echo "npm install -g @anthropic-ai/claude-code"
    exit 1
fi

# Set up Claude Code path
CLAUDE_CMD="/home/dentaldiamondhn/.config/nvm/versions/node/v18.20.8/lib/node_modules/@anthropic-ai/claude-code/cli.js"

print_status "Starting Claude Code Tech Support Session..."

# Check if config file exists
if [ ! -f "$CLAUDE_CONFIG" ]; then
    print_warning "Config file not found. Using default settings."
    CONFIG_ARGS=""
else
    CONFIG_ARGS="--settings $CLAUDE_CONFIG"
    print_success "Using tech-support configuration from $CLAUDE_CONFIG"
fi

# Start Claude Code with tech-support agent
if [ $# -eq 0 ]; then
    print_status "Starting interactive tech-support session..."
    $CLAUDE_CMD $CONFIG_ARGS --agent tech-support --continue --ide
elif [ $# -eq 1 ]; then
    ISSUE="$1"
    print_status "Starting tech-support session for issue: $ISSUE"
    $CLAUDE_CMD $CONFIG_ARGS --agent tech-support --print "$ISSUE"
else
    print_error "Usage: $0 [issue-description]"
    echo "Examples:"
    echo "  $0                          # Start interactive session"
    echo "  $0 \"calendar notifications not working\"  # Get help for specific issue"
    echo "  $0 \"mobile browser compatibility issues\"  # Debug mobile-specific problems"
    exit 1
fi

print_success "Claude Code Tech Support session started!"
