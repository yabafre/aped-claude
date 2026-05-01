---
name: aped-dev
keep-coding-instructions: true
description: 'Use when user says "start dev", "implement story", "aped dev", "TDD", "TDD cycle", "red green refactor", "failing test first", "generate unit tests", or invokes aped-dev. Not for hotfixes or single-file isolated changes — see aped-quick for those. Not for E2E tests — see aped-qa for that.'
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

Follow the instructions in `{{APED_DIR}}/aped-dev/workflow.md`.
