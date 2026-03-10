'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface DotWaveProps {
  className?: string;
}

export default function DotWave({ className }: DotWaveProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(120, container.clientWidth / getContainerHeight(window.innerWidth), 1, 10000);
    camera.position.x = -100; 
    camera.position.y = 700;
    camera.position.z = 100;
    camera.lookAt(100, 50, -500);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, getContainerHeight(window.innerWidth));
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    // Particles setup
    const SEPARATION = 40;
    const AMOUNT_X = 330;
    const AMOUNT_Y = 35;
    
    const numParticles = AMOUNT_X * AMOUNT_Y;
    const positions = new Float32Array(numParticles * 3);
    
    const gridOffsetX = (AMOUNT_X * SEPARATION) * 0.15;
    
    let i = 0;
    for (let ix = 0; ix < AMOUNT_X; ix++) {
      for (let iy = 0; iy < AMOUNT_Y; iy++) {
        positions[i * 3] = ix * SEPARATION - ((AMOUNT_X * SEPARATION) / 2) + gridOffsetX; // x
        positions[i * 3 + 1] = 0; // y
        positions[i * 3 + 2] = iy * SEPARATION - ((AMOUNT_Y * SEPARATION) - 10); // z
        i++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x000000,
      size: 2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.6,
    });

    const particles = new THREE.Points(geometry, material);
    //particles.rotation.y = -0.3;
    scene.add(particles);

    // Animation loop
    let count = 0;
    let animationFrameId: number;

    const render = () => {
      let i = 0;
      for (let ix = 0; ix < AMOUNT_X; ix++) {
        for (let iy = 0; iy < AMOUNT_Y; iy++) {
          positions[i * 3 + 1] = (Math.sin((ix + count) * 0.5) * 20) + (Math.sin((iy + count) * 0.5) * 20);
          i++;
        }
      }
      
      geometry.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
      
      count += 0.1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Resize handler
    const onWindowResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = getContainerHeight(window.innerWidth);
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', onWindowResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', onWindowResize);
      cancelAnimationFrame(animationFrameId);
      
      if (containerRef.current && renderer.domElement && containerRef.current.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
      
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  // Helper to determine height based on breakpoint (768px)
  function getContainerHeight(windowWidth: number): number {
    return windowWidth >= 768 ? 180 : 80;
  }

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden -mt-1 ${className || ""}`}
      aria-hidden="true"
      style={{ lineHeight: 0 }}
    />
  );
}
