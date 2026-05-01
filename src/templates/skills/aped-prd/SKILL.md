---
name: aped-prd
keep-coding-instructions: true
description: 'Use when user says "create PRD", "generate PRD", "draft requirements", "product requirement", "write the prd", "aped prd", or invokes aped-prd. Headless mode available via --headless.'
allowed-paths:
  write: ["{{OUTPUT_DIR}}/**", "{{APED_DIR}}/**"]
  read-only: ["src/**", "tests/**", "package.json"]
argument-hint: "[--headless]"
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

Follow the instructions in `{{APED_DIR}}/aped-prd/workflow.md`.
