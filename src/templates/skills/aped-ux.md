---
name: aped-ux
keep-coding-instructions: true
description: 'Use when user says "design UX", "UX spec", "aped ux", or invokes aped-ux. Runs between PRD and Epics.'
allowed-paths:
  write: ["{{OUTPUT_DIR}}/**", "{{APED_DIR}}/**"]
  read-only: ["src/**", "tests/**", "package.json"]
license: MIT
compatibility: 'Requires Node.js 18+ and npm for Vite+React preview scaffold'
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

# APED UX — ANF Framework

## On Activation

Before any other action, read `{{APED_DIR}}/config.yaml` and resolve:
- `{user_name}` — for greeting and direct address
- `{communication_language}` — for ALL conversation with the user
- `{document_output_language}` — for artefacts written under `{{OUTPUT_DIR}}/`
- `{ticket_system}` / `{git_provider}` — routing for ticket / PR I/O (skip if `none`)

✅ YOU MUST speak `{communication_language}` in every message to the user.
✅ YOU MUST write artefact content in `{document_output_language}`.
✅ If `{{APED_DIR}}/config.yaml` is missing or unreadable, HALT and tell the user to run `npx aped-method`.

## Critical Rules

- NEVER use lorem ipsum — every text element must reflect the actual product from the PRD
- ALWAYS run the pre-delivery checklist before presenting to user
- Take your time with each screen — quality is more important than speed
- Do not skip the user review cycle — the prototype MUST be approved before proceeding

Produces a validated, interactive React prototype from the PRD. The prototype becomes the UX spec that `aped-epics` consumes as the visual source of truth.

**ANF = Assemble → Normalize → Fill**

```
A: Design DNA        N: React Preview        F: Complete + Validate
   (inputs)             (live prototype)         (user-approved spec)

Inspirations         Vite + React app        All screens built
+ UI library         with REAL content       + interaction states
+ color/typo         from PRD context        + responsive behavior
+ components         (no lorem ipsum)        + user review cycles
                                             = UX spec for aped-epics
```

## Input Discovery

Before any work, discover and load all upstream APED artefacts. This skill grounds every screen, FR reference, and "real content" claim in actual documents — never lorem ipsum, never hallucinated.

### 1. Glob discovery

Search these locations in order:
- `{{OUTPUT_DIR}}/**`
- `{{APED_DIR}}/**`
- `docs/**` (project root)

Look for these artefacts (✱ = required):
- PRD — `*prd*.md` or `prd.md` ✱
- Product Brief — `*brief*.md` or `product-brief.md`
- Project Context — `*context*.md` or `project-context.md`
- Research — `*research*.md`

### 2. Required-input validation (hard-stop)

For the ✱ PRD:
- If found: continue
- If missing: HALT with this message:
  > "UX design requires a PRD — every screen, journey, and FR reference is grounded in it. Run `aped-prd` first, or provide the PRD file path."

Do NOT proceed without the PRD. The previous behaviour (referencing the PRD in prose without loading it) caused hallucinated content and is the bug this discovery step fixes.

### 3. Load + report

- Load every discovered file completely (no offset/limit).
- Brownfield/greenfield is detected via `project-context.md` presence.

Present a discovery report (adapt to `communication_language`):

> Welcome {user_name}! Setting up `aped-ux` for {project_name}.
>
> **Documents discovered:**
> - PRD: {N} files {✓ loaded | ✱ MISSING — HALT}
> - Product Brief: {N} files {✓ loaded — informs tone | (none)}
> - Project Context: {N} files {✓ loaded (brownfield) — existing design system constraints applied | (none)}
> - Research: {N} files {✓ loaded | (none)}
>
> **Files loaded:** {comma-separated filenames}
>
> {if brownfield} 📋 Brownfield mode: existing UI conventions from project-context.md will constrain Assemble (design tokens, component library, framework choices). {/if}
>
> [C] Continue with these documents
> [Other] Add a file path / paste content — I'll load it and redisplay

⏸ **HALT — wait for `[C]` or additional inputs.**

### 4. Bias the rest of the workflow

Loaded artefacts inform every phase of this skill:
- **A — Assemble**: in brownfield mode, the design tokens and UI library are inherited from `project-context.md` rather than freshly chosen — confirm with the user before overriding.
- **N — Normalize**: screens are mapped from PRD user journeys; mock data in `src/data/mock.ts` uses real product names and FR-derived values from the PRD, never lorem ipsum.
- **F — Fill**: every screen's content is grounded in the PRD's FRs for that journey. When a screen needs content not in the PRD, surface it to the user as a gap rather than inventing.

## Setup

1. Read `{{OUTPUT_DIR}}/state.yaml` — check pipeline state
   - If `pipeline.phases.ux.status` is `done`: ask user — redo or skip?
   - If user skips: stop here (user will invoke next phase manually)
2. Read `{{APED_DIR}}/aped-ux/references/ux-patterns.md` for design patterns catalog

## Task Tracking

```
TaskCreate: "A — Assemble: collect design DNA"
TaskCreate: "A — Assemble: scaffold Vite + React preview app"
TaskCreate: "N — Normalize: build layout + navigation + design tokens"
TaskCreate: "N — Normalize: implement screens with real PRD content"
TaskCreate: "F — Fill: complete all states (loading, error, empty)"
TaskCreate: "F — Fill: responsive + accessibility pass"
TaskCreate: "F — Fill: user review + validation"
```

---

## A — ASSEMBLE (Design DNA)

### A1: Collect Design Inputs

Ask the user (adapt to `communication_language`):

1. **Inspirations** — "Share screenshots, URLs, or describe the visual direction you want"
   - Accept: image files (Read tool), URLs (WebFetch), or verbal description
   - If images: analyze layout, density, color palette, typography, component style
   - If URLs: fetch and analyze visual patterns

2. **UI Library** — "Which component library? Or none (custom)?"
   - Options: shadcn/ui, Radix UI, MUI, Ant Design, Chakra UI, Mantine, none
   - If specified: use MCP context7 (`resolve-library-id` then `query-docs`) to load component API
   - If none: will create custom components styled to match inspirations

3. **Design Tokens** — Extract or ask:
   - **Colors**: primary, secondary, accent, neutral scale, semantic (success/warning/error/info)
   - **Typography**: font family, size scale (xs to 2xl), weight scale, line heights
   - **Spacing**: base unit (4px/8px), scale (1-12)
   - **Radius**: none/sm/md/lg/full
   - **Shadows**: sm/md/lg/xl

4. **Branding** — Logo, brand colors, tone (playful/serious/minimal/bold)

### A2: Scaffold Preview App

```bash
mkdir -p {{OUTPUT_DIR}}/ux-preview
cd {{OUTPUT_DIR}}/ux-preview
npm create vite@latest . -- --template react-ts
npm install
```

If UI library chosen:
```bash
# Example for shadcn/ui:
npx shadcn@latest init
# Example for MUI:
npm install @mui/material @emotion/react @emotion/styled
```

Create design token files:
- `src/tokens/colors.ts` — color palette as CSS custom properties or theme object
- `src/tokens/typography.ts` — font config
- `src/tokens/spacing.ts` — spacing scale
- `src/theme.ts` — unified theme export

Create `src/data/mock.ts` — **real content from PRD**, not lorem ipsum:
- Extract product name, user types, feature names, sample data from PRD
- Generate realistic mock data that matches the product domain
- Example: if building a project manager, mock projects have real-sounding names and dates

`TaskUpdate: "A — Assemble: scaffold" → completed`

---

## N — NORMALIZE (React Preview with Real Content)

### N1: Layout + Navigation

Read PRD user journeys and screen inventory (from `{{APED_DIR}}/aped-ux/references/ux-patterns.md`).

1. **Map screens** from PRD user journeys:
   - Each journey → concrete screens
   - Name: `{area}-{action}` slug (e.g., `auth-login`, `dashboard-overview`)
   - Classify: form, list, detail, dashboard, wizard, modal

2. **Build layout shell** — `src/layouts/`:
   - App layout (header, sidebar/nav, content, footer)
   - Auth layout (centered card)
   - Apply design tokens throughout

3. **Set up routing** — React Router with all screens as routes:
   - `src/App.tsx` — router config
   - `src/pages/{ScreenSlug}.tsx` — one page per screen (initially placeholder)

4. **Navigation** — read rules P9 (Navigation) from `{{APED_DIR}}/aped-ux/references/ux-patterns.md`:
   - Sidebar or top nav matching design inspiration
   - Active state indicators on current route
   - Mobile: bottom nav ≤5 items (icon + label) or hamburger/drawer
   - Desktop ≥1024px: sidebar; smaller: bottom/top nav
   - Predictable back behavior, preserve scroll/state
   - Same navigation placement across all pages

Run: `npm run dev` — verify app runs with working navigation.

### N2: Screen Implementation

For each screen, in priority order (core journey first):

1. **Read relevant FRs** for this screen
2. **Build with UI library components** (or custom styled components)
3. **Use real mock data** from `src/data/mock.ts` — product names, user names, realistic dates and numbers
4. **Implement the primary content** — forms, tables, cards, etc.
5. **Wire interactions** — form submits, button clicks, navigation (can be no-op handlers)

**CRITICAL: No lorem ipsum.** Every text element must reflect the actual product:
- If it's a SaaS dashboard, show realistic metric names and values
- If it's an e-commerce, show real-looking product names and prices
- If it's a project tool, show plausible project names and statuses

`TaskUpdate: "N — Normalize: implement screens" → completed`

---

## F — FILL (Complete + Validate)

### F1: Interaction States

Read rules P7 (Animation) and P8 (Forms & Feedback) from `{{APED_DIR}}/aped-ux/references/ux-patterns.md`.

For each screen, add:

1. **Loading states** — skeleton/shimmer for operations >300ms, spinner for buttons
2. **Empty states** — first-use experience with helpful message + CTA, "no results" views
3. **Error states** — inline validation on blur, error below field, error summary at top for long forms
4. **Success feedback** — toast auto-dismiss 3-5s, confirmation messages
5. **Disabled states** — opacity 0.38-0.5, cursor change, non-interactive
6. **Press feedback** — visual response within 80-150ms (ripple, opacity, scale 0.95-1.05)
7. **Animations** — 150-300ms micro-interactions, transform/opacity only, ease-out enter, ease-in exit

### F2: Responsive + Dark Mode

Read rules P5 (Layout) and P6 (Typography & Color) from `{{APED_DIR}}/aped-ux/references/ux-patterns.md`.

1. **Responsive** — test and fix at 3 breakpoints:
   - Mobile (375px): single column, hamburger nav, touch targets ≥44px, safe areas
   - Tablet (768px): adapted layout, sidebar may collapse, adjusted gutters
   - Desktop (1440px): full layout, max-width container, sidebar visible

2. **Dark mode** — if applicable:
   - Semantic color tokens mapped per theme (not hardcoded hex)
   - Desaturated/lighter variants, NOT inverted colors
   - Primary text ≥ 4.5:1, secondary ≥ 3:1 in both modes
   - Borders/dividers distinguishable in both modes
   - Modal scrim: 40-60% black, foreground legible
   - Test both themes independently

### F3: Accessibility Pass

Read rules P1 (Accessibility) and P2 (Touch) from `{{APED_DIR}}/aped-ux/references/ux-patterns.md`.

- Contrast: 4.5:1 normal text, 3:1 large text (test with browser devtools)
- Focus rings: 2-4px, visible on all interactive elements
- Tab order: matches visual order
- Form labels: visible, associated, not placeholder-only
- Icon buttons: aria-label
- Skip-to-main link
- Heading hierarchy: h1→h2→h3, no skipping
- Touch targets: ≥44x44pt with ≥8px spacing
- No information conveyed by color alone

### F4: Pre-Delivery Checklist

Read the full Pre-Delivery Checklist from `{{APED_DIR}}/aped-ux/references/ux-patterns.md`.

Run through ALL checks before presenting to user:

**Visual Quality** — SVG icons, consistent family, no press jitter, semantic tokens, brand assets
**Interaction** — press feedback, touch targets, micro-interaction timing, disabled states, focus order
**Light/Dark Mode** — contrast ratios in both, dividers visible, scrim legibility
**Layout** — safe areas, fixed bars, tested 3 devices, spacing rhythm, text readability
**Accessibility** — labels, hints, errors, color independence, reduced motion, ARIA

If any check fails: fix before showing to user.

### F5: User Review Cycle

**This is the most important step.** The prototype must be validated by the user.

1. Run `npm run dev` and give the user the local URL
2. **Use React Grab for visual review** — call `mcp__react-grab-mcp__get_element_context` to inspect specific UI elements the user selects. This gives you the component tree, props, and styles of any element the user points to, making review precise instead of guessing from screenshots.
3. Present the pre-delivery checklist results
4. Ask: "Review each screen. What needs to change?"
5. Categories of feedback:
   - **Layout** — move, resize, reorder sections
   - **Content** — missing info, wrong hierarchy, unclear labels
   - **Style** — colors, spacing, typography adjustments
   - **Flow** — navigation changes, missing screens, wrong order
   - **Components** — wrong component type, missing states, wrong behavior
   - **Dark mode** — contrast issues, token problems, scrim opacity

6. **Iterate** until user picks `[C]` Continue on the menu below
7. Each iteration: apply feedback → use React Grab to inspect the changed elements → run checklist again → present → redisplay menu

After running the checklist + initial walkthrough, present the A/C menu:

```
UX prototype ready for sign-off. Choose your next move:
[A] Advanced elicitation — invoke aped-elicit on the prototype
    (Feynman test for clarity; Devil's Advocate on flows; Hindsight: "if a real
    user breaks this in 30 days, what did we miss?")
[C] Continue — accept the prototype, write the UX spec, update state.yaml
[Other] Direct feedback — describe layout / content / style / flow / component /
        dark-mode change; I apply it, re-run the checklist, redisplay
```

⏸ **HALT — wait for the user's choice. Do NOT write the UX spec or update state before `[C]`.**

`TaskUpdate: "F — Fill: user review" → completed` once `[C]` is selected.

### Spec self-review

After the prototype is approved by the user but before writing the UX spec, look at the spec drafts with fresh eyes — this is an inline checklist you run yourself, not a subagent dispatch. Fix any issues inline; no need to re-review.

1. **Placeholder lint:** UX produces multiple files, so loop over `{{OUTPUT_DIR}}/ux/`:
   ```bash
   for f in {{OUTPUT_DIR}}/ux/*.md; do
     bash {{APED_DIR}}/scripts/lint-placeholders.sh "$f" || exit 1
   done
   ```
   Every file must exit 0; abort on the first failure and present the lint output to the user.
2. **Screen/flow consistency:** every screen in the inventory has at least one flow that references it; every flow only references screens that actually exist in the inventory.
3. **Component inventory complete:** every component used in a screen mock appears in the components inventory with props and states documented.
4. **Accessibility check:** focus order matches visual order on every screen; icon buttons have `aria-label`; contrast tokens (semantic, not hardcoded) used throughout; touch targets ≥44×44pt.
5. **Viewport assumptions stated explicitly:** the spec names the breakpoints supported (e.g. 375 / 768 / 1440) and states what changes per breakpoint, not just "responsive".

If you find issues, fix them inline. No need to re-review — just fix and move on.

### Spec-reviewer dispatch

After the inline self-review passes, dispatch a fresh subagent to review the UX spec **before** the user gate. The reviewer's job is to verify the spec is complete, consistent, and ready for `aped-epics` and `aped-dev` consumption.

Use the `Agent` tool (`subagent_type: "general-purpose"`) with this verbatim prompt (substitute `[ARTEFACT_FILE_PATH]` with the actual path of the UX spec folder just written):

```
You are a spec document reviewer. Verify this UX spec is complete and ready for planning.

**Spec to review:** [ARTEFACT_FILE_PATH]

## What to Check

| Category | What to Look For |
|----------|------------------|
| Completeness | TODOs, placeholders, "TBD", missing screens referenced by flows, missing component entries |
| Consistency | Screen/flow mismatches, components used in mocks but absent from the inventory |
| Clarity | Screens whose purpose can't be inferred from the spec alone |
| Accessibility | Focus order gaps, missing aria-labels, hardcoded colors instead of semantic tokens |
| YAGNI | Screens or components that no flow or FR actually requires |

## Calibration

**Only flag issues that would cause real problems during implementation.**
Screen/flow inconsistencies, missing component inventory entries, or accessibility
gaps that violate the design system tokens — those are issues. Stylistic
preferences and "could be more polished" are not.

Approve unless there are serious gaps that would lead to a flawed implementation.

## Output Format

## Spec Review

**Status:** Approved | Issues Found

**Issues (if any):**
- [Section X]: [specific issue] - [why it matters for implementation]

**Recommendations (advisory, do not block approval):**
- [suggestions for improvement]
```

When the reviewer returns:
- **Status: Approved** — proceed to the user gate. Surface the recommendations (advisory) but do not block on them.
- **Status: Issues Found** — fix the flagged issues inline (or `[O]verride` with a recorded reason if a flag is wrong), then re-dispatch the same reviewer once. If the second pass also returns issues, HALT and present the issues to the user for adjudication before handing off.

---

## Self-review (run before user gate)

Before presenting the UX spec to the user, walk this checklist. Each `[ ]` must flip to `[x]` or HALT.

- [ ] **Placeholder lint** — run `bash {{APED_DIR}}/scripts/lint-placeholders.sh` against every file in `{{OUTPUT_DIR}}/ux/`.
- [ ] **Design tokens declared** — colour, typography, spacing scales explicitly listed (not "use whatever the library defaults to").
- [ ] **Screen → flow** — every screen in the inventory has at least one flow that references it.
- [ ] **Component inventory complete** — every component used in a screen mock appears in the components inventory.
- [ ] **PRD FR coverage** — every PRD FR with a UI surface has at least one mocked screen.
- [ ] **No lorem ipsum** — every mock uses real or realistic content drawn from the PRD; placeholders fail this gate.
- [ ] **Spec-reviewer dispatched** — reviewer returned Approved (or [O]verride recorded).

## Output

Once user approves the prototype:

```bash
mkdir -p {{OUTPUT_DIR}}/ux
```

1. **Preview app stays** at `{{OUTPUT_DIR}}/ux-preview/` — living reference
2. Write `{{OUTPUT_DIR}}/ux/design-spec.md`:
   - Design tokens (colors, typo, spacing, radius)
   - UI library + version
   - Screen inventory with routes
   - Component tree with props
   - Layout specifications
   - Responsive breakpoints
3. Write `{{OUTPUT_DIR}}/ux/screen-inventory.md` — all screens with FR mapping
4. Write `{{OUTPUT_DIR}}/ux/components.md` — component catalog from the preview app
5. Write `{{OUTPUT_DIR}}/ux/flows.md` — navigation flow diagrams

The preview app (`{{OUTPUT_DIR}}/ux-preview/`) IS the source of truth for downstream skills. Use React Grab to inspect it rather than static screenshots.

## Validation

```bash
bash {{APED_DIR}}/aped-ux/scripts/validate-ux.sh {{OUTPUT_DIR}}/ux
```

If validation fails: fix missing files or content and re-validate.

## State Update

Update `{{OUTPUT_DIR}}/state.yaml`:
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

## Next Step

Tell the user: "UX design is ready. Run `aped-epics` to create epics and stories."

The epics phase reads `{{OUTPUT_DIR}}/ux/` (all 4 spec files) and inspects the live preview app via React Grab to enrich stories with:
- Component references (which component to use, which props)
- Screen references from the live preview app
- Design tokens to respect
- Responsive requirements per screen

**Do NOT auto-chain.** The user decides when to proceed.

## Common Issues

- **npm create vite fails**: Ensure Node.js 18+ is installed. Try `node --version` first.
- **UI library install fails**: Check network. For shadcn, ensure the project has a tsconfig.json.
- **User gives no design inspiration**: Use the product domain to suggest a style — "SaaS dashboard" → clean/minimal, "e-commerce" → card-heavy/visual
- **Prototype looks wrong on mobile**: Check responsive breakpoints — sidebar must collapse, touch targets ≥ 44px
- **Dark mode contrast fails**: Use semantic tokens, not hardcoded colors. Check with browser devtools contrast checker.
