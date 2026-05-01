---
name: aped-story
keep-coding-instructions: true
description: 'Use when user says "create story", "prepare next story", "aped story", or invokes aped-story.'
allowed-paths:
  write: ["{{OUTPUT_DIR}}/**", "{{APED_DIR}}/**"]
  read-only: ["src/**", "tests/**", "package.json"]
argument-hint: "[story-key]"
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

Follow the instructions in `{{APED_DIR}}/aped-story/workflow.md`.
