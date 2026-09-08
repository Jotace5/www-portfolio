---
status: accepted
---

# How the analysis pipeline resolves a project's source

The pipeline analysed one kind of project — a public GitHub repo, cloned from a URL built out of
the config's `repo` field. Adding `skin-studio-saas`, which is private and stays private,
introduced a second kind: a checkout that already exists on Juan's disk. Rather than special-case
it, the config now declares **where a project's code comes from** as a discriminated union, and
`analyze.sh` clones from whichever origin it names.

```json
{ "name": "www-portfolio",
  "source": { "type": "github", "repo": "Jotace5/www-portfolio" } }

{ "name": "skin-studio-saas",
  "source": { "type": "local", "pathEnv": "SKIN_STUDIO_SAAS_PATH", "branch": "main" } }
```

Four things follow from that shape, and each was a decision in its own right.

**Local sources are cloned, not scanned in place.** `analyze.sh` could have pointed emerge
straight at the folder on disk. It clones into the temp workspace instead, exactly as it does for
remote projects, so a published graph always reflects committed state. Scanning in place would
analyse whatever happened to be in the working tree that day — half-written code included — and
would leave no way to choose a branch. A local clone is cheap enough that the trade never
bites: the source repo's `.git` is under 3 MB, and `git clone --depth 1 <path>` silently ignores
`--depth` for local paths anyway (`warning: --depth is ignored in local clones`).

**The local path is held in an environment variable, never written into the config.**
`source.pathEnv` stores the *name* of the variable, not a path; the value lives in the developer's
shell and is documented in `scripts/README.md`. `projects.config.json` is committed to a public
repo, so it must be able to say *which projects exist* without saying *where they sit on one
particular machine*. The script resolves the name with bash indirect expansion (`${!var}`) rather
than `eval` or `envsubst`, so a config file is never executed as code.

**The branch is pinned explicitly.** `source.branch` is optional; when it is absent the source's
default branch is used, which is what remote projects have always done implicitly. It matters for
local sources because a clone from a local path follows the *source repo's HEAD* — whichever
branch the developer happens to have checked out. Without pinning, the published graph would be
whatever Juan was working on, and would change on its own the next time he switched branches.

**A missing source fails the run, not just the project.** A GitHub URL is either reachable or the
network is down; a local path can be absent in a more ordinary way — the variable is unset, or the
folder moved. `analyze.sh` collects failures instead of bare `continue`s, lists them after the
final summary, and exits non-zero. Errors still print inline as they happen; the recap exists so a
failure is not lost in emerge's log, and the exit code is what will stop a future `npm run` or
git hook from carrying on as though the data were fresh.

## Considered options

- **A flat optional `localPath` field** alongside `repo`, presence acting as the discriminator.
  Rejected: nothing stops an entry carrying both fields or neither, and the reader has to know an
  unwritten precedence rule. The union makes those states unwritable. It also frees `repo` from
  double duty — the frontend will eventually want a field of that name meaning "the public link",
  which `skin-studio-saas` does not have.
- **`repo` accepting a filesystem path, detected by prefix.** Rejected: implicit, and brittle
  exactly where it would be used — Windows paths.
- **An absolute path in the config** (`C:/dev/...`), documented as machine-specific. Rejected: it
  publishes the developer's disk layout in a public repo and works on one machine.
- **A path relative to the portfolio root** (`../../skn-loyalty-platform/skin-studio-saas`). It
  resolves correctly today, and needs no machinery. Rejected because it turns the developer's
  `dev/` folder layout into a contract: move a directory and the pipeline breaks.
- **A gitignored `projects.config.local.json` override.** Rejected: it duplicates the project list
  and the two files have to be kept in sync by name.
- **Renaming the `skin-studio-saas` repository** so the portfolio and the repo agree. Not needed:
  with a local source the portfolio clones from a path and derives nothing from the GitHub repo
  name. The two are decoupled, and a rename would change only the value of a variable on one
  machine.

## Consequences

- `repo` is a **pipeline-only** field and always was. `src/lib/constants/projects.ts` reads only
  `p.name` and `p.frontend.*`; `src/lib/types/github.ts` declares `repo` but no consumer reads the
  value; `/api/github` builds its URLs from `GITHUB_OWNER` + `p.name`. Moving it under `source`
  is therefore a type change with no behaviour change on the frontend.
- Pinning `skin-studio-saas` to `main` means **work has to be merged before it shows up in the
  graph**. When this was decided the local checkout sat on `feat/portal-clienta`, 21 commits ahead
  of `main` (36 files / 1879 lines under `src` against 32 / 1385), so the client-portal work is
  invisible to the portfolio until that branch lands.
- `sourceDir`, `languages` and `extensions` stay outside `source`: they describe how a project is
  analysed, not where it comes from.

## Status of the implementation

Decided, **not yet implemented**. `analyze.sh` still clones from GitHub URLs and the config still
carries a flat `repo` field. The decision was reached in
[Analysis from a local clone: source, branch and working-tree state](https://github.com/Jotace5/www-portfolio/issues/62),
under [Map: Skin Club in the Projects section](https://github.com/Jotace5/www-portfolio/issues/61),
which plans the change and hands a spec to the implementer.
