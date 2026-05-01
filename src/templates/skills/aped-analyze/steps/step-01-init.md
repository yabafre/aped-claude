---
step: 1
reads: 
  - "{{APED_DIR}}/WORKTREE"
  - "git/HEAD"
  - "state.yaml#pipeline.current_phase"
writes: 
  - "tasks"
mutates_state: false
---

# Step 1: Initialization

## YOUR TASK

Check pipeline state. Set up task tracking.

## STATE CHECK

Read `{{OUTPUT_DIR}}/state.yaml` (the file may not exist yet — `aped-analyze` is the first phase that creates it):

- If file exists and `pipeline.phases.analyze.status: done` → ask user *"Redo analysis or skip to next phase?"* If skip, STOP.
- Else → continue.

## NEXT STEP

Load `{{APED_DIR}}/aped-analyze/steps/step-02-input-discovery.md`.
