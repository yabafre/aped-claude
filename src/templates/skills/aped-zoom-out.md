---
name: aped-zoom-out
keep-coding-instructions: true
description: 'Use when user says "zoom out", "step back", "take a step back", "broader view", "wider context", "lost the thread", "are we still solving the right problem", or invokes aped-zoom-out. Horizontal — invokable at any phase. Not for sprint progress dashboards (see aped-status) or for diff walks (see aped-checkpoint).'
disable-model-invocation: true
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

# APED Zoom Out — Step Back

Stop the current task. Look at the broader project context. Ask out loud: "Are we still solving the right problem?"

Read recent state (`{{OUTPUT_DIR}}/state.yaml`), recent decisions (top of `{{OUTPUT_DIR}}/lessons.md`, recent commits via `git log --oneline -20`), and the original goal (PRD, brief, ticket, or user's first message in this session). Compare what is being implemented now to that original goal. If they have drifted, surface the drift to the user *before* writing more code.

This skill produces no artefact. Its only output is the agent's re-orientation message to the user — a 4-bullet summary:
- **Where we started:** original goal, in one sentence.
- **Where we are:** what got done, in one sentence.
- **Drift, if any:** divergence between the two, with file/decision pointers.
- **Recommendation:** continue / re-anchor / stop and re-PRD.

Use this when you sense the implementation has been deep in details too long and the original framing is fading. Adapted from Matt Pocock's `zoom-out` skill (MIT) — APED preserves the original 2-sentence brevity philosophy.

## No State Change

Zoom-out is read-only. It does not advance pipeline state, does not write artefacts, does not modify state.yaml.
