'use client';

import { useEffect, useState } from 'react';
import { useProjectGraph } from '@/hooks/useProjectGraph';
import type { VizOutput, VizNode } from '@/lib/types/emerge';
import type { ProjectData } from '@/lib/types/github';
import { getClusterColor } from '@/lib/projectGraphUtils';

interface ProjectGraphProps {
  project: ProjectData;
}

export function ProjectGraph({ project }: ProjectGraphProps) {
  const [data, setData] = useState<VizOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const [layers, setLayers] = useState({
    dependencies: true,
    filesystem: false,
    clusters: true,
    heatmap: false,
  });

  const { 
    containerRef, 
    hoveredNode, 
    hoveredNodePosition, 
    selectedNodes, 
    selectedNodePositions,
    triggerResize
  } = useProjectGraph(data, isTransitioning, layers);

  useEffect(() => {
    setIsTransitioning(true);
  }, [isLegendOpen]);

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Mutex: clusters and heatmap can't both be on
      if (key === 'heatmap' && next.heatmap) {
        next.clusters = false;
      }
      if (key === 'clusters' && next.clusters) {
        next.heatmap = false;
      }
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);

    fetch(`/data/projects/${project.repoName}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load graph data: ${r.status}`);
        return r.json();
      })
      .then((json: VizOutput) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [project.repoName]);

  // Decide which tooltip mode for persistent tooltips
  const compactMode = selectedNodes.length >= 2;

  // Don't render hover tooltip if the hovered node is already selected (it has a persistent one)
  const isHoveredSelected = hoveredNode ? selectedNodes.some(n => n.id === hoveredNode.id) : false;

  const legendContent = (
    <>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-mono text-sm font-semibold text-[#4A90D9]">
          Graph Legend
        </h3>
        <button
          onClick={() => setIsLegendOpen(false)}
          className="flex h-10 w-10 items-center justify-center text-[#6a6a80] hover:text-[#e0e0e8] text-xl"
          aria-label="Close legend"
        >
          ✕
        </button>
      </div>

      {/* Nodes section */}
      <section className="mb-5">
        <h4 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[#4A90D9]/80">
          Nodes
        </h4>
        <div className="space-y-2 text-[11px] leading-relaxed text-[#c0c0d0]">
          <p>
            Each node is a source file in the project.
          </p>
          <p>
            <span className="text-[#e0e0e8]">Color</span> groups files into clusters. Clusters are ranked by size — the largest cluster always gets the first color.
          </p>
          <p>
            <span className="text-[#e0e0e8]">Size</span> is proportional to SLOC (lines of code), on a logarithmic scale. Larger spheres mean longer files.
          </p>
          <p>
            <span className="text-[#e0e0e8]">Position</span> is computed by a force-directed layout: connected files attract, unrelated files repel.
          </p>
        </div>
      </section>

      {/* Layers section */}
      <section className="mb-5">
        <h4 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[#4A90D9]/80">
          View Layers
        </h4>
        <div className="space-y-2 text-[11px] leading-relaxed text-[#c0c0d0]">
          <LayerToggle
            label="Dependencies"
            description="Import relationships between files"
            checked={layers.dependencies}
            onToggle={() => toggleLayer('dependencies')}
          />
          <LayerToggle
            label="Filesystem"
            description="Directory containment as edges"
            checked={layers.filesystem}
            onToggle={() => toggleLayer('filesystem')}
          />
          <LayerToggle
            label="Clusters"
            description="Color nodes by Louvain community"
            checked={layers.clusters}
            onToggle={() => toggleLayer('clusters')}
          />
          <LayerToggle
            label="Heatmap"
            description="Color nodes by SLOC and fan-out"
            checked={layers.heatmap}
            onToggle={() => toggleLayer('heatmap')}
          />
        </div>
      </section>

      {/* Clusters section */}
      {data && data.clusters.length > 0 && (
        <section className="mb-5">
          <h4 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[#4A90D9]/80">
            Clusters
          </h4>
          <div className="space-y-1.5 text-[11px] leading-relaxed text-[#c0c0d0]">
            {data.clusters.map((cluster) => (
              <div key={cluster.id} className="flex items-center gap-2">
                <span 
                  className="h-2.5 w-2.5 shrink-0 rounded-full" 
                  style={{ 
                    backgroundColor: getClusterColor(cluster.id),
                    boxShadow: `0 0 6px ${getClusterColor(cluster.id)}`
                  }}
                />
                <span className="text-[#e0e0e8]">{cluster.label}</span>
                <span className="text-[#6a6a80]">
                  {cluster.nodeCount} {cluster.nodeCount === 1 ? 'file' : 'files'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Edges section */}
      <section className="mb-5">
        <h4 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[#4A90D9]/80">
          Connections
        </h4>
        <div className="space-y-2 text-[11px] leading-relaxed text-[#c0c0d0]">
          <p>
            Lines between nodes represent real import dependencies parsed from the source code.
          </p>
          <p>
            A line from A to B means that file A imports file B.
          </p>
        </div>
      </section>

      {/* Highlighting states section */}
      <section className="mb-5">
        <h4 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[#4A90D9]/80">
          Highlighting
        </h4>
        <div className="space-y-2.5 text-[11px] leading-relaxed text-[#c0c0d0]">
          <div className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#4A90D9] shadow-[0_0_8px_#4A90D9]" />
            <span><span className="text-[#e0e0e8]">Bright</span> — node under the mouse or selected by click</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#4A90D9]/60" />
            <span><span className="text-[#e0e0e8]">Medium</span> — direct neighbors of the focused node (files it imports or is imported by)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#4A90D9]/20" />
            <span><span className="text-[#e0e0e8]">Dimmed</span> — unrelated to the focused node</span>
          </div>
        </div>
      </section>

      {/* Interactions section */}
      <section>
        <h4 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[#4A90D9]/80">
          Interactions
        </h4>
        <div className="space-y-1.5 text-[11px] leading-relaxed text-[#c0c0d0]">
          <div><span className="text-[#e0e0e8]">Hover</span> — temporary tooltip with file metadata</div>
          <div><span className="text-[#e0e0e8]">Click node</span> — pins the tooltip (persistent)</div>
          <div><span className="text-[#e0e0e8]">Click multiple</span> — multi-select, compact labels</div>
          <div><span className="text-[#e0e0e8]">Click empty space</span> — clears selection</div>
          <div><span className="text-[#e0e0e8]">Drag</span> — orbit the camera</div>
          <div><span className="text-[#e0e0e8]">Scroll</span> — zoom in and out</div>
        </div>
      </section>
    </>
  );

  return (
    <div className="relative w-full max-w-full h-[60vh] md:h-150 rounded-xl overflow-hidden bg-[#0a0a0f] shadow-[0_0_40px_rgba(74,144,217,0.15)] flex min-w-0">
      {/* Canvas area — grows to fill remaining space */}
      <div className="relative flex-1 min-w-0">
        <div ref={containerRef} className="w-full h-full" />

        {!data && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-[#4A90D9]/40 font-mono text-sm">
            Loading graph...
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-[#f57a7a]/60 font-mono text-sm">
            {error}
          </div>
        )}
        
        {/* Hover tooltip (only when hovering a non-selected node) */}
        {hoveredNode && hoveredNodePosition && !isHoveredSelected && (
          <NodeTooltipFull 
            node={hoveredNode} 
            x={hoveredNodePosition.x} 
            y={hoveredNodePosition.y}
            followsCursor
          />
        )}
        
        {/* Persistent tooltips for selected nodes */}
        {selectedNodes.map((node) => {
          const pos = selectedNodePositions.get(node.id);
          if (!pos) return null;
          
          if (compactMode) {
            return <NodeTooltipCompact key={node.id} node={node} x={pos.x} y={pos.y} />;
          }
          return <NodeTooltipFull key={node.id} node={node} x={pos.x} y={pos.y} />;
        })}

        {!isLegendOpen && (
          <button
            onClick={() => setIsLegendOpen(true)}
            className="absolute top-4 right-4 z-20 flex h-11 w-11 md:h-9 md:w-9 items-center justify-center rounded-full border border-[#4A90D9]/30 bg-[rgba(10,10,15,0.8)] text-[#4A90D9] backdrop-blur-sm transition-all hover:border-[#4A90D9]/60 hover:shadow-[0_0_15px_rgba(74,144,217,0.3)]"
            aria-label="Show graph legend"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>
        )}
      </div>

      {/* Legend panel — desktop (md and up): side panel */}
      <div 
        className={`hidden md:block h-full overflow-hidden transition-[width] duration-300 ease-out shrink-0 ${
          isLegendOpen ? 'w-80' : 'w-0'
        }`}
        onTransitionEnd={(e) => {
          if (e.propertyName === 'width' && e.target === e.currentTarget) {
            setIsTransitioning(false);
            triggerResize();
          }
        }}
      >
        <div className="legend-scroll h-full w-80 overflow-y-auto border-l border-[#4A90D9]/20 bg-[rgba(10,10,15,0.95)] p-5 backdrop-blur-sm">
          {legendContent}
        </div>
      </div>

      {/* Legend panel — mobile (below md): fullscreen modal */}
      {isLegendOpen && (
        <div className="md:hidden absolute inset-0 z-30 bg-[rgba(10,10,15,0.98)] backdrop-blur-sm">
          <div className="legend-scroll h-full w-full overflow-y-auto p-5">
            {legendContent}
          </div>
        </div>
      )}
    </div>
  );
}

interface NodeTooltipProps {
  node: VizNode;
  x: number;
  y: number;
  followsCursor?: boolean;
}

function NodeTooltipFull({ node, x, y, followsCursor }: NodeTooltipProps) {
  // Hover tooltips offset below-right of cursor; persistent ones center on node
  const offsetX = followsCursor ? 16 : 12;
  const offsetY = followsCursor ? 16 : -8;
  
  return (
    <div
      className="absolute pointer-events-none z-10 min-w-50 max-w-70 rounded-lg border border-[#4A90D9]/30 bg-[rgba(10,10,15,0.95)] px-3 py-2 font-mono text-xs text-[#e0e0e8] backdrop-blur-sm shadow-[0_0_20px_rgba(74,144,217,0.2)]"
      style={{
        left: `${x + offsetX}px`,
        top: `${y + offsetY}px`,
      }}
    >
      <div className="font-semibold text-[#4A90D9] truncate">{node.displayName}</div>
      <div className="text-[#6a6a80] truncate mt-0.5">{node.directory || 'root'}</div>
      
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
        <div><span className="text-[#6a6a80]">cluster</span> <span className="text-[#e0e0e8]">{node.cluster.label}</span></div>
        <div><span className="text-[#6a6a80]">sloc</span> <span className="text-[#e0e0e8]">{node.metrics.sloc}</span></div>
        <div><span className="text-[#6a6a80]">fan-in</span> <span className="text-[#e0e0e8]">{node.metrics.fanIn}</span></div>
        <div><span className="text-[#6a6a80]">fan-out</span> <span className="text-[#e0e0e8]">{node.metrics.fanOut}</span></div>
      </div>
      
      {node.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {node.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded bg-[#4A90D9]/10 px-1.5 py-0.5 text-[9px] text-[#4A90D9]">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function NodeTooltipCompact({ node, x, y }: NodeTooltipProps) {
  return (
    <div
      className="absolute pointer-events-none z-10 rounded border border-[#4A90D9]/30 bg-[rgba(10,10,15,0.92)] px-2 py-0.5 font-mono text-[10px] text-[#4A90D9] backdrop-blur-sm whitespace-nowrap"
      style={{
        left: `${x + 10}px`,
        top: `${y - 6}px`,
      }}
    >
      {node.displayName}
    </div>
  );
}

interface LayerToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}

function LayerToggle({ label, description, checked, onToggle }: LayerToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-start gap-3 rounded p-1 text-left hover:bg-[#4A90D9]/5"
    >
      {/* Custom switch */}
      <div 
        className={`relative mt-0.5 h-4 w-7 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-[#4A90D9]' : 'bg-[#2a2a40]'
        }`}
      >
        <div 
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-3.5' : 'translate-x-0.5'
          }`}
        />
      </div>
      
      {/* Label and description */}
      <div className="flex-1">
        <div className={`font-medium ${checked ? 'text-[#e0e0e8]' : 'text-[#8a8a9a]'}`}>
          {label}
        </div>
        <div className="text-[#6a6a80] text-[10px]">
          {description}
        </div>
      </div>
    </button>
  );
}
