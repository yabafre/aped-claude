---
name: aped-epics
keep-coding-instructions: true
description: 'Use when user says "create epics", "break into stories", "aped epics", or invokes aped-epics. Does NOT create story files — that''s aped-story.'
allowed-paths:
  write: ["{{OUTPUT_DIR}}/**", "{{APED_DIR}}/**"]
  read-only: ["src/**", "tests/**", "package.json"]
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

Follow the instructions in `{{APED_DIR}}/aped-epics/workflow.md`.
