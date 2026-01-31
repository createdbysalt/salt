# Ralph Docker Environment
# Claude Code + tools for autonomous development

FROM node:22-bookworm-slim

LABEL maintainer="Salt Core"
LABEL description="Ralph autonomous agent environment for Claude Code"

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    jq \
    openssh-client \
    ca-certificates \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install Claude Code CLI using npm (more reliable for global installs in Docker)
RUN npm install -g @anthropic-ai/claude-code

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for Claude Code
RUN useradd -m -s /bin/bash ralph && \
    mkdir -p /workspace /ralph-logs /main-repo && \
    chown -R ralph:ralph /workspace /ralph-logs

# Set up workspace
WORKDIR /workspace

# Copy entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Environment
ENV RALPH_CONTAINER=true
ENV TERM=xterm-256color
ENV HOME=/home/ralph

# Switch to non-root user
USER ralph

ENTRYPOINT ["/entrypoint.sh"]
