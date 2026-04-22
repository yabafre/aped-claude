# Security Policy

`aped-method` (package on npm, repository [yabafre/aped-claude](https://github.com/yabafre/aped-claude)) is a CLI that scaffolds files into a user's project. It runs on a developer machine with the privileges of the invoking user, so the security posture matters even though the tool itself performs no network calls after install.

## Supported Versions

Security patches are issued for the latest `3.x` minor release only.

| Version  | Supported          |
| -------- | ------------------ |
| 3.7.x    | :white_check_mark: |
| < 3.7    | :x:                |

Users on older majors should upgrade before reporting an issue.

## Reporting a Vulnerability

**Please do not open public GitHub issues for security reports.**

Preferred channels, in order:

1. **GitHub Security Advisories** — [open a private advisory](https://github.com/yabafre/aped-claude/security/advisories/new). This is the primary channel: it creates a private discussion, lets us coordinate a fix and CVE, and publishes the advisory atomically with the patch release.
2. **Private email** — `fred@bonjour.email` with the subject prefix `[aped-method security]`. Use this only if GitHub Advisories is not an option.

Include, when possible:
- affected version(s) and platform (macOS / Linux / Windows)
- reproduction steps or a proof of concept
- the impact you observed (path traversal, arbitrary file write, etc.)
- whether the issue is already public anywhere

We aim to:
- acknowledge the report within **72 hours**
- share a preliminary assessment (confirmed / needs info / out of scope) within **7 days**
- ship a patched release within **30 days** for confirmed high-severity issues

## Scope

In scope:
- the `aped-method` CLI binary and `src/` code published to npm
- the GitHub Actions release workflow (`.github/workflows/release.yml`)
- the scaffolded `guardrail.sh` hook — it runs on every user prompt and must not be exploitable via crafted prompt content

Out of scope:
- BMAD or third-party skill content distributed alongside APED — report those upstream
- the end-user's own project files after scaffolding
- vulnerabilities in `@clack/prompts` or `picocolors` (report to their maintainers; we will track and bump)

## Hardening already in place

For context on the existing threat model:

- **Path validation**: `validateSafePath` rejects null bytes, absolute paths, and `..` segments in any user-supplied path (CLI flags and `config.yaml`).
- **YAML allowlist**: `config.yaml` values are loaded only for keys in an explicit whitelist; unknown keys are silently ignored (and logged under `--debug`) to avoid attacker-controlled config injection.
- **CLI flag allowlist**: unknown `--flags` produce a warning but cannot set values.
- **Guardrail hook**: bash hardened with `set -eu -o pipefail`; prompt content is passed to `jq` via stdin (never interpolated into a shell command).
- **No dynamic `require`/`eval`**: the CLI does not execute user-supplied code.
- **Scaffolder never deletes outside of `config.apedDir`, `config.outputDir`, `config.commandsDir`, and the whitelisted symlink targets** (`.claude/skills`, `.opencode/skills`, `.agents/skills`, `.codex/skills`).

## What the `safe-bash` hook does and does not do

APED ships an opt-in `safe-bash` hook (install via `aped-method safe-bash`) that checks Bash commands against a short regex allow/deny list before Claude Code runs them.

**It is a best-effort UX safety net, not a security boundary.** It helps catch obvious typos and copy-paste accidents (`rm -rf /`, `curl | bash`, `chmod -R 777`, etc.) and asks before elevated operations (`sudo`). It cannot and does not:

- parse shell syntax (aliases, heredocs, here-strings, process substitution)
- resolve variable indirection (`CMD=$(…); $CMD`)
- decode obfuscated payloads (base64, hex via `printf`, ROT, etc.)
- observe runtime state (env vars, earlier commands in the same shell)
- replace OS-level isolation (containers, seccomp, user separation)

Crafted commands bypass the regex matcher in one line. The rule set in `src/bash-safety.js` and the mirrored list inside `src/templates/hooks/safe-bash.js` are deliberately narrow to keep false positives low at the cost of false negatives. If you need an adversarial defense, use a container or a dedicated user account — do not treat the hook as one.

## Supply chain

- Only two runtime dependencies (`@clack/prompts`, `picocolors`). Transitive tree is audited manually before each release.
- `prepublishOnly` runs syntax + smoke checks + unit tests before any publish.
- `npm publish --provenance` runs from the GitHub release workflow when an `NPM_TOKEN` secret is configured (see `.github/workflows/release.yml`). Enable it in your fork for verifiable builds.

### Known dev-only advisories

`devDependencies` do not ship to end users. Advisories that apply only when the project is cloned and `vitest` is executed are tracked here rather than patched aggressively, to keep the Node 18 baseline for contributors:

- **`esbuild <=0.24.2` (transitive via `vitest@2.x`)** — [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99): the esbuild dev server is permissive about cross-origin requests. `vitest run` (what our CI invokes) does not start the dev server, so there is no practical exposure. A fix requires moving to `vitest@4.x`, which drops Node 18 support.
