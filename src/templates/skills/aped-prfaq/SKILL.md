---
name: aped-prfaq
keep-coding-instructions: true
description: 'Use when user says "prfaq", "working backwards", "press release first", "stress-test the concept", or invokes aped-prfaq. Optional upstream tooling — can run before aped-analyze.'
when_to_use: 'Use when user says "PRFAQ", "work backwards", "press release first". Optional upstream of aped-analyze.'
argument-hint: "[--headless]"
allowed-tools: Read Write Edit Glob Grep Bash Agent TaskCreate TaskUpdate WebSearch WebFetch
allowed-paths:
  write: ["{{OUTPUT_DIR}}/**", "{{APED_DIR}}/**"]
  read-only: ["src/**", "tests/**", "package.json"]
disable-model-invocation: true
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

Follow the instructions in `{{APED_DIR}}/aped-prfaq/workflow.md`.
