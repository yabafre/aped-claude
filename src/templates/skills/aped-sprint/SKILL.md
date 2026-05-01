---
name: aped-sprint
keep-coding-instructions: true
description: 'Use when user says "parallel sprint", "dispatch stories", "aped sprint", or invokes aped-sprint. Only runs inside the main project, not inside a worktree. Creates worktrees only — story-ready and state flips are owned by aped-story.'
allowed-paths:
  write: ["{{OUTPUT_DIR}}/**", "{{APED_DIR}}/**"]
  read-only: ["src/**", "tests/**", "package.json"]
disable-model-invocation: true
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

Follow the instructions in `{{APED_DIR}}/aped-sprint/workflow.md`.
