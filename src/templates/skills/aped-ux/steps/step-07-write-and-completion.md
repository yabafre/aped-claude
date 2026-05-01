---
step: 7
reads:
  - "{{APED_DIR}}/skills/aped-skills/checklist-ux.md"
  - "{{APED_DIR}}/aped-ux/scripts/validate-ux.sh"
writes:
  - "{{OUTPUT_DIR}}/ux/design-spec.md"
  - "{{OUTPUT_DIR}}/ux/screen-inventory.md"
  - "{{OUTPUT_DIR}}/ux/components.md"
  - "{{OUTPUT_DIR}}/ux/flows.md"
  - "state.yaml#pipeline.phases.ux"
  - "mcp/aped_state.advance"
mutates_state: true
---

# Step 7: Write UX Spec, Validate, Update State, Completion Gate

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 The preview app stays at `{{OUTPUT_DIR}}/ux-preview/` — it's the live source of truth
- 🛑 BEFORE declaring complete, Read `{{APED_DIR}}/skills/aped-skills/checklist-ux.md` fresh
- 🚫 Do NOT auto-chain `aped-arch` or `aped-epics` — the user decides

## YOUR TASK

Write the 4-file UX spec, run validation, update state.yaml, walk the completion gate.

## OUTPUT — 4 FILES

```bash
mkdir -p {{OUTPUT_DIR}}/ux
```

1. **`{{OUTPUT_DIR}}/ux/design-spec.md`** — design tokens (colors, typo, spacing, radius), UI library + version, screen inventory with routes, component tree with props, layout specifications, responsive breakpoints.
2. **`{{OUTPUT_DIR}}/ux/screen-inventory.md`** — all screens with FR mapping (PRD FR IDs verbatim).
3. **`{{OUTPUT_DIR}}/ux/components.md`** — component catalog from the preview app.
4. **`{{OUTPUT_DIR}}/ux/flows.md`** — navigation flow diagrams.

The preview app at `{{OUTPUT_DIR}}/ux-preview/` IS the source of truth for downstream skills. Use React Grab to inspect it rather than static screenshots.

## VALIDATION

```bash
bash {{APED_DIR}}/aped-ux/scripts/validate-ux.sh {{OUTPUT_DIR}}/ux
```

If validation fails: fix missing files or content and re-validate.

## STATE UPDATE

**Prefer MCP**: `aped_state.advance(phase: "ux", status: "done")`.

**Fallback**: edit `{{OUTPUT_DIR}}/state.yaml`:

```yaml
pipeline:
  current_phase: "ux"
  phases:
    ux:
      status: "done"
      output: "{{OUTPUT_DIR}}/ux/"
      preview: "{{OUTPUT_DIR}}/ux-preview/"
      design_system:
        ui_library: "{library}"
        tokens: "{{OUTPUT_DIR}}/ux-preview/src/tokens/"
```

## NEXT-STEP MESSAGE

> UX design is ready. Run `aped-arch` to design the architecture (or `aped-epics` if architecture has already been done).

The next phase reads `{{OUTPUT_DIR}}/ux/` (all 4 spec files) and inspects the live preview app via React Grab to enrich stories with component / screen / token references.

**Do NOT auto-chain.**

## COMPLETION GATE

1. Read `{{APED_DIR}}/skills/aped-skills/checklist-ux.md` fresh.
2. Walk every item; flip each to `[x]` only when satisfied.
3. If any item is unchecked, return to the relevant step.

## SUCCESS METRICS

✅ 4 spec files written and pass `validate-ux.sh`.
✅ Preview app at `{{OUTPUT_DIR}}/ux-preview/` left intact.
✅ State advanced to `done`.
✅ Checklist Read fresh; every item `[x]`.

## FAILURE MODES

❌ Deleting the preview app — downstream loses React Grab inspection capability.
❌ Skipping `validate-ux.sh` — `aped-epics` cannot consume malformed UX spec.
❌ Auto-chaining — bypasses user gate.

## DONE

Once every checklist item is `[x]`, the skill is complete.
