// --- Input types (raw emerge format) ---

export interface EmergeNode {
  id: string;
  display_name: string;
  absolute_name?: string;
  'metric_number-of-methods-in-file'?: number;
  'metric_sloc-in-file'?: number;
  'metric_fan-in-dependency-graph'?: number;
  'metric_fan-out-dependency-graph'?: number;
  'metric_file_result_dependency_graph_louvain-modularity-in-file'?: number;
  [key: string]: unknown; // TF-IDF tags and other fields
}

export interface EmergeEdge {
  source: string;
  target: string;
}

export interface EmergeDependencyGraph {
  directed: boolean;
  multigraph: boolean;
  graph: object;
  nodes: EmergeNode[];
  edges: EmergeEdge[];
}

export interface EmergeFilesystemNode {
  id: string;
  display_name: string;
  directory?: boolean;
  file?: boolean;
  result_name?: string;
  [key: string]: unknown;
}

export interface EmergeFilesystemGraph {
  directed: boolean;
  nodes: EmergeFilesystemNode[];
  edges: EmergeEdge[];
}

// --- Output types (visualizer format) ---

export interface VizNode {
  id: string;
  displayName: string;
  path: string;
  directory: string;
  extension: string;
  metrics: {
    sloc: number;
    methods: number;
    fanIn: number;
    fanOut: number;
  };
  normalized: {
    size: number;
    heat: number;
  };
  cluster: {
    id: number;
    label: string;
  };
  tags: string[];
}

export interface VizEdge {
  source: string;
  target: string;
}

export interface VizCluster {
  id: number;
  label: string;
  nodeCount: number;
  sloc: number;
  slocPercent: number;
  avgFanIn: number;
  avgFanOut: number;
  avgMethods: number;
}

export interface VizFilesystemTreeNode {
  id: string;
  displayName: string;
  children: (VizFilesystemTreeNode | string)[];
}

export interface VizOutput {
  meta: {
    name: string;
    analyzedAt: string;
    emergeVersion: string;
    totalFiles: number;
    totalDirectories: number;
    totalSloc: number;
    totalEdges: number;
  };
  nodes: VizNode[];
  edges: {
    dependencies: VizEdge[];
    filesystem: VizEdge[];
  };
  clusters: VizCluster[];
  filesystem: {
    tree: VizFilesystemTreeNode[];
  };
  stats: {
    maxFanIn: { value: number; file: string };
    maxFanOut: { value: number; file: string };
    avgSloc: number;
    avgFanIn: number;
    avgFanOut: number;
    avgMethods: number;
    louvainCommunities: number;
    louvainModularity: number;
  };
}
