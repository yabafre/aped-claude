// Per-`ticket_system` markdown blocks for the ticket-git-workflow reference
// doc. See ../references.js for assembly. Each block is rendered standalone
// — only the configured provider's block is concatenated into the final doc
// at scaffold time, instead of shipping all five.

export const ISSUE_TRACKER_NONE = `### If ticket_system = "none"
Skip all ticket references. Use plain commit messages without ticket IDs.`;

export const ISSUE_TRACKER_LINEAR = `### If ticket_system = "linear"

**BEFORE starting a story:**
1. Find the corresponding Linear issue
2. Move issue status to **In Progress**
3. Use the **Linear-suggested git branch name** (from Linear UI: "Copy git branch name")
4. Add a comment on the issue: what you're about to implement

**DURING development:**
- Reference the Linear issue ID in EVERY commit message
- Use **Linear magic words** for auto-linking:
  - \`Part of TEAM-XX\` — links without closing (use in intermediate commits)
  - \`Fixes TEAM-XX\` — links and auto-closes issue on merge
- Commit format: \`type(TEAM-XX): description\\n\\nPart of TEAM-XX\`

**AFTER completing:**
1. Create PR with issue ID: \`gh pr create --title "feat(TEAM-XX): Story X.Y - Description" --body "Fixes TEAM-XX"\`
2. Move issue to **In Review**
3. After merge: move to **Done**
4. Update state.yaml to match`;

export const ISSUE_TRACKER_JIRA = `### If ticket_system = "jira"

**BEFORE:** Find JIRA issue (PROJ-XX), move to In Progress, use branch: \`feature/PROJ-XX-description\`

**DURING:**
- Reference JIRA issue ID in every commit: \`type(PROJ-XX): description\`
- JIRA smart commits: \`PROJ-XX #in-progress\`, \`PROJ-XX #done\`

**AFTER:**
- PR title: \`feat(PROJ-XX): Story X.Y - Description\`
- JIRA auto-links PRs via issue ID in branch name or commit`;

export const ISSUE_TRACKER_GITHUB_ISSUES = `### If ticket_system = "github-issues"

**BEFORE:** Find GitHub issue #XX, assign yourself

**DURING:**
- Reference in commits: \`type(#XX): description\`
- Use \`Closes #XX\` or \`Fixes #XX\` in final commit/PR body

**AFTER:**
- \`gh pr create --title "feat: Story X.Y" --body "Closes #XX"\`
- Issue auto-closes when PR merges`;

export const ISSUE_TRACKER_GITLAB_ISSUES = `### If ticket_system = "gitlab-issues"

**BEFORE:** Find GitLab issue #XX, assign yourself

**DURING:**
- Reference: \`type(#XX): description\`
- Use \`Closes #XX\` in commit/MR body

**AFTER:**
- \`glab mr create --title "feat: Story X.Y" --description "Closes #XX"\`
- Issue auto-closes when MR merges`;

const ISSUE_TRACKER_BLOCKS = {
  none: ISSUE_TRACKER_NONE,
  linear: ISSUE_TRACKER_LINEAR,
  jira: ISSUE_TRACKER_JIRA,
  'github-issues': ISSUE_TRACKER_GITHUB_ISSUES,
  'gitlab-issues': ISSUE_TRACKER_GITLAB_ISSUES,
};

// Defensive default: unrecognised ticket_system values render the "none"
// block rather than throwing. Keeps scaffolds robust if the config carries
// a typo or a future provider that hasn't shipped a block yet.
export function issueTrackerSection(ts) {
  return ISSUE_TRACKER_BLOCKS[ts] ?? ISSUE_TRACKER_NONE;
}
