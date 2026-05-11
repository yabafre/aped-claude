**Activation guard (6.2.0):** Before any other action, run `bash {{APED_DIR}}/scripts/check-enabled.sh`. If it exits non-zero, print "APED disabled — run aped-method enable" and HALT.

# APED PRD — Section-by-Section PRD Authoring

**Goal:** Author a PRD section by section with the A/P/C menu after each section. The PRD is treated as LAW by every downstream skill (`aped-arch`, `aped-epics`).

---

## Workflow architecture

This skill uses **micro-file architecture**:

- Each step is a self-contained file with embedded rules.
- Section gates (A/P/C menus) are load-bearing — never auto-pick `[C]`.
- Headless mode (`--headless` / `-H`) skips menus; default is interactive.

### Critical rules

- **EVERY FR follows format**: `FR#: [Actor] can [capability]` — no exceptions.
- **Range:** 10–80 FRs, each independently testable.
- **Domain detection** determines mandatory sections.
- **Validate before writing** — quality > speed.
- **Interactive mode is the default.** Generate ONE section, present it, ⏸ HALT with the A/P/C menu. Headless is opt-in.

### Iron Law

**NO PRD SHIPPED WITH PLACEHOLDERS.** See [`ETHOS.md` § aped-prd](../ETHOS.md#aped-prd) for full rationale.

## Activation

Read `{{APED_DIR}}/config.yaml` and resolve `{user_name}`, `{communication_language}`, `{document_output_language}`, `{ticket_system}`. Speak `{communication_language}`; write artefacts in `{document_output_language}`. HALT if config missing.

## Execution

Read fully and follow: `{{APED_DIR}}/aped-prd/steps/step-01-init.md`.
