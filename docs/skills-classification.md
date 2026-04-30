# Skills classification — hard-dep vs soft-dep

This matrix classifies every shipped APED skill by its dependence on `aped/config.yaml` keys and `aped/state.yaml` machinery. The distinction tells the agent (and the human reader) which skills run anywhere vs which need APED's pipeline state to be initialized first.

> Inspired by [Matt Pocock's ADR 0001](https://github.com/mattpocock/skills/blob/main/docs/adr/0001-explicit-setup-pointer-only-for-hard-dependencies.md): hard-deps carry an explicit setup pointer; soft-deps stay token-light and reference config in vague prose only.

## Criteria

A skill is **hard-dep** if at least one of:

1. **Ticket-aware** — its documented behaviour changes when `ticket_system` is configured (fetch / sync / comment / close). The skill keeps working with `ticket_system: none` (internal-markdown mode), but the integration path is one of its first-class outputs.
2. **Sprint-state-bound** — it requires `state.yaml.sprint` populated by an upstream phase (typically `aped-epics` → `aped-sprint`) and operates inside git worktrees, or coordinates across them.

A skill is **soft-dep** if it works on any project with default config and no upstream APED phase output. It may reference config in prose but degrades gracefully without setup.

## Matrix

### Hard-dep — ticket-aware (6)

| Skill | Why |
|-------|-----|
| `aped-from-ticket` | Cannot run without `ticket_system != 'none'`. Pickup is the whole point. |
| `aped-epics` | Writes tickets to the configured tracker when not `none`. Still emits the internal markdown plan otherwise. |
| `aped-story` | Fetches the ticket as the source of truth before drafting; syncs refined ACs back via comment. |
| `aped-ship` | Opens the umbrella PR via `git_provider` and closes the matching tickets via `ticket_system`. |
| `aped-receive-review` | Reads PR / ticket review comments to derive the fix-with-test queue. |
| `aped-quick` | Labels the hotfix on the ticket tracker so the team sees the bypass. |

### Hard-dep — sprint-state (2)

| Skill | Why |
|-------|-----|
| `aped-sprint` | Reads `sprint.stories` from `state.yaml`, dispatches each into a `git worktree`. Without an epics phase output, there's nothing to dispatch. |
| `aped-lead` | Coordinates across the worktrees produced by `aped-sprint`. Standalone invocation has no worktrees to lead. |

### Soft-dep (17)

| Skill | Notes |
|-------|-------|
| `aped-analyze` | Brief from scratch — runs greenfield or alongside `aped-context`. |
| `aped-brainstorm` | Horizontal — invokable at any phase, no upstream needed. |
| `aped-prfaq` | Optional upstream of `aped-analyze`; runs anywhere. |
| `aped-context` | Brownfield analysis — produces context, doesn't consume APED state. |
| `aped-prd` | Requires a brief but HALTs gracefully with a clear message. |
| `aped-arch` | Requires a PRD but HALTs gracefully. |
| `aped-ux` | Requires a PRD but HALTs gracefully. |
| `aped-dev` | Reads a story file but doesn't itself need ticket sync. |
| `aped-debug` | Diagnostic loop — runs anywhere. |
| `aped-qa` | Generates tests for a story; reads the story file, no config needed. |
| `aped-review` | Adversarial code review — runs on any code. |
| `aped-retro` | Reads epic state but presents what's there even if partial. |
| `aped-course` | Mid-sprint pivot — best when sprint exists, but writes to corrections log either way. |
| `aped-status` | Reads `state.yaml` — shows what's there, no requirement on contents. |
| `aped-checkpoint` | Human-in-the-loop review — runs anywhere. |
| `aped-claude` | Syncs CLAUDE.md — only needs `project_name` / `user_name`. |
| `aped-elicit` | Deep critique toolkit — horizontal, runs on any artefact. |

## Reading hard-dep setup pointers

Each hard-dep skill carries an explicit `> Setup pointer:` line right after its Iron Law block. The pointer names the config key (or upstream phase) the skill expects, and the command to run if the project isn't initialized. This costs ~1 line per hard-dep and is worth it: the agent gets an explicit signal instead of guessing why a skill behaves oddly.

Soft-deps stay token-light by design — no setup pointer, no preamble. Their bodies still reference config in prose where relevant.
