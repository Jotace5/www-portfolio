"use client";

import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import {
  extractParticlesFromText,
  ParticleTextConfig,
  GAP,
  VORTEX_TANGENTIAL,
  VORTEX_ATTRACTION,
  VORTEX_MAX_FORCE,
  EASE_FACTOR,
  DAMPING,
  RESTLESSNESS,
  COLOR_RETURN_SPEED,
  PARTICLE_SIZE,
  PARTICLE_OPACITY,
  BASE_COLOR,
  ACCENT_COLOR,
  BACKGROUND_COLOR,
} from "@/lib/particleUtils";

export function useParticleAnimation(
  config: ParticleTextConfig,
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const materialRef = useRef<THREE.PointsMaterial | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const mouseRef = useRef({ x: 9999, y: 9999 });
  const velocitiesRef = useRef<Float32Array | null>(null);
  const colorStatesRef = useRef<Float32Array | null>(null);
  const dimensionsRef = useRef({ width: 0, height: 0, aspect: 1, frustumSize: 400 });
  const resizeTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isActiveRef = useRef(true);
  const mouseActiveRef = useRef(false);

  // Initialize Three.js scene
  const initScene = useCallback(
    async (width: number) => {
      const { particles, contentHeight } = await extractParticlesFromText(config, width);
      if (particles.length === 0) return false;

      const height = Math.max(100, contentHeight);

      const frustumSize = height;
      const aspect = width / height;

      dimensionsRef.current = { width, height, aspect, frustumSize };

      // Scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Orthographic camera
      const camera = new THREE.OrthographicCamera(
        (-frustumSize * aspect) / 2,
        (frustumSize * aspect) / 2,
        frustumSize / 2,
        -frustumSize / 2,
        0.1,
        1000
      );
      camera.position.z = 500;
      cameraRef.current = camera;

      // Renderer
      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
      });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(width, height);
      renderer.setClearColor(BACKGROUND_COLOR, 1);
      rendererRef.current = renderer;

      // Create geometry
      const numParticles = particles.length;
      const positions = new Float32Array(numParticles * 3);
      const homePositions = new Float32Array(numParticles * 3);
      const colors = new Float32Array(numParticles * 3);
      velocitiesRef.current = new Float32Array(numParticles * 3);
      colorStatesRef.current = new Float32Array(numParticles);

      const baseColor = new THREE.Color(BASE_COLOR);

      for (let i = 0; i < numParticles; i++) {
        const x = particles[i].x;
        const y = particles[i].y;

        // Start at home position — text looks normal on load
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = 0;

        homePositions[i * 3] = x;
        homePositions[i * 3 + 1] = y;
        homePositions[i * 3 + 2] = 0;

        // Zero initial velocity
        velocitiesRef.current[i * 3] = 0;
        velocitiesRef.current[i * 3 + 1] = 0;
        velocitiesRef.current[i * 3 + 2] = 0;

        colors[i * 3] = baseColor.r;
        colors[i * 3 + 1] = baseColor.g;
        colors[i * 3 + 2] = baseColor.b;

        colorStatesRef.current[i] = 0;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("home", new THREE.BufferAttribute(homePositions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geometryRef.current = geometry;

      // Material
      const material = new THREE.PointsMaterial({
        size: PARTICLE_SIZE,
        vertexColors: true,
        transparent: true,
        opacity: PARTICLE_OPACITY,
        sizeAttenuation: false,
      });
      materialRef.current = material;

      // Points mesh
      const points = new THREE.Points(geometry, material);
      scene.add(points);
      pointsRef.current = points;

      return height;
    },
    [config] // extractParticlesFromText is outside the component now
  );

  // Animation loop
  const animate = useCallback(() => {
    if (!isActiveRef.current) return;

    const geometry = geometryRef.current;
    const velocities = velocitiesRef.current;
    const colorStates = colorStatesRef.current;

    if (!geometry || !velocities || !colorStates) {
      animationFrameRef.current = requestAnimationFrame(animate);
      return;
    }

    const positions = geometry.attributes.position.array as Float32Array;
    const homePositions = geometry.attributes.home.array as Float32Array;
    const colors = geometry.attributes.color.array as Float32Array;

    const baseColor = new THREE.Color(BASE_COLOR);
    const accentColor = new THREE.Color(ACCENT_COLOR);
    const numParticles = positions.length / 3;

    const mouseX = mouseRef.current.x;
    const mouseY = mouseRef.current.y;

    for (let i = 0; i < numParticles; i++) {
      const idx = i * 3;

      // 1. Spring toward home
      const dx = homePositions[idx] - positions[idx];
      const dy = homePositions[idx + 1] - positions[idx + 1];
      const distance = Math.sqrt(dx * dx + dy * dy);
      const springAngle = Math.atan2(dy, dx);

      let springForce: number;

      if (distance > 0.01) {
        springForce = distance * EASE_FACTOR;
        // Only add restless drift when mouse is actively over the canvas
        if (mouseActiveRef.current) {
          springForce += (Math.random() - 0.5) * RESTLESSNESS;
        }
      } else {
        // Snap to home and kill velocity
        springForce = 0;
        positions[idx] = homePositions[idx];
        positions[idx + 1] = homePositions[idx + 1];
        velocities[idx] = 0;
        velocities[idx + 1] = 0;
      }

      // 2. Vortex effect (tangential orbit + gentle attraction)
      let vortexTangentialForce = 0;
      let vortexAttractionForce = 0;
      let tangentialAngle = 0;
      let radialAngle = 0;
      let disturbed = false;

      if (mouseActiveRef.current) {
        const mdx = positions[idx] - mouseX;
        const mdy = positions[idx + 1] - mouseY;
        const mouseDist = Math.sqrt(mdx * mdx + mdy * mdy);

        if (mouseDist > 0.1) {
          // Usar 1/dist (no 1/dist²) para alcance más amplio del vórtice
          radialAngle = Math.atan2(mdy, mdx);
          tangentialAngle = radialAngle + Math.PI / 2; // counterclockwise

          vortexTangentialForce = Math.min(VORTEX_TANGENTIAL / mouseDist, VORTEX_MAX_FORCE);
          vortexAttractionForce = Math.min(VORTEX_ATTRACTION / mouseDist, VORTEX_MAX_FORCE);

          disturbed = vortexTangentialForce > 0.9;
        }
      }

      // 3. Apply forces to velocity
      velocities[idx] +=
        springForce * Math.cos(springAngle) +
        vortexTangentialForce * Math.cos(tangentialAngle) -
        vortexAttractionForce * Math.cos(radialAngle);

      velocities[idx + 1] +=
        springForce * Math.sin(springAngle) +
        vortexTangentialForce * Math.sin(tangentialAngle) -
        vortexAttractionForce * Math.sin(radialAngle);

      // 4. Damping
      velocities[idx] *= DAMPING;
      velocities[idx + 1] *= DAMPING;

      // 5. Update position
      positions[idx] += velocities[idx];
      positions[idx + 1] += velocities[idx + 1];

      // 6. Update color state
      if (disturbed) {
        colorStates[i] = Math.min(1, colorStates[i] + 0.2);
      } else {
        colorStates[i] = Math.max(0, colorStates[i] - COLOR_RETURN_SPEED);
      }

      // Lerp color
      const t = colorStates[i];
      colors[idx] = baseColor.r + (accentColor.r - baseColor.r) * t;
      colors[idx + 1] = baseColor.g + (accentColor.g - baseColor.g) * t;
      colors[idx + 2] = baseColor.b + (accentColor.b - baseColor.b) * t;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;

    // Render
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  // Handle mouse movement
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const renderer = rendererRef.current;
      if (!renderer) return;

      const rect = renderer.domElement.getBoundingClientRect();
      const { aspect, frustumSize } = dimensionsRef.current;

      // Convert to Three.js world coordinates
      mouseRef.current.x =
        (event.clientX - rect.left - rect.width / 2) *
        ((frustumSize * aspect) / rect.width);
      mouseRef.current.y =
        -(event.clientY - rect.top - rect.height / 2) *
        (frustumSize / rect.height);
      mouseActiveRef.current = true;
    },
    []
  );

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { x: 9999, y: 9999 };
    mouseActiveRef.current = false;
  }, []);

  // Handle resize with debounce
  const handleResize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear existing timeout
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    // Debounce resize
    resizeTimeoutRef.current = setTimeout(async () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(100, rect.width);

      // Clean up old scene
      if (geometryRef.current) {
        geometryRef.current.dispose();
      }
      if (materialRef.current) {
        materialRef.current.dispose();
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement.parentNode) {
          rendererRef.current.domElement.parentNode.removeChild(
            rendererRef.current.domElement
          );
        }
      }

      // Initialize new scene
      const newHeight = await initScene(width);
      if (newHeight !== false) {
        const renderer = rendererRef.current;
        if (renderer && container) {
          container.appendChild(renderer.domElement);
          container.style.height = `${newHeight}px`;
          renderer.domElement.addEventListener("mousemove", handleMouseMove);
          renderer.domElement.addEventListener("mouseleave", handleMouseLeave);
        }
      }
    }, 200);
  }, [initScene, handleMouseMove, handleMouseLeave, containerRef]);

  // Initialize on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    const setup = async () => {
      
      container.querySelectorAll("canvas").forEach((c) => c.remove());
      
      const rect = container.getBoundingClientRect();
      const width = Math.max(100, rect.width);

      const newHeight = await initScene(width);
      if (cancelled || newHeight === false) return;

      const renderer = rendererRef.current;
      if (renderer && container) {
        container.appendChild(renderer.domElement);
        container.style.height = `${newHeight}px`;

        // Add event listeners
        renderer.domElement.addEventListener("mousemove", handleMouseMove);
        renderer.domElement.addEventListener("mouseleave", handleMouseLeave);
      }

      // Start animation
      isActiveRef.current = true;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    setup();

    // Global resize listener
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      cancelled = true;
      isActiveRef.current = false;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      const renderer = rendererRef.current;
      if (renderer) {
        renderer.domElement.removeEventListener("mousemove", handleMouseMove);
        renderer.domElement.removeEventListener("mouseleave", handleMouseLeave);
        renderer.domElement.remove();
        renderer.dispose();
      }

      if (geometryRef.current) {
        geometryRef.current.dispose();
      }

      if (materialRef.current) {
        materialRef.current.dispose();
      }

      window.removeEventListener("resize", handleResize);
    };
  }, [animate, handleMouseMove, handleMouseLeave, handleResize, initScene, containerRef]);
}
