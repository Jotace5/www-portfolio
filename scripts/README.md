# Codebase Analysis Pipeline

Automated pipeline that analyzes project codebases and generates JSON data for the Three.js visualizer in the Projects section. We use **emerge-viz**, an open-source code analysis tool created by Grzegorz Lato. It scans source code, extracts real import/dependency relationships, calculates software metrics (SLOC, fan-in/out, modularity), and generates interactive graph visualizations.

## How it works

```
projects.config.json    →    analyze.sh    →    transform.ts    →    {project}.json
     (config)              (clone + emerge)     (clean + optimize)    (ready for Three.js)
```

## Pipeline flow

1. **Config** — `projects.config.json` defines which repos to analyze, with what languages and file extensions.
2. **Clone** — `analyze.sh` clones each repo with `git clone --depth 1` into a temporary workspace directory.
3. **Analyze** — emerge-viz scans the source code and generates 4 raw files in `public/data/projects/.raw/{name}/`:
   - `dependency-graph.json` — Real import relationships between files (nodes + edges)
   - `filesystem-graph.json` — Directory structure as a graph (parent→child)
   - `metrics.json` — Per-file metrics: SLOC, fan-in, fan-out, number of methods, TF-IDF keywords
   - `emerge-data.js` — Louvain cluster metrics and overall statistics (JavaScript format, not JSON)
4. **Transform** — `transform.ts` reads all 4 raw files, cleans absolute paths, resolves ghost nodes, discards external dependencies, recalculates metrics, and produces a single optimized `{name}.json` for Three.js.
5. **Consume** — The Three.js visualizer in the Projects section reads the static JSON and renders the interactive 3D graph.

## Quick start

### Prerequisites

- Python 3.10–3.12 (3.13+ not compatible with emerge)
- jq ([download](https://jqlang.github.io/jq/download/))
- Node.js 22+
- emerge-viz ([download](https://github.com/glato/emerge))

### First-time setup

```bash
# Install Node dependencies (tsx is required to run transform.ts)
npm install

# Create Python virtual environment
python3 -m venv .venv                          # or python on Windows

source .venv/bin/activate                       # Linux/macOS
# source .venv/Scripts/activate                 # Windows (Git Bash)

pip install "setuptools<70" emerge-viz
```

> **Why setuptools<70?** emerge-viz depends on `pkg_resources` which was removed in setuptools 70+.

### Running the pipeline

```bash
# Activate the virtual environment first
source .venv/bin/activate                       # Linux/macOS
# source .venv/Scripts/activate                 # Windows (Git Bash)

# Run analysis (clones repos, runs emerge)
./scripts/analyze.sh

# Transform raw output to visualizer format
npx tsx scripts/transform.ts \
  --input public/data/projects/.raw/www-portfolio \
  --output public/data/projects/www-portfolio.json
```

> **Note:** Once the transform step is integrated into `analyze.sh`, only the first command will be needed. The script will automatically call `transform.ts` for each project after emerge finishes.

## Adding a new project

Edit `projects.config.json` at the project root:

```json
[
  {
    "name": "my-project",
    "repo": "Jotace5/my-project",
    "sourceDir": "src",
    "languages": ["typescript"],
    "extensions": [".ts", ".tsx"],
    "ignoreDependencies": []
  }
]
```

| Field | Description |
|-------|-------------|
| `name` | Unique ID — used as output filename (`{name}.json`) |
| `repo` | GitHub repo in `owner/repo` format |
| `sourceDir` | Directory to analyze: `"src"` for a src/ folder, `"."` for root |
| `languages` | emerge language keys: `typescript`, `javascript`, `python`, `java`, `kotlin`, `swift`, `c`, `cpp`, `groovy`, `objc`, `ruby`, `go` |
| `extensions` | File extensions to scan (include the dot) |
| `ignoreDependencies` | Import strings to exclude from the graph (e.g., `["java.util"]`) |

Then run the pipeline:

```bash
./scripts/analyze.sh
npx tsx scripts/transform.ts \
  --input public/data/projects/.raw/my-project \
  --output public/data/projects/my-project.json
```

## What emerge analyzes

[emerge-viz](https://github.com/glato/emerge) is an open-source Python tool that:

- Parses real import/dependency relationships between files
- Calculates metrics: SLOC, fan-in, fan-out, number of methods
- Runs Louvain modularity to detect community clusters
- Extracts TF-IDF semantic keywords per file

It supports: C, C++, Java, JavaScript, TypeScript, Kotlin, Python, Go, Ruby, Swift, ObjC, Groovy.

Install it from PyPI with `pip install emerge-viz`. Documentation and source code at [github.com/glato/emerge](https://github.com/glato/emerge).

## What transform.ts does

Takes the raw emerge output (absolute Windows/Linux paths, ghost nodes, external dependencies mixed in) and produces clean JSON:

- **Strips absolute paths** → `components/hero/HeroSection.tsx`
- **Discards external deps** → removes `react`, `next`, etc.
- **Resolves ghost nodes** → maps `@/components/X` to real files
- **Recalculates fan-in/out** from clean edges
- **Normalizes metrics** → size (log-scaled SLOC) and heat (SLOC × fan-out)
- **Generates cluster labels** from dominant directory per Louvain community
- **Rebuilds filesystem tree** from clean node paths

## Output JSON structure

Each `public/data/projects/{name}.json` contains:

- **nodes** — One per source file with: path, metrics (sloc, methods, fanIn, fanOut), normalized values (size 0-1, heat 0-1), cluster assignment, TF-IDF tags
- **edges.dependencies** — Import relationships between files (drives force-directed layout)
- **edges.filesystem** — Parent→child directory containment
- **clusters** — Louvain communities with aggregate metrics
- **filesystem.tree** — Nested directory structure
- **stats** — Project-level aggregates (max fan-in/out, averages, modularity score)
- **meta** — Project name, analysis timestamp, file/edge counts

## File locations

```
www-portfolio/
├── projects.config.json                    # Pipeline config (you edit this)
├── scripts/
│   ├── analyze.sh                          # Orchestrator (bash)
│   ├── transform.ts                        # Raw → clean transformer (TypeScript)
│   └── README.md                           # This file
├── public/data/projects/
│   ├── www-portfolio.json                  # Generated — committed to git
│   ├── audio-transcriber.json              # Generated — committed to git
│   └── .raw/                               # Staging — gitignored
│       ├── www-portfolio/
│       │   ├── dependency-graph.json       # Raw emerge output
│       │   ├── filesystem-graph.json
│       │   ├── metrics.json
│       │   └── emerge-data.js
│       └── audio-transcriber/
│           └── ...
└── .venv/                                  # Python venv — gitignored
```

## Automation (GitHub Actions)

The pipeline runs automatically in CI via `.github/workflows/analyze-projects.yml`.

### Triggers

The workflow runs in two scenarios:

- **On push to `main`** — Only when `projects.config.json` changes. This is the normal flow for adding a new project: you create a branch, edit the config, open a PR, merge to main, and the Action runs immediately.
- **Weekly cron** (Mondays at 6:00 AM UTC) — Re-analyzes all configured projects to keep the data fresh, even if `projects.config.json` hasn't changed. This catches changes in the source repos themselves (e.g., new commits to `audio-transcriber`).

You can also trigger the workflow manually from the Actions tab in GitHub (`workflow_dispatch`).

### What the Action does

1. Checks out the repo
2. Sets up Node.js 22 and installs dependencies (`npm ci`)
3. Sets up Python 3.12 and installs `setuptools<70` + `emerge-viz`
4. Runs `bash scripts/analyze.sh` — clones each configured repo, runs emerge, then runs `transform.ts` to produce the final JSONs
5. If any `public/data/projects/*.json` files changed, commits them back to the repo with `chore: update project analysis data [skip ci]`
6. Pushes the commit to `main`, which triggers Vercel auto-deploy

### Flow for adding a new project

```
1. Create a feature branch
2. Edit projects.config.json — add the new project entry
3. Push, open PR, merge to main
4. GitHub Action triggers automatically
5. VM clones repos → runs emerge → runs transform.ts
6. Action commits generated JSONs back to repo
7. Vercel auto-deploys with fresh data
8. Visualizer on jotace.io shows the new project
```

### Loop prevention

The Action's commit uses `[skip ci]` in the commit message to prevent the push from triggering another workflow run. Additionally, the push trigger uses `paths` filtering so only changes to `projects.config.json` trigger a run — changes to `public/data/projects/` are ignored.