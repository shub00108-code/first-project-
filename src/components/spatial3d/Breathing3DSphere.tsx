import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Breathing3DSphereProps {
  phase: 'ready' | 'inhale' | 'hold' | 'exhale';
  progress: number; // 0 to 1 progress within the current phase
  className?: string;
}

const _mouseTarget = new THREE.Vector2(0, 0);

function checkIsSoftwareGl(): boolean {
  try {
    const probe = document.createElement('canvas').getContext('webgl2');
    if (!probe) return true;
    const ext = probe.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
    const gpu = String(probe.getParameter(param));
    probe.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export const Breathing3DSphere: React.FC<Breathing3DSphereProps> = ({
  phase,
  progress,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ phase, progress });

  useEffect(() => {
    stateRef.current.phase = phase;
    stateRef.current.progress = progress;
  }, [phase, progress]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = checkIsSoftwareGl();
    const width = container.clientWidth || 360;
    const height = container.clientHeight || 360;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 0, 4.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x2dd4bf, 3.5, 10);
    pointLight.position.set(2, 3, 3);
    scene.add(pointLight);

    const backLight = new THREE.PointLight(0x818cf8, 2.5, 10);
    backLight.position.set(-2, -3, -2);
    scene.add(backLight);

    // 3. 3D Procedural Breathing Geometries
    const mandalaGroup = new THREE.Group();
    scene.add(mandalaGroup);

    // Inner Glowing Core
    const coreGeo = new THREE.IcosahedronGeometry(0.7, 3);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x14b8a6,
      emissive: 0x0f766e,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.1,
      wireframe: false,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    mandalaGroup.add(coreMesh);

    // Middle Faceted Cage
    const cageGeo = new THREE.IcosahedronGeometry(0.95, 1);
    const cageMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      wireframe: true,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.5,
    });
    const cageMesh = new THREE.Mesh(cageGeo, cageMat);
    mandalaGroup.add(cageMesh);

    // Outer Torus Ring
    const ringGeo = new THREE.TorusGeometry(1.2, 0.04, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xa78bfa,
      metalness: 0.5,
      roughness: 0.2,
      transparent: true,
      opacity: 0.7,
    });
    const ringMesh1 = new THREE.Mesh(ringGeo, ringMat);
    ringMesh1.rotation.x = Math.PI * 0.5;
    mandalaGroup.add(ringMesh1);

    const ringMesh2 = new THREE.Mesh(ringGeo, ringMat);
    ringMesh2.rotation.y = Math.PI * 0.5;
    mandalaGroup.add(ringMesh2);

    // Orbiting Stardust Particles
    const particleCount = 70;
    const particleGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const r = 1.35 + (Math.random() - 0.5) * 0.3;
      pos[i * 3 + 0] = Math.cos(angle) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
      pos[i * 3 + 2] = Math.sin(angle) * r;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x5eead4,
      size: 0.055,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const particleRing = new THREE.Points(particleGeo, particleMat);
    mandalaGroup.add(particleRing);

    // 4. Mouse Pointer Tracking
    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      _mouseTarget.set(x * 0.5, y * 0.5);
    };

    container.addEventListener('pointermove', handlePointerMove);

    // 5. Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 360;
      const h = container.clientHeight || 360;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 6. Animation Loop
    let frameId = 0;
    const clock = new THREE.Clock();
    let currentScale = 1.0;
    let targetScale = 1.0;

    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const { phase: curPhase, progress: curProg } = stateRef.current;

      // Calculate Target Scale based on Breathing Phase
      if (curPhase === 'inhale') {
        // Expands from 1.0 to 1.55
        targetScale = 1.0 + curProg * 0.55;
        coreMat.color.lerp(new THREE.Color(0x06b6d4), 0.1); // Cyan
        pointLight.color.lerp(new THREE.Color(0x22d3ee), 0.1);
      } else if (curPhase === 'hold') {
        // Holds expanded with gentle undulating pulse
        targetScale = 1.55 + Math.sin(elapsed * 4.0) * 0.04;
        coreMat.color.lerp(new THREE.Color(0x6366f1), 0.1); // Indigo hold
        pointLight.color.lerp(new THREE.Color(0x818cf8), 0.1);
      } else if (curPhase === 'exhale') {
        // Contracts from 1.55 down to 1.0
        targetScale = 1.55 - curProg * 0.55;
        coreMat.color.lerp(new THREE.Color(0x10b981), 0.1); // Emerald exhale
        pointLight.color.lerp(new THREE.Color(0x34d399), 0.1);
      } else {
        // Ready / Idle
        targetScale = 1.0 + Math.sin(elapsed * 2.0) * 0.05;
        coreMat.color.lerp(new THREE.Color(0x14b8a6), 0.1);
        pointLight.color.lerp(new THREE.Color(0x2dd4bf), 0.1);
      }

      currentScale = THREE.MathUtils.damp(currentScale, targetScale, 6.0, delta);
      mandalaGroup.scale.set(currentScale, currentScale, currentScale);

      // Rotations
      coreMesh.rotation.y = elapsed * 0.4;
      coreMesh.rotation.x = elapsed * 0.2;

      cageMesh.rotation.y = -elapsed * 0.3;
      cageMesh.rotation.z = elapsed * 0.25;

      ringMesh1.rotation.z = elapsed * 0.5;
      ringMesh2.rotation.x = -elapsed * 0.4;

      particleRing.rotation.y = elapsed * 0.35;

      // Subtle tilt towards mouse
      mandalaGroup.rotation.y = THREE.MathUtils.damp(mandalaGroup.rotation.y, _mouseTarget.x, 4.0, delta);
      mandalaGroup.rotation.x = THREE.MathUtils.damp(mandalaGroup.rotation.x, -_mouseTarget.y, 4.0, delta);

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      container.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);

      coreGeo.dispose();
      coreMat.dispose();
      cageGeo.dispose();
      cageMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`w-full h-full min-h-[300px] flex items-center justify-center relative ${className}`}
    />
  );
};
