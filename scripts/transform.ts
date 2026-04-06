import fs from 'fs';
import path from 'path';

import {
  EmergeNode,
  EmergeDependencyGraph,
  EmergeFilesystemGraph,
  VizNode,
  VizEdge,
  VizCluster,
  VizFilesystemTreeNode,
  VizOutput
} from '../src/lib/types/emerge';

// 1. Parse CLI arguments
const args = process.argv.slice(2);
let inputDir = '';
let outputFile = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--input' && i + 1 < args.length) inputDir = args[++i];
  if (args[i] === '--output' && i + 1 < args.length) outputFile = args[++i];
}

if (!inputDir || !outputFile) {
  console.error('Usage: npx tsx scripts/transform.ts --input <dir> --output <file>');
  process.exit(1);
}

if (!fs.existsSync(inputDir)) {
  console.error(`ERROR: Input directory not found: ${inputDir}`);
  process.exit(1);
}

// 2. Read input files
const depGraphPath = path.join(inputDir, 'dependency-graph.json');
const fsGraphPath = path.join(inputDir, 'filesystem-graph.json');
const metricsPath = path.join(inputDir, 'metrics.json');
const emergeDataPath = path.join(inputDir, 'emerge-data.js');

if (!fs.existsSync(depGraphPath) || !fs.existsSync(metricsPath)) {
  console.error('ERROR: Missing required files in input directory');
  process.exit(1);
}

const depGraph: EmergeDependencyGraph = JSON.parse(fs.readFileSync(depGraphPath, 'utf-8'));
const _fsGraphRaw = fs.existsSync(fsGraphPath) ? fs.readFileSync(fsGraphPath, 'utf-8') : null;
const fsGraph: EmergeFilesystemGraph | null = _fsGraphRaw ? JSON.parse(_fsGraphRaw) : null;
const metricsData = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
const emergeDataText = fs.existsSync(emergeDataPath) ? fs.readFileSync(emergeDataPath, 'utf-8') : '';

// 3. Detect workspace prefix
function normalizePath(p: string): string {
  return p.replace(/\\\\/g, '/').replace(/\\/g, '/');
}

function detectPrefix(nodes: EmergeNode[]): string {
  const realNodes = nodes.filter(n => n.absolute_name);
  if (realNodes.length === 0) return '';
  
  const paths = realNodes.map(n => normalizePath(n.absolute_name!));
  let prefix = paths[0];
  
  for (const p of paths.slice(1)) {
    while (!p.startsWith(prefix) && prefix.length > 0) {
      // Remove trailing slash before searching for the previous one
      const trimmed = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
      const lastSlash = trimmed.lastIndexOf('/');
      if (lastSlash <= 0) { prefix = ''; break; }
      prefix = trimmed.substring(0, lastSlash + 1);
    }
  }
  
  return prefix;
}

const workspacePrefix = detectPrefix(depGraph.nodes);

// 4. Normalize paths utility
function stripPrefix(id: string, prefix: string): string {
  const normalized = normalizePath(id);
  if (normalized.startsWith(prefix)) {
    return normalized.substring(prefix.length);
  }
  return normalized;
}

// 5 & 6. Classify nodes and Build alias resolution map
const realNodes = depGraph.nodes.filter(n => n.absolute_name && n['metric_sloc-in-file'] !== undefined);
const realNodePaths = new Map<string, string>(); // stripped path no prefix -> original ID

for (const n of realNodes) {
  realNodePaths.set(stripPrefix(n.absolute_name!, workspacePrefix), n.id);
}

function resolveGhosts(
  nodes: EmergeNode[], 
  realNodePaths: Map<string, string>,
  prefix: string
): Map<string, string> {
  const resolution = new Map<string, string>();
  
  for (const node of nodes) {
    if (node.absolute_name) continue; // skip real nodes
    
    const id = node.id;
    let candidate = '';
    
    // Try alias resolution: @/components/X → components/X
    if (id.startsWith('@/')) {
      candidate = id.substring(2);
    } else {
      // Try path resolution: normalize and strip prefix
      const normalized = normalizePath(id);
      candidate = stripPrefix(normalized, prefix);
    }
    
    const candidateNoExt = candidate.replace(/\.(tsx?|jsx?)$/, '');
    
    // Try to match against real node paths
    for (const [realPath, realId] of realNodePaths.entries()) {
      const realNoExt = realPath.replace(/\.(tsx?|jsx?)$/, '');
      if (realNoExt === candidateNoExt) {
        resolution.set(id, realId);
        break;
      }
    }
  }
  
  return resolution;
}

const ghostResolution = resolveGhosts(depGraph.nodes, realNodePaths, workspacePrefix);

// 7. Build clean nodes
const cleanNodesMap = new Map<string, VizNode>();

for (const node of realNodes) {
  const cleanPath = stripPrefix(node.absolute_name!, workspacePrefix);
  const parts = cleanPath.split('/');
  const fileName = parts[parts.length - 1];
  const directory = parts.slice(0, -1).join('/');
  const extension = '.' + (fileName.split('.').pop() || '');

  const tags = Object.entries(node)
    .filter(([key]) => key.startsWith('metric_tag_'))
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([key]) => key.replace('metric_tag_', ''));

  cleanNodesMap.set(node.id, {
    id: cleanPath, 
    displayName: fileName,
    path: cleanPath,
    directory,
    extension,
    metrics: {
      sloc: node['metric_sloc-in-file'] || 0,
      methods: node['metric_number-of-methods-in-file'] || 0,
      fanIn: node['metric_fan-in-dependency-graph'] || 0,
      fanOut: node['metric_fan-out-dependency-graph'] || 0,
    },
    normalized: { size: 0, heat: 0 },
    cluster: {
      id: node['metric_file_result_dependency_graph_louvain-modularity-in-file'] || 0,
      label: '' 
    },
    tags
  });
}

const cleanNodes = Array.from(cleanNodesMap.values());

// 8. Normalize metrics
const slocValues = cleanNodes.map(n => n.metrics.sloc);
const logValues = slocValues.map(s => Math.log10(Math.max(s, 1)));
const logMin = logValues.length > 0 ? Math.min(...logValues) : 0;
const logMax = logValues.length > 0 ? Math.max(...logValues) : 0;
const logRange = logMax - logMin || 1;

const maxSloc = Math.max(...slocValues, 1);
const maxFanOut = Math.max(...cleanNodes.map(n => n.metrics.fanOut), 1);

for (const node of cleanNodes) {
  node.normalized.size = (Math.log10(Math.max(node.metrics.sloc, 1)) - logMin) / logRange;
  node.normalized.heat = (node.metrics.sloc / maxSloc) * 0.6 + (node.metrics.fanOut / maxFanOut) * 0.4;
}

// 9. Build clean edges
const cleanNodePathsSet = new Set(cleanNodes.map(n => n.id));
const cleanEdges: VizEdge[] = [];
const edgeSet = new Set<string>();

for (const edge of depGraph.edges) {
  const sourceOrigId = ghostResolution.get(edge.source) || edge.source;
  const targetOrigId = ghostResolution.get(edge.target) || edge.target;
  
  const sourceNode = cleanNodesMap.get(sourceOrigId);
  const targetNode = cleanNodesMap.get(targetOrigId);
  
  if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) continue;
  
  const key = `${sourceNode.id}→${targetNode.id}`;
  if (edgeSet.has(key)) continue;
  edgeSet.add(key);
  
  cleanEdges.push({ source: sourceNode.id, target: targetNode.id });
}

// Recalculate fanIn/fanOut from clean edges (emerge puts fanIn on ghost nodes)
const fanInCounts = new Map<string, number>();
const fanOutCounts = new Map<string, number>();
for (const edge of cleanEdges) {
  fanInCounts.set(edge.target, (fanInCounts.get(edge.target) ?? 0) + 1);
  fanOutCounts.set(edge.source, (fanOutCounts.get(edge.source) ?? 0) + 1);
}
for (const node of cleanNodes) {
  node.metrics.fanIn = fanInCounts.get(node.id) ?? 0;
  node.metrics.fanOut = fanOutCounts.get(node.id) ?? 0;
}
const recalcMaxFanOut = Math.max(...cleanNodes.map(n => n.metrics.fanOut), 1);
const recalcMaxSloc = Math.max(...cleanNodes.map(n => n.metrics.sloc), 1);
for (const node of cleanNodes) {
  node.normalized.heat = (node.metrics.sloc / recalcMaxSloc) * 0.6 + (node.metrics.fanOut / recalcMaxFanOut) * 0.4;
}

// 10. Build filesystem edges from clean node paths (ignore emerge's broken filesystem graph)
const fsEdges: VizEdge[] = [];
const fsEdgeSet = new Set<string>();

// Build edges from each file to its parent directory, and directory chains
const allDirs = new Set<string>();
for (const node of cleanNodes) {
  if (node.directory) allDirs.add(node.directory);
  // Add parent directories up the chain
  const parts = node.directory.split('/');
  for (let i = 1; i <= parts.length; i++) {
    allDirs.add(parts.slice(0, i).join('/'));
  }
}

// Directory → file edges
for (const node of cleanNodes) {
  if (!node.directory) continue;
  const key = `${node.directory}→${node.id}`;
  if (!fsEdgeSet.has(key)) {
    fsEdgeSet.add(key);
    fsEdges.push({ source: node.directory, target: node.id });
  }
}

// Directory → subdirectory edges
for (const dir of allDirs) {
  const parts = dir.split('/');
  if (parts.length > 1) {
    const parent = parts.slice(0, -1).join('/');
    if (allDirs.has(parent)) {
      const key = `${parent}→${dir}`;
      if (!fsEdgeSet.has(key)) {
        fsEdgeSet.add(key);
        fsEdges.push({ source: parent, target: dir });
      }
    }
  }
}

// 11. Build filesystem tree
function buildFilesystemTree(nodes: VizNode[]): VizFilesystemTreeNode[] {
  const rootDirs: VizFilesystemTreeNode[] = [];
  const dirMap = new Map<string, VizFilesystemTreeNode>();

  for (const node of nodes) {
    const dir = node.directory;
    if (!dir) continue;
    
    const parts = dir.split('/');
    let currentPath = '';
    
    for (const seg of parts) {
        const prevPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${seg}` : seg;
        
        if (!dirMap.has(currentPath)) {
            const newNode: VizFilesystemTreeNode = { id: currentPath, displayName: seg, children: [] };
            dirMap.set(currentPath, newNode);
            
            if (prevPath && dirMap.has(prevPath)) {
                dirMap.get(prevPath)!.children.push(newNode);
            } else {
                rootDirs.push(newNode);
            }
        }
    }
  }

  for (const node of nodes) {
      if (!node.directory) {
          rootDirs.push(node.id as any);
      } else {
          dirMap.get(node.directory)!.children.push(node.id);
      }
  }

  return rootDirs;
}

const fsTreeOutput = buildFilesystemTree(cleanNodes);

// 12. Extract cluster metrics & 13. Generate cluster labels
function generateClusterLabel(clusterNodes: VizNode[]): string {
  if (clusterNodes.length === 0) return 'unknown';
  const dirCounts = new Map<string, number>();
  for (const node of clusterNodes) {
    if (!node.directory) continue;
    const parts = node.directory.split('/');
    const label = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    dirCounts.set(label, (dirCounts.get(label) ?? 0) + 1);
  }
  if (dirCounts.size === 0) return 'root';
  
  let maxCount = 0;
  let maxLabel = 'other';
  for (const [label, count] of dirCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      maxLabel = label;
    }
  }
  return maxLabel;
}

let parsedClusterMetrics: Record<string, any> = {};
if (emergeDataText) {
  const marker = 'file_result_dependency_graph_cluster_metrics_map = ';
  const startIdx = emergeDataText.indexOf(marker);
  if (startIdx !== -1) {
    const jsonStart = startIdx + marker.length;
    // Find matching closing brace
    let depth = 0;
    let endIdx = jsonStart;
    for (let i = jsonStart; i < emergeDataText.length; i++) {
        if (emergeDataText[i] === '{') depth++;
        if (emergeDataText[i] === '}') depth--;
        if (depth === 0 && emergeDataText[i] === '}') { endIdx = i + 1; break; }
    }
    try {
        parsedClusterMetrics = JSON.parse(emergeDataText.substring(jsonStart, endIdx));
    } catch (e) { /* ignore parse errors */ }
  }
}

const clusterMap = new Map<number, VizCluster>();

for (const node of cleanNodes) {
    const cId = node.cluster.id;
    if (!clusterMap.has(cId)) {
        clusterMap.set(cId, {
            id: cId,
            label: '',
            nodeCount: 0,
            sloc: 0,
            slocPercent: 0,
            avgFanIn: 0,
            avgFanOut: 0,
            avgMethods: 0
        });
    }
    clusterMap.get(cId)!.nodeCount++;
}

for (const [cId, c] of clusterMap.entries()) {
    const clusterNodes = cleanNodes.filter(n => n.cluster.id === cId);
    c.label = generateClusterLabel(clusterNodes);
    for (const node of clusterNodes) {
        node.cluster.label = c.label;
    }

    const m = parsedClusterMetrics[cId.toString()];
    if (m) {
        c.sloc = parseInt(m.sloc_in_cluster) || 0;
        c.slocPercent = parseFloat(m['% of total sloc']) || 0;
        c.avgFanIn = parseFloat(m.avg_cluster_fan_in) || 0;
        c.avgFanOut = parseFloat(m.avg_cluster_fan_out) || 0;
        c.avgMethods = parseFloat(m.avg_cluster_methods) || 0;
    } else {
        c.sloc = clusterNodes.reduce((s, n) => s + n.metrics.sloc, 0);
        c.avgFanIn = clusterNodes.reduce((s, n) => s + n.metrics.fanIn, 0) / (c.nodeCount || 1);
        c.avgFanOut = clusterNodes.reduce((s, n) => s + n.metrics.fanOut, 0) / (c.nodeCount || 1);
        c.avgMethods = clusterNodes.reduce((s, n) => s + n.metrics.methods, 0) / (c.nodeCount || 1);
        c.slocPercent = c.sloc > 0 ? (c.sloc / Math.max(1, cleanNodes.reduce((s, n) => s + n.metrics.sloc, 0))) * 100 : 0;
    }
}

// 14. Build stats
const ov = metricsData['overall-metrics'] || {};
let maxFanInFileOrig = ov['max-fan-in-name-dependency-graph'] || '';
let maxFanOutFileOrig = ov['max-fan-out-name-dependency-graph'] || '';
maxFanInFileOrig = stripPrefix(normalizePath(maxFanInFileOrig), workspacePrefix);
maxFanOutFileOrig = stripPrefix(normalizePath(maxFanOutFileOrig), workspacePrefix);

const stats = {
    maxFanIn: {
        value: ov['max-fan-in-dependency-graph'] || 0,
        file: maxFanInFileOrig
    },
    maxFanOut: {
        value: ov['max-fan-out-dependency-graph'] || 0,
        file: maxFanOutFileOrig
    },
    avgSloc: ov['avg-sloc-in-file'] || 0,
    avgFanIn: ov['avg-fan-in-dependency-graph'] || 0,
    avgFanOut: ov['avg-fan-out-dependency-graph'] || 0,
    avgMethods: ov['avg-number-of-methods-in-file'] || 0,
    louvainCommunities: ov['louvain-communities-dependency-graph'] || clusterMap.size,
    louvainModularity: ov['louvain-modularity-dependency-graph'] || 0
};

// 15. Build meta
const projectName = path.basename(inputDir);
const meta = {
  name: projectName,
  analyzedAt: new Date().toISOString(),
  emergeVersion: '2.0.7',
  totalFiles: cleanNodes.length,
  totalDirectories: new Set(cleanNodes.map(n => n.directory).filter(Boolean)).size,
  totalSloc: cleanNodes.reduce((sum, n) => sum + n.metrics.sloc, 0),
  totalEdges: cleanEdges.length,
};

// 16. Assemble and write output
const vizOutput: VizOutput = {
    meta,
    nodes: cleanNodes,
    edges: {
        dependencies: cleanEdges,
        filesystem: fsEdges 
    },
    clusters: Array.from(clusterMap.values()),
    filesystem: {
        tree: fsTreeOutput
    },
    stats
};

const outputDirParsed = path.dirname(outputFile);
if (!fs.existsSync(outputDirParsed)) {
  fs.mkdirSync(outputDirParsed, { recursive: true });
}
fs.writeFileSync(outputFile, JSON.stringify(vizOutput, null, 2));

console.log(`Transform complete: ${meta.name}`);
console.log(`  Files: ${meta.totalFiles}`);
console.log(`  Dependencies: ${meta.totalEdges}`);
console.log(`  Clusters: ${clusterMap.size}`);
console.log(`  Total SLOC: ${meta.totalSloc}`);
console.log(`  Output: ${outputFile}`);
