---
name: aped-lead
keep-coding-instructions: true
description: 'Use when user says "lead", "check approvals", "check sprint check-ins", "aped lead", or invokes aped-lead. Runs from the main project, not a worktree.'
allowed-paths:
  write: ["{{OUTPUT_DIR}}/**", "{{APED_DIR}}/**"]
  read-only: ["src/**", "tests/**", "package.json"]
disable-model-invocation: true
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

Follow the instructions in `{{APED_DIR}}/aped-lead/workflow.md`.
