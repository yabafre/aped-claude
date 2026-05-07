# Writing Discipline — Commits, PRs, Comments, Reviews, Tickets

**Iron Law.** Short, sharp, slightly human. The diff proves the work — prose adds the *why*, never re-narrates the *what*.

If a sentence repeats what the diff already shows, it's noise. If a section feels like it's there to *prove* the work happened, cut it.

## What this applies to

- **Commit messages** — subject + optional body
- **PR titles + bodies**
- **Code comments** authored mid-implementation
- **Review reports** (summary, findings, decisions in Review Records)
- **Ticket comments** (Linear / Jira / GitHub / GitLab — issue updates, descope notes, sync comments)

## What this does NOT apply to

PRDs, stories, architecture docs, retros, project-context. Those are structured specs by design — keep them detailed.

## The rules

### Commits

- **Subject:** one line, imperative, ≤ 70 chars, says the change in human terms.
- **Body:** only if there is a non-obvious *why*. 2–4 sentences. No bullet inventories. No file lists. No test counts. No "boundaries respected" checkboxes.
- A metaphor or framing line is welcome where it fits ("kill switch with memory", "drift gets a fence"). Don't force it.

### PRs

- **Title:** short and recognizable. Same rules as commit subject.
- **Body:** 3–6 short bullets max, one sentence each. Lead with the human framing — *what changed for the reader, what's the lever this pulls*.
- **Test plan:** 2–4 bullets max. What was actually verified, not a script-by-script inventory.
- Drop "Migration notes", "Boundaries respected", per-commit tables. Unless the user asks.

### Code comments

- Only when WHY is non-obvious. Never restate WHAT.
- Never reference "this PR" / "issue #" / "added for the X flow" — those rot.
- One short line. Multi-paragraph docstrings only when public-API contract demands it.

### Review reports / Review Records

- Lead with the verdict and the *one thing* that matters.
- Findings: severity, file:line, one-sentence rationale, fix or defer. No padding.
- "Minimum findings floor" doesn't mean "pad to N". If you genuinely have fewer, say so and stop.

### Ticket comments

- Status change + one-line context. Link to the artefact (story file, commit, PR) that explains the rest.
- Don't re-narrate the work in the ticket.

## Smell test (run before sending)

1. Could a reader skim this in 10 seconds and know what changed and why?
2. Would I be embarrassed reading this back as a senior engineer?
3. Is there any sentence that's there to look thorough rather than to inform?

If any answer is no/yes/yes — cut.
