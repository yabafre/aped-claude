// Per-`git_provider` markdown blocks for the ticket-git-workflow reference
// doc. See ../references.js for assembly. Only the configured provider's
// block is concatenated into the final doc at scaffold time.

export const GIT_PROVIDER_GITHUB = `### If git_provider = "github"

**Branch strategy:**
\`\`\`
main (production)
  └── develop (integration, if configured)
        └── feature/{ticket-id}-description
\`\`\`

**Commands:**
\`\`\`bash
# Start story
git checkout main  # or develop if exists
git pull
git checkout -b feature/{ticket-id}-description

# During dev
git add <specific-files>  # NEVER git add . or git add -A
git commit -m "type({ticket-id}): description"

# Complete
git push -u origin feature/{ticket-id}-description
gh pr create --base main --title "type({ticket-id}): Story X.Y - Title" --body "Fixes {ticket-id}"

# After merge
git checkout main && git pull
git branch -d feature/{ticket-id}-description
\`\`\``;

export const GIT_PROVIDER_GITLAB = `### If git_provider = "gitlab"

**Commands:**
\`\`\`bash
# Start
git checkout main && git pull
git checkout -b feature/{ticket-id}-description

# Complete
git push -u origin feature/{ticket-id}-description
glab mr create --base main --title "type({ticket-id}): Story X.Y" --description "Closes {ticket-id}"

# After merge
git checkout main && git pull
git branch -d feature/{ticket-id}-description
\`\`\``;

export const GIT_PROVIDER_BITBUCKET = `### If git_provider = "bitbucket"

**Commands:**
\`\`\`bash
# Start
git checkout main && git pull
git checkout -b feature/{ticket-id}-description

# Complete
git push -u origin feature/{ticket-id}-description
# Create PR via Bitbucket web UI or API
\`\`\``;

const GIT_PROVIDER_BLOCKS = {
  github: GIT_PROVIDER_GITHUB,
  gitlab: GIT_PROVIDER_GITLAB,
  bitbucket: GIT_PROVIDER_BITBUCKET,
};

// Defensive default: unrecognised git_provider values render the GitHub
// block (the scaffolder default) rather than throwing.
export function gitProviderSection(gp) {
  return GIT_PROVIDER_BLOCKS[gp] ?? GIT_PROVIDER_GITHUB;
}
