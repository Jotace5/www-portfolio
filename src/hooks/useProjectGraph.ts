import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { VizOutput, VizNode } from '@/lib/types/emerge';
import { 
  SCENE_CONFIG, CAMERA_CONFIG, getClusterColor, 
  computeNodeRadius, NODE_CONFIG, EDGE_CONFIG 
} from '@/lib/projectGraphUtils';

export interface UseProjectGraphResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  hoveredNode: VizNode | null;
  hoveredNodePosition: { x: number; y: number } | null;
  selectedNodes: VizNode[];
  selectedNodePositions: Map<string, { x: number; y: number }>;
  triggerResize: () => void;
}

export interface LayerState {
  dependencies: boolean;
  filesystem: boolean;
  clusters: boolean;
  heatmap: boolean;
}

function computeHeatmapColor(heat: number): string {
  const t = Math.max(0, Math.min(1, heat));
  
  const stops = [
    { t: 0.0,  r: 0x1a, g: 0x3a, b: 0x8a },
    { t: 0.25, r: 0x2a, g: 0x8a, b: 0xcc },
    { t: 0.5,  r: 0x2a, g: 0xcc, b: 0x4a },
    { t: 0.75, r: 0xcc, g: 0xaa, b: 0x2a },
    { t: 1.0,  r: 0xcc, g: 0x3a, b: 0x2a },
  ];
  
  let lower = stops[0];
  let upper = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }
  
  const span = upper.t - lower.t;
  const localT = span > 0 ? (t - lower.t) / span : 0;
  
  const r = Math.round(lower.r + (upper.r - lower.r) * localT);
  const g = Math.round(lower.g + (upper.g - lower.g) * localT);
  const b = Math.round(lower.b + (upper.b - lower.b) * localT);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function useProjectGraph(
  data: VizOutput | null,
  isTransitioning: boolean,
  layers: LayerState
): UseProjectGraphResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const isTransitioningRef = useRef(false);
  const triggerResizeRef = useRef<() => void>(() => {});
  const layersRef = useRef<LayerState>(layers);
  const applyLayerVisualsRef = useRef<(() => void) | null>(null);
  const updateHoverVisualsRef = useRef<((id: string | null) => void) | null>(null);

  useEffect(() => {
    isTransitioningRef.current = isTransitioning;
  }, [isTransitioning]);

  const [hoveredNode, setHoveredNode] = useState<VizNode | null>(null);
  const [hoveredNodePosition, setHoveredNodePosition] = useState<{x: number; y: number} | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<VizNode[]>([]);
  const [selectedNodePositions, setSelectedNodePositions] = useState<Map<string, {x: number; y: number}>>(new Map());

  // mutable camera controls
  const controlsRef = useRef({
    theta: CAMERA_CONFIG.initialTheta as number,
    phi: CAMERA_CONFIG.initialPhi as number,
    radius: CAMERA_CONFIG.initialRadius as number,
    isDragging: false,
    lastPointer: { x: 0, y: 0 }
  });

  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseNdcRef = useRef(new THREE.Vector2(-9999, -9999));
  const hoveredNodeIdRef = useRef<string | null>(null);
  
  const isMouseInsideRef = useRef(false);
  const selectedNodeIdsRef = useRef<Set<string>>(new Set());
  const selectedNodePositionsRef = useRef(new Map<string, {x: number; y: number}>());

  const nodeMeshMapRef = useRef(new Map<string, { core: THREE.Mesh; halo: THREE.Mesh; group: THREE.Group }>());
  const hitboxMeshMapRef = useRef(new Map<string, THREE.Mesh>());
  const edgeLinesMapRef = useRef(new Map<string, THREE.Line>());
  
  const pointerDownPosRef = useRef<{x: number; y: number} | null>(null);
  const pinchStateRef = useRef<{
    initialDistance: number;
    initialRadius: number;
  } | null>(null);
  const gestureTypeRef = useRef<'undecided' | 'drag' | 'scroll'>('undecided');

  useEffect(() => {
    layersRef.current = layers;
    applyLayerVisualsRef.current?.();
    updateHoverVisualsRef.current?.(hoveredNodeIdRef.current);
  }, [layers]);

  useEffect(() => {
    if (!data || !containerRef.current) {
      selectedNodeIdsRef.current = new Set();
      setSelectedNodes([]);
      setSelectedNodePositions(new Map());
      return;
    }

    selectedNodeIdsRef.current = new Set();
    setSelectedNodes([]);
    setSelectedNodePositions(new Map());

    const container = containerRef.current;
    
    // 1. Mount setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(SCENE_CONFIG.background);
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(
      CAMERA_CONFIG.fov,
      container.clientWidth / container.clientHeight,
      CAMERA_CONFIG.near,
      CAMERA_CONFIG.far
    );
    camera.position.set(0, 0, CAMERA_CONFIG.initialRadius);

    const scene = new THREE.Scene();

    // 2. Background particles
    const bgGeo = new THREE.BufferGeometry();
    const bgPCount = SCENE_CONFIG.bgParticleCount;
    const bgRange = SCENE_CONFIG.bgParticleRange;
    const bgPositions = new Float32Array(bgPCount * 3);
    for (let i = 0; i < bgPCount * 3; i++) {
      bgPositions[i] = (Math.random() - 0.5) * bgRange * 2;
    }
    bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
    const bgMat = new THREE.PointsMaterial({
      color: SCENE_CONFIG.bgParticleColor,
      size: SCENE_CONFIG.bgParticleSize,
      transparent: true,
      opacity: SCENE_CONFIG.bgParticleOpacity
    });
    const bgMesh = new THREE.Points(bgGeo, bgMat);
    scene.add(bgMesh);

    // 3. Lights
    const ambientLight = new THREE.AmbientLight(SCENE_CONFIG.ambientLightColor, SCENE_CONFIG.ambientLightIntensity);
    scene.add(ambientLight);

    const pl1 = new THREE.PointLight(SCENE_CONFIG.pointLight1Color, SCENE_CONFIG.pointLight1Intensity, SCENE_CONFIG.pointLight1Range);
    pl1.position.set(50, 30, 50);
    scene.add(pl1);

    const pl2 = new THREE.PointLight(SCENE_CONFIG.pointLight2Color, SCENE_CONFIG.pointLight2Intensity, SCENE_CONFIG.pointLight2Range);
    pl2.position.set(-50, -30, -50);
    scene.add(pl2);

    // Neighbor map for hover
    const neighborsMap = new Map<string, Set<string>>();
    for (const node of data.nodes) {
      neighborsMap.set(node.id, new Set());
    }
    for (const edge of data.edges.dependencies) {
      neighborsMap.get(edge.source)?.add(edge.target);
      neighborsMap.get(edge.target)?.add(edge.source);
    }

    // 4. Nodes
    const nodeGroups: THREE.Group[] = [];
    const nodeGeometriesToDispose: THREE.BufferGeometry[] = [];
    const nodeMaterialsToDispose: THREE.Material[] = [];

    const nodesMap = new Map<string, VizNode>();
    nodeMeshMapRef.current.clear();
    hitboxMeshMapRef.current.clear();

    for (const node of data.nodes) {
      nodesMap.set(node.id, node);
      
      const radius = computeNodeRadius(node.normalized.size);
      const color = getClusterColor(node.cluster.id);

      const coreGeo = new THREE.SphereGeometry(radius, 24, 24);
      const coreMat = new THREE.MeshPhongMaterial({
        color,
        emissive: color,
        emissiveIntensity: NODE_CONFIG.coreEmissiveIntensity,
        shininess: NODE_CONFIG.coreShininess
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.userData.nodeId = node.id;

      const haloGeo = new THREE.SphereGeometry(radius * NODE_CONFIG.haloRadiusMultiplier, 16, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: NODE_CONFIG.haloOpacity
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      
      const hitboxRadius = Math.max(
        radius * NODE_CONFIG.hitboxRadiusMultiplier,
        NODE_CONFIG.hitboxRadiusMin
      );
      const hitboxGeo = new THREE.SphereGeometry(hitboxRadius, 12, 12);
      const hitboxMat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const hitboxMesh = new THREE.Mesh(hitboxGeo, hitboxMat);
      hitboxMesh.userData.nodeId = node.id;
      hitboxMesh.visible = true;

      const group = new THREE.Group();
      group.add(coreMesh);
      group.add(haloMesh);
      group.add(hitboxMesh);
      
      group.position.set(node.position.x, node.position.y, node.position.z);
      group.userData = {
        radius,
        phase: Math.random() * Math.PI * 2,
        nodeId: node.id
      };
      
      scene.add(group);
      nodeGroups.push(group);
      
      nodeMeshMapRef.current.set(node.id, { core: coreMesh, halo: haloMesh, group });
      hitboxMeshMapRef.current.set(node.id, hitboxMesh);
      
      nodeGeometriesToDispose.push(coreGeo, haloGeo, hitboxGeo);
      nodeMaterialsToDispose.push(coreMat, haloMat, hitboxMat);
    }

    // 5. Edges
    const edgeGeometriesToDispose: THREE.BufferGeometry[] = [];
    const edgeMaterialsToDispose: THREE.Material[] = [];

    const edgeMat = new THREE.LineBasicMaterial({
      color: EDGE_CONFIG.color,
      transparent: true,
      opacity: EDGE_CONFIG.opacity
    });
    edgeMaterialsToDispose.push(edgeMat);

    edgeLinesMapRef.current.clear();

    for (const edge of data.edges.dependencies) {
      const sourceNode = nodesMap.get(edge.source);
      const targetNode = nodesMap.get(edge.target);
      
      if (sourceNode && targetNode) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(sourceNode.position.x, sourceNode.position.y, sourceNode.position.z),
          new THREE.Vector3(targetNode.position.x, targetNode.position.y, targetNode.position.z)
        ]);
        const line = new THREE.Line(lineGeo, edgeMat);
        scene.add(line);
        edgeGeometriesToDispose.push(lineGeo);
        
        const key = `${edge.source}→${edge.target}`;
        edgeLinesMapRef.current.set(key, line);
      }
    }

    // Filesystem edges (rendered but visibility controlled by layer toggle)
    const fsEdgeMat = new THREE.LineBasicMaterial({
      color: '#3a5a80',  // desaturated steel blue
      transparent: true,
      opacity: 0.4,
    });
    edgeMaterialsToDispose.push(fsEdgeMat);

    const fsEdgeLinesRef: THREE.Line[] = [];

    if (data.edges.filesystem && data.edges.filesystem.length > 0) {
      for (const edge of data.edges.filesystem) {
        const sourceNode = nodesMap.get(edge.source);
        const targetNode = nodesMap.get(edge.target);
        if (!sourceNode || !targetNode) continue;
        
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(sourceNode.position.x, sourceNode.position.y, sourceNode.position.z),
          new THREE.Vector3(targetNode.position.x, targetNode.position.y, targetNode.position.z),
        ]);
        const line = new THREE.Line(lineGeo, fsEdgeMat);
        line.visible = false;
        scene.add(line);
        edgeGeometriesToDispose.push(lineGeo);
        fsEdgeLinesRef.push(line);
      }
    }

    if (fsEdgeLinesRef.length === 0) {
      // Fallback: connect files that share an immediate parent directory
      const filesByDir = new Map<string, VizNode[]>();
      for (const node of data.nodes) {
        const dir = node.directory || '';
        if (!filesByDir.has(dir)) filesByDir.set(dir, []);
        filesByDir.get(dir)!.push(node);
      }
      
      for (const [dir, files] of filesByDir.entries()) {
        if (files.length < 2) continue;
        for (let i = 0; i < files.length; i++) {
          for (let j = i + 1; j < files.length; j++) {
            const a = files[i];
            const b = files[j];
            const lineGeo = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(a.position.x, a.position.y, a.position.z),
              new THREE.Vector3(b.position.x, b.position.y, b.position.z),
            ]);
            const line = new THREE.Line(lineGeo, fsEdgeMat);
            line.visible = false;
            scene.add(line);
            edgeGeometriesToDispose.push(lineGeo);
            fsEdgeLinesRef.push(line);
          }
        }
      }
    }

    function applyLayerVisuals() {
      const currentLayers = layersRef.current;
      
      for (const line of edgeLinesMapRef.current.values()) {
        line.visible = currentLayers.dependencies;
      }
      
      for (const line of fsEdgeLinesRef) {
        line.visible = currentLayers.filesystem;
      }
      
      for (const [id, { core, halo }] of nodeMeshMapRef.current.entries()) {
        const node = nodesMap.get(id);
        if (!node) continue;
        
        let color: string;
        if (currentLayers.heatmap) {
          color = computeHeatmapColor(node.normalized.heat);
        } else if (currentLayers.clusters) {
          color = getClusterColor(node.cluster.id);
        } else {
          color = '#5a5a80';
        }
        
        const coreMat = core.material as THREE.MeshPhongMaterial;
        const haloMat = halo.material as THREE.MeshBasicMaterial;
        coreMat.color.set(color);
        coreMat.emissive.set(color);
        haloMat.color.set(color);
      }
    }

    applyLayerVisualsRef.current = applyLayerVisuals;

    // hover internals
    function updateHoverVisuals(hoveredId: string | null) {
      const selectedIds = selectedNodeIdsRef.current;
      
      const highlightedIds = new Set(selectedIds);
      if (hoveredId) highlightedIds.add(hoveredId);
      
      const neighborIds = new Set<string>();
      for (const id of highlightedIds) {
        const nbrs = neighborsMap.get(id);
        if (nbrs) {
          for (const n of nbrs) neighborIds.add(n);
        }
      }
      
      for (const [id, { core, halo }] of nodeMeshMapRef.current.entries()) {
        const coreMat = core.material as THREE.MeshPhongMaterial;
        const haloMat = halo.material as THREE.MeshBasicMaterial;
        
        if (highlightedIds.size === 0) {
          coreMat.emissiveIntensity = NODE_CONFIG.coreEmissiveIntensity;
          haloMat.opacity = NODE_CONFIG.haloOpacity;
        } else if (id === hoveredId) {
          coreMat.emissiveIntensity = 1.0;
          haloMat.opacity = 0.25;
        } else if (selectedIds.has(id)) {
          coreMat.emissiveIntensity = NODE_CONFIG.selectedEmissiveIntensity;
          haloMat.opacity = NODE_CONFIG.selectedHaloOpacity;
        } else if (neighborIds.has(id)) {
          coreMat.emissiveIntensity = 0.7;
          haloMat.opacity = 0.18;
        } else {
          coreMat.emissiveIntensity = 0.2;
          haloMat.opacity = 0.05;
        }
      }
      
      for (const [key, line] of edgeLinesMapRef.current.entries()) {
        const mat = line.material as THREE.LineBasicMaterial;
        const [source, target] = key.split('→');
        const isConnected = highlightedIds.has(source) || highlightedIds.has(target);
        
        if (highlightedIds.size === 0) {
          mat.color.set(EDGE_CONFIG.color);
          mat.opacity = EDGE_CONFIG.opacity;
        } else if (isConnected) {
          let colorSourceId: string | null = null;
          if (hoveredId && (source === hoveredId || target === hoveredId)) {
            colorSourceId = hoveredId;
          } else {
            colorSourceId = selectedIds.has(source) ? source : target;
          }
          const node = nodesMap.get(colorSourceId!);
          
          let color: string;
          const currentLayers = layersRef.current;
          if (currentLayers.heatmap) {
            color = node ? computeHeatmapColor(node.normalized.heat) : EDGE_CONFIG.color;
          } else if (currentLayers.clusters) {
            color = node ? getClusterColor(node.cluster.id) : EDGE_CONFIG.color;
          } else {
            color = '#5a5a80';
          }

          mat.color.set(color);
          mat.opacity = 1.0;
        } else {
          mat.color.set('#3a3a60');
          mat.opacity = 0.15;
        }
      }
    }

    updateHoverVisualsRef.current = updateHoverVisuals;

    // Call it once after scene is built
    applyLayerVisuals();

    // 6. Animation loop
    let animationFrameId: number;
    const animate = () => {
      const time = performance.now() * 0.001;
      const state = controlsRef.current;

      // Handle hover raycasting
      raycasterRef.current.setFromCamera(mouseNdcRef.current, camera);
      const hitboxMeshes = Array.from(hitboxMeshMapRef.current.values());
      const intersects = raycasterRef.current.intersectObjects(hitboxMeshes, false);

      const newHoveredId = intersects.length > 0
        ? (intersects[0].object.userData.nodeId as string)
        : null;

      if (newHoveredId !== hoveredNodeIdRef.current) {
        hoveredNodeIdRef.current = newHoveredId;
        renderer.domElement.style.cursor = newHoveredId ? 'pointer' : 'default';
        updateHoverVisuals(newHoveredId);
        
        if (newHoveredId) {
          const node = nodesMap.get(newHoveredId);
          if (node) setHoveredNode(node);
        } else {
          setHoveredNode(null);
          setHoveredNodePosition(null);
        }
      }

      // Pulse nodes
      for (const group of nodeGroups) {
        const { phase } = group.userData;
        const scale = 1 + Math.sin(time * NODE_CONFIG.pulseFrequency + phase) * NODE_CONFIG.pulseAmplitude;
        group.scale.setScalar(scale);
      }

      // Orbit point lights
      pl1.position.set(
        Math.cos(time * 0.3) * 80, 
        Math.sin(time * 0.4) * 60, 
        Math.sin(time * 0.3) * 80
      );
      pl2.position.set(
        Math.cos(time * 0.2 + Math.PI) * 80, 
        Math.sin(time * 0.3 + Math.PI) * 60, 
        Math.sin(time * 0.2 + Math.PI) * 80
      );

      // Auto-rotate camera
      const hasSelection = selectedNodeIdsRef.current.size > 0;
      const shouldAutoRotate = !state.isDragging && !isMouseInsideRef.current && !hasSelection;
      if (shouldAutoRotate) {
        state.theta += CAMERA_CONFIG.autoRotateSpeed;
      }

      // Update camera position
      camera.position.x = state.radius * Math.sin(state.phi) * Math.cos(state.theta);
      camera.position.y = state.radius * Math.cos(state.phi);
      camera.position.z = state.radius * Math.sin(state.phi) * Math.sin(state.theta);
      camera.lookAt(0, 0, 0);

      // Project positions for selected nodes
      if (selectedNodeIdsRef.current.size > 0) {
        const rect = renderer.domElement.getBoundingClientRect();
        const newPositions = new Map<string, {x: number; y: number}>();
        
        for (const selectedId of selectedNodeIdsRef.current) {
          const meshInfo = nodeMeshMapRef.current.get(selectedId);
          if (!meshInfo) continue;
          
          const worldPos = meshInfo.group.position.clone();
          const projected = worldPos.project(camera);
          
          const behindCamera = projected.z > 1;
          const offscreen = projected.x < -1 || projected.x > 1 || projected.y < -1 || projected.y > 1;
          
          if (behindCamera || offscreen) continue;
          
          const screenX = (projected.x * 0.5 + 0.5) * rect.width;
          const screenY = (-projected.y * 0.5 + 0.5) * rect.height;
          
          newPositions.set(selectedId, { x: screenX, y: screenY });
        }
        
        // Throttled React state update
        const prevPositions = selectedNodePositionsRef.current;
        let changed = newPositions.size !== prevPositions.size;
        if (!changed) {
          for (const [id, pos] of newPositions) {
            const prev = prevPositions.get(id);
            if (!prev || Math.abs(prev.x - pos.x) > 0.5 || Math.abs(prev.y - pos.y) > 0.5) {
              changed = true;
              break;
            }
          }
        }
        
        if (changed) {
          selectedNodePositionsRef.current = newPositions;
          setSelectedNodePositions(newPositions);
        }
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    function getTouchDistance(touches: TouchList): number {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Start pinch
        pinchStateRef.current = {
          initialDistance: getTouchDistance(e.touches),
          initialRadius: controlsRef.current.radius,
        };
        // Prevent default to stop browser zoom
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStateRef.current) {
        e.preventDefault();
        const currentDistance = getTouchDistance(e.touches);
        const ratio = pinchStateRef.current.initialDistance / currentDistance;
        const newRadius = pinchStateRef.current.initialRadius * ratio;
        controlsRef.current.radius = Math.max(
          CAMERA_CONFIG.zoomMin, 
          Math.min(CAMERA_CONFIG.zoomMax, newRadius)
        );
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchStateRef.current = null;
      }
    };

    const handlePointerEnter = () => {
      isMouseInsideRef.current = true;
    };

    // 7. Camera controls and mouse tracking
    const handlePointerDown = (e: PointerEvent) => {
      controlsRef.current.isDragging = true;
      controlsRef.current.lastPointer = { x: e.clientX, y: e.clientY };
      pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
      gestureTypeRef.current = 'undecided';
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      mouseNdcRef.current.x = (x / rect.width) * 2 - 1;
      mouseNdcRef.current.y = -(y / rect.height) * 2 + 1;

      if (hoveredNodeIdRef.current) {
        setHoveredNodePosition({ x, y });
      }

      if (!controlsRef.current.isDragging) return;
      if (pinchStateRef.current) return;
      
      // Gesture resolution: only on touch, decide on first significant movement
      if (e.pointerType === 'touch' && gestureTypeRef.current === 'undecided') {
        const totalDx = Math.abs(e.clientX - (pointerDownPosRef.current?.x ?? e.clientX));
        const totalDy = Math.abs(e.clientY - (pointerDownPosRef.current?.y ?? e.clientY));
        
        // Wait until movement is at least 10 pixels to decide
        if (totalDx + totalDy < 10) return;
        
        // If vertical dominates by more than 1.5x, it's probably a scroll
        if (totalDy > totalDx * 1.5) {
          gestureTypeRef.current = 'scroll';
          controlsRef.current.isDragging = false;
          return;
        } else {
          gestureTypeRef.current = 'drag';
        }
      }
      
      const state = controlsRef.current;
      const dx = e.clientX - state.lastPointer.x;
      const dy = e.clientY - state.lastPointer.y;
      
      state.theta -= dx * CAMERA_CONFIG.dragSensitivity;
      state.phi -= dy * CAMERA_CONFIG.dragSensitivity;
      state.phi = Math.max(0.1, Math.min(Math.PI - 0.1, state.phi));
      
      state.lastPointer = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      controlsRef.current.isDragging = false;

      if (!pointerDownPosRef.current) return;
      const dx = e.clientX - pointerDownPosRef.current.x;
      const dy = e.clientY - pointerDownPosRef.current.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      pointerDownPosRef.current = null;
      
      if (dist > 5) return; // was a drag
      
      raycasterRef.current.setFromCamera(mouseNdcRef.current, camera);
      const hitboxMeshes = Array.from(hitboxMeshMapRef.current.values());
      const intersects = raycasterRef.current.intersectObjects(hitboxMeshes, false);
      
      if (intersects.length > 0) {
        const clickedId = intersects[0].object.userData.nodeId as string;
        const newSet = new Set(selectedNodeIdsRef.current);
        if (newSet.has(clickedId)) {
          newSet.delete(clickedId);
        } else {
          newSet.add(clickedId);
        }
        selectedNodeIdsRef.current = newSet;
        
        const nodes = Array.from(newSet).map(id => nodesMap.get(id)).filter(Boolean) as VizNode[];
        setSelectedNodes(nodes);
        
        updateHoverVisuals(hoveredNodeIdRef.current);
      } else {
        if (selectedNodeIdsRef.current.size > 0) {
          selectedNodeIdsRef.current = new Set();
          setSelectedNodes([]);
          setSelectedNodePositions(new Map());
          updateHoverVisuals(hoveredNodeIdRef.current);
        }
      }
    };

    const handlePointerLeave = () => {
      controlsRef.current.isDragging = false;
      mouseNdcRef.current.set(-9999, -9999);
      isMouseInsideRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const state = controlsRef.current;
      state.radius = Math.max(CAMERA_CONFIG.zoomMin, Math.min(CAMERA_CONFIG.zoomMax, state.radius + e.deltaY * 0.1));
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('pointerenter', handlePointerEnter);
    domElement.addEventListener('pointerdown', handlePointerDown);
    domElement.addEventListener('pointermove', handlePointerMove);
    domElement.addEventListener('pointerup', handlePointerUp);
    domElement.addEventListener('pointerleave', handlePointerLeave);
    domElement.addEventListener('wheel', handleWheel, { passive: false });
    
    domElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    domElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    domElement.addEventListener('touchend', handleTouchEnd);
    domElement.addEventListener('touchcancel', handleTouchEnd);

    // 8. Resize handling
    const resizeObserver = new ResizeObserver((entries) => {
      if (isTransitioningRef.current) return;
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
    });
    resizeObserver.observe(container);

    triggerResizeRef.current = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    // 9. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      
      domElement.removeEventListener('pointerenter', handlePointerEnter);
      domElement.removeEventListener('pointerdown', handlePointerDown);
      domElement.removeEventListener('pointermove', handlePointerMove);
      domElement.removeEventListener('pointerup', handlePointerUp);
      domElement.removeEventListener('pointerleave', handlePointerLeave);
      domElement.removeEventListener('wheel', handleWheel);

      domElement.removeEventListener('touchstart', handleTouchStart);
      domElement.removeEventListener('touchmove', handleTouchMove);
      domElement.removeEventListener('touchend', handleTouchEnd);
      domElement.removeEventListener('touchcancel', handleTouchEnd);

      nodeGeometriesToDispose.forEach(geom => geom.dispose());
      nodeMaterialsToDispose.forEach(mat => mat.dispose());
      edgeGeometriesToDispose.forEach(geom => geom.dispose());
      edgeMaterialsToDispose.forEach(mat => mat.dispose());
      bgGeo.dispose();
      bgMat.dispose();

      renderer.domElement.style.cursor = 'default';
      renderer.dispose();
      
      if (container.contains(domElement)) {
        container.removeChild(domElement);
      }
    };
  }, [data]);

  const triggerResize = useCallback(() => {
    triggerResizeRef.current();
  }, []);

  return { containerRef, hoveredNode, hoveredNodePosition, selectedNodes, selectedNodePositions, triggerResize };
}
