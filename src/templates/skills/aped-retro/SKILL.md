---
name: aped-retro
keep-coding-instructions: true
description: 'Use when user says "retro", "retrospective", "epic done — what did we learn", "aped retro", or invokes aped-retro. Runs after the last story of an epic ships.'
when_to_use: 'Use when user says "retro", "retrospective", "review the epic".'
argument-hint: "[epic-number]"
allowed-tools: Read Write Edit Glob Grep Bash Agent TaskCreate TaskUpdate
allowed-paths:
  write: ["{{OUTPUT_DIR}}/**", "{{APED_DIR}}/**"]
  read-only: ["src/**", "tests/**", "package.json"]
disable-model-invocation: true
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

Follow the instructions in `{{APED_DIR}}/aped-retro/workflow.md`.
