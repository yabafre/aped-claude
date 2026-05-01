---
name: aped-from-ticket
keep-coding-instructions: true
description: 'Use when user says "from ticket", "pickup ticket", "pickup from Linear", "pickup from Jira", "work on this ticket", "start the GitHub issue", "ingest ticket", references an external ticket ID, "aped from-ticket", or invokes aped-from-ticket.'
allowed-paths:
  write: ["{{OUTPUT_DIR}}/**", "{{APED_DIR}}/**"]
  read-only: ["src/**", "tests/**", "package.json"]
argument-hint: "<ticket-id-or-url>"
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

Follow the instructions in `{{APED_DIR}}/aped-from-ticket/workflow.md`.
