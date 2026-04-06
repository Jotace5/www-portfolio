#!/usr/bin/env bash
set -euo pipefail

# Section 1: Variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/projects.config.json"
WORKSPACE="/tmp/emerge-workspace"
OUTPUT_DIR="$PROJECT_ROOT/public/data/projects"
RAW_DIR="$OUTPUT_DIR/.raw"

# Section 2: Helper function
to_yaml_list() {
  local indent="$1"
  shift
  for item in "$@"; do
    echo "${indent}- $item"
  done
}

resolve_path() {
  cd "$1" && pwd -W 2>/dev/null || pwd
}

# Section 3: Dependency check
if ! command -v jq &> /dev/null; then
  echo "Install jq: https://jqlang.github.io/jq/download/"
  exit 1
fi

if command -v python3 &> /dev/null; then
  PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
  PYTHON_CMD="python"
else
  echo "Install Python 3.10-3.12: https://www.python.org/downloads/"
  exit 1
fi

if command -v emerge &> /dev/null; then
  EMERGE_CMD="emerge"
elif $PYTHON_CMD -m emerge --help &> /dev/null; then
  EMERGE_CMD="$PYTHON_CMD -m emerge"
else
  echo "Install emerge-viz: pip install \"setuptools<70\" emerge-viz"
  exit 1
fi

# Section 4: Validate config
if [ ! -f "$CONFIG_FILE" ]; then
  echo "ERROR: Config file not found at $CONFIG_FILE"
  exit 1
fi

PROJECT_COUNT=$(jq '. | length' "$CONFIG_FILE")
echo ""
echo "Found $PROJECT_COUNT projects to analyze"

# Section 5: Setup workspace
rm -rf "$WORKSPACE"
mkdir -p "$WORKSPACE"
mkdir -p "$OUTPUT_DIR"
mkdir -p "$RAW_DIR"

# Section 6: Project loop
for (( i=0; i<PROJECT_COUNT; i++ )); do
  # 6a. Extract config fields
  name=$(jq -r ".[$i].name" "$CONFIG_FILE")
  repo=$(jq -r ".[$i].repo" "$CONFIG_FILE")
  source_dir=$(jq -r ".[$i].sourceDir" "$CONFIG_FILE")
  
  mapfile -t languages < <(jq -r ".[$i].languages[]" "$CONFIG_FILE")
  mapfile -t extensions < <(jq -r ".[$i].extensions[]" "$CONFIG_FILE")
  ignore_deps=$(jq -r ".[$i].ignoreDependencies[]" "$CONFIG_FILE" 2>/dev/null || true)
  ignore_dirs=$(jq -r ".[$i].ignoreDirectories[]" "$CONFIG_FILE" 2>/dev/null || true)
  
  # 6b. Print header
  echo ""
  echo "========================================="
  echo "  Analyzing: $name"
  echo "  Repo: $repo"
  echo "========================================="
  
  # 6c. Clone repo (shallow)
  if ! git clone --depth 1 "https://github.com/${repo}.git" "$WORKSPACE/$name" 2>&1; then
    echo "ERROR: Failed to clone $repo — skipping"
    continue
  fi
  
  # 6d. Validate source directory
  SCAN_DIR="$WORKSPACE/$name/$source_dir"
  if [ ! -d "$SCAN_DIR" ]; then
    echo "ERROR: Source directory '$source_dir' not found in $repo — skipping"
    continue
  fi
  
  # 6e. Generate emerge YAML config
  lang_yaml=$(to_yaml_list "      " "${languages[@]}")
  ext_yaml=$(to_yaml_list "      " "${extensions[@]}")
  
  ignore_deps_block=""
  if [ -n "$ignore_deps" ]; then
    ignore_deps_block="    ignore_dependencies_containing:"
    while IFS= read -r dep; do
      ignore_deps_block="${ignore_deps_block}
      - $dep"
    done <<< "$ignore_deps"
  fi
  
  ignore_dirs_block=""
  if [ -n "$ignore_dirs" ]; then
    ignore_dirs_block="    ignore_directories_containing:"
    while IFS= read -r dir; do
      ignore_dirs_block="${ignore_dirs_block}
      - $dir"
    done <<< "$ignore_dirs"
  fi
  
  EMERGE_CONFIG="$WORKSPACE/$name/emerge-config.yaml"
  EXPORT_DIR="$WORKSPACE/$name/export"
  mkdir -p "$EXPORT_DIR"
  
  RESOLVED_SCAN_DIR="$(resolve_path "$SCAN_DIR")"
  RESOLVED_EXPORT_DIR="$(resolve_path "$EXPORT_DIR")"
  
  cat > "$EMERGE_CONFIG" << YAML
---
project_name: $name
loglevel: info
analyses:
  - analysis_name: full_analysis
    source_directory: $RESOLVED_SCAN_DIR
    only_permit_languages:
$lang_yaml
    only_permit_file_extensions:
$ext_yaml
$ignore_deps_block
$ignore_dirs_block
    file_scan:
      - number_of_methods
      - source_lines_of_code
      - dependency_graph
      - louvain_modularity
      - fan_in_out
      - tfidf
    export:
      - directory: $RESOLVED_EXPORT_DIR
      - json
      - d3
YAML
  
  echo "Generated emerge config: $EMERGE_CONFIG"
  
  # 6f. Run emerge
  echo "Running emerge analysis..."
  $EMERGE_CMD -c "$EMERGE_CONFIG" -v 2>&1 || true
  
  if [ ! -f "$EXPORT_DIR/emerge-file_result_dependency_graph-data.json" ]; then
    echo "ERROR: emerge did not produce expected output for $name — skipping"
    continue
  fi
  echo "Emerge analysis complete"
  
  # 6g. Copy raw output to staging
  mkdir -p "$RAW_DIR/$name"
  
  cp "$EXPORT_DIR/emerge-file_result_dependency_graph-data.json" \
     "$RAW_DIR/$name/dependency-graph.json"
  
  cp "$EXPORT_DIR/emerge-statistics-and-metrics.json" \
     "$RAW_DIR/$name/metrics.json"
  
  # Filesystem graph (may not always be generated)
  cp "$EXPORT_DIR/emerge-filesystem_graph-data.json" \
     "$RAW_DIR/$name/filesystem-graph.json" 2>/dev/null || true
  
  # D3 data file (contains cluster metrics not in standalone JSONs)
  cp "$EXPORT_DIR/html/resources/js/emerge_data.js" \
     "$RAW_DIR/$name/emerge-data.js" 2>/dev/null || true
     
  # 6h. Transform raw output to visualizer format
  echo "Running transform..."
  if npx tsx "$SCRIPT_DIR/transform.ts" \
    --input "$RAW_DIR/$name" \
    --output "$OUTPUT_DIR/$name.json"; then
    echo "Transform complete: $OUTPUT_DIR/$name.json"
  else
    echo "WARNING: Transform failed for $name — raw output preserved in $RAW_DIR/$name/"
  fi
  
  # 6i. Success message
  echo "✅ $name — analysis complete"
done

# Section 7: Cleanup
rm -rf "$WORKSPACE"

# Section 8: Final summary
echo ""
echo "========================================="
echo "  Pipeline complete"
echo "========================================="
echo ""
echo "Generated visualizer data:"
for json_file in "$OUTPUT_DIR"/*.json; do
  if [ -f "$json_file" ]; then
    project_name=$(basename "$json_file" .json)
    node_count=$(jq '.meta.totalFiles' "$json_file" 2>/dev/null || echo "?")
    edge_count=$(jq '.meta.totalEdges' "$json_file" 2>/dev/null || echo "?")
    sloc=$(jq '.meta.totalSloc' "$json_file" 2>/dev/null || echo "?")
    echo "  • $project_name: $node_count files, $edge_count dependencies, $sloc SLOC"
  fi
done
