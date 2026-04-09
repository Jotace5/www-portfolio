// Cluster color palette — neon set from the prototype
export const CLUSTER_COLORS: string[] = [
  '#7af5ca', '#f57adb', '#7a9af5', '#f5e87a',
  '#caf57a', '#f57a7a', '#7af5f5', '#b87af5', '#f5a87a'
];

// Returns a color from the palette, cycling with modulo for clusters beyond array length
export function getClusterColor(clusterId: number): string {
  return CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length];
}

// Brand accent — matches the portfolio Steel Blue
export const ACCENT_COLOR = '#4A90D9';
export const ACCENT_COLOR_RGB = '74, 144, 217';

// Scene constants
export const SCENE_CONFIG = {
  background: '#0a0a0f',
  bgParticleColor: '#2a2a40',
  bgParticleCount: 600,
  bgParticleRange: 200,
  bgParticleSize: 0.4,
  bgParticleOpacity: 0.5,
  
  ambientLightColor: '#555577',
  ambientLightIntensity: 1.0,
  
  pointLight1Color: '#7af5ca',
  pointLight1Intensity: 1.0,
  pointLight1Range: 500,
  
  pointLight2Color: '#f57adb',
  pointLight2Intensity: 0.7,
  pointLight2Range: 500,
} as const;

// Node rendering constants
export const NODE_CONFIG = {
  coreRadiusMultiplier: 4.0,
  coreRadiusBase: 0.2,
  haloRadiusMultiplier: 2.5,
  hitboxRadiusMultiplier: 4.0,
  hitboxRadiusMin: 5.0,
  coreEmissiveIntensity: 0.7,
  coreShininess: 100,
  haloOpacity: 0.15,
  pulseAmplitude: 0.06,
  pulseFrequency: 1.5,
  selectedEmissiveIntensity: 0.9,
  selectedHaloOpacity: 0.22,
} as const;

// Edge rendering constants
export const EDGE_CONFIG = {
  color: '#5a5a80',
  opacity: 0.7,
} as const;

// Camera constants
export const CAMERA_CONFIG = {
  fov: 60,
  near: 0.1,
  far: 2000,
  initialRadius: 320,
  initialPhi: Math.PI / 2,
  initialTheta: 0,
  dragSensitivity: 0.005,
  zoomMin: 50,
  zoomMax: 600,
  autoRotateSpeed: 0.002,
} as const;

// Helper: compute the visual radius of a node from its normalized size
export function computeNodeRadius(normalizedSize: number): number {
  return normalizedSize * NODE_CONFIG.coreRadiusMultiplier + NODE_CONFIG.coreRadiusBase;
}
