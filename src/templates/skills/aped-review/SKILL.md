---
name: aped-review
keep-coding-instructions: true
description: 'Use when user says "review code", "run review", "aped review", or invokes aped-review.'
allowed-paths:
  write: ["{{OUTPUT_DIR}}/**", "{{APED_DIR}}/**"]
  read-only: ["src/**", "tests/**", "package.json"]
argument-hint: "[story-key]"
disable-model-invocation: true
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

Follow the instructions in `{{APED_DIR}}/aped-review/workflow.md`.
