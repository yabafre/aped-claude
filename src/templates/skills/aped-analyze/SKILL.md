---
name: aped-analyze
keep-coding-instructions: true
description: 'Use when user says "research idea", "aped analyze", or invokes aped-analyze. Runs alongside aped-context — both can apply on hybrid projects (new feature in existing system).'
allowed-paths:
  write: ["{{OUTPUT_DIR}}/**", "{{APED_DIR}}/**"]
  read-only: ["src/**", "tests/**", "package.json"]
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

Follow the instructions in `{{APED_DIR}}/aped-analyze/workflow.md`.
