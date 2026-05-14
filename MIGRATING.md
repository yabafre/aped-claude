# Migrating between APED major versions

APED has shipped two structural breaks since the early days:

- **4.0.0** retired the `/aped-X` slash-command surface; skills became the only invocation path (Skill tool + natural-language routing via `description:` triggers).
- **6.0.0** moved every skill into a directory (`aped-X/SKILL.md` + optional `workflow.md` + `steps/step-NN-*.md`).

Both migrations preserve `state.yaml` and the `docs/aped/` artefacts. The scaffolder (`aped-method --update`) handles the on-disk rewrite. The notes below cover what changes outside that auto-migration.

> Need to go further back? See [CHANGELOG.md](./CHANGELOG.md). 3.x → 4.x and 5.x → 6.x are the two breaks worth a dedicated page; everything else is additive.

---

## From 5.x

The 5.x flat-file scaffolds (`.aped/aped-X.md`) still work — the loader handles both layouts. To pick up the v6.0.0 directory structure on an existing install:

```bash
npx aped-method --update            # rewrites every skill into directory layout, preserves state.yaml + artefacts
```

The branch-creation responsibility also moved in v6.0.0:

- `aped-story` is now the canonical place that creates `feature/{ticket}-{slug}` and refuses to operate on `main`/`master`/`prod`/`production`/`develop`/`release/*`/detached HEAD.
- `aped-dev` only verifies the branch — never creates it.

Existing `lessons.md` rules referring to `aped-dev` branch creation should be re-scoped to `aped-story`.

---

## From 3.x

The 3.x slash-command surface (`/aped-X`, scaffolded as `.claude/commands/aped-*.md`) was retired in **4.0.0**. To upgrade an existing 3.12 install:

```bash
npx aped-method --update                                  # rewrites the engine; legacy stubs are left in place
rm -rf .claude/commands/aped-*.md                         # remove the now-obsolete shells
sed -i '' '/^commands_path:/d' .aped/config.yaml          # drop the dead key (macOS; use `sed -i` on Linux)
```

`aped-method doctor` reports both leftovers as warn-level diagnostics (non-blocking — exitCode stays 0) until they are cleaned up. Existing `lessons.md` entries that filter by `Scope: /aped-X` should be rewritten to `Scope: aped-X` so 4.0+ skills load them.

After cleanup, every skill invocation goes through the Skill tool or natural-language routing matching the skill's `description:` field. There is no slash-command alternative anymore.

---

## After upgrade

- Run `aped-method doctor` to verify the scaffold, hooks, state, skills, symlinks, and optional binaries.
- Re-run `aped-method symlink` if you added a new IDE marker directory (`.opencode/`, `.agents/`, `.codex/`) since the last install — fresh symlinks land only where the marker exists.
- Review `state.yaml` for any phase that needs re-anchoring against the new skill layout. The schema is `state.yaml.schema.vN.json` under `.aped/data/`; mismatches surface as WARN on `validate-state.sh`.

If anything resists the auto-migration, file an issue at [yabafre/aped-claude](https://github.com/yabafre/aped-claude/issues) with the output of `aped-method doctor` attached.
