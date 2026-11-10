import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AvatarId } from '../../types';

interface Spatial3DCanvasProps {
  activeAvatarId?: AvatarId;
  enabled?: boolean;
}

// Module-level pre-allocated math helpers to ensure ZERO GC in render loop
const _mouseTarget = new THREE.Vector2(0, 0);
const _mouseCurrent = new THREE.Vector2(0, 0);

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

// Ambient colors matching the companion themes
const COMPANION_PALETTES: Record<AvatarId, { primary: number; secondary: number; particles: number; light: number }> = {
  raj: {
    primary: 0x3b82f6,
    secondary: 0x1d4ed8,
    particles: 0x93c5fd,
    light: 0x60a5fa,
  },
  aneet: {
    primary: 0xf43f5e,
    secondary: 0xf59e0b,
    particles: 0xfecdd3,
    light: 0xfb7185,
  },
  mira: {
    primary: 0x6366f1,
    secondary: 0x8b5cf6,
    particles: 0xc4b5fd,
    light: 0xa78bfa,
  },
  ren: {
    primary: 0x0ea5e9,
    secondary: 0x475569,
    particles: 0xbae6fd,
    light: 0x38bdf8,
  },
};

export const Spatial3DCanvas: React.FC<Spatial3DCanvasProps> = ({
  activeAvatarId = 'raj',
  enabled = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const activeAvatarRef = useRef(activeAvatarId);

  useEffect(() => {
    activeAvatarRef.current = activeAvatarId;
  }, [activeAvatarId]);

  useEffect(() => {
    if (!enabled) return;
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = checkIsSoftwareGl();
    let width = window.innerWidth;
    let height = window.innerHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xf8fafc, 0.05);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // 2. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    const themeLight = new THREE.PointLight(
      COMPANION_PALETTES[activeAvatarId]?.primary || 0x3b82f6,
      2.0,
      15
    );
    themeLight.position.set(-4, -2, 3);
    scene.add(themeLight);

    // 3. Floating 3D Geometric Wellness Objects
    const floatingGroup = new THREE.Group();
    scene.add(floatingGroup);

    // Geometry & Material creations to track for cleanup
    const disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] } = {
      geometries: [],
      materials: [],
    };

    // Soft glass / physical orbs
    const orbGeo = new THREE.SphereGeometry(0.8, 32, 32);
    disposables.geometries.push(orbGeo);

    const currentPalette = COMPANION_PALETTES[activeAvatarId] || COMPANION_PALETTES.raj;

    const orbMat1 = new THREE.MeshStandardMaterial({
      color: currentPalette.primary,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.45,
    });
    disposables.materials.push(orbMat1);

    const orb1 = new THREE.Mesh(orbGeo, orbMat1);
    orb1.position.set(-3.2, 1.8, -1.5);
    floatingGroup.add(orb1);

    const orbMat2 = new THREE.MeshStandardMaterial({
      color: currentPalette.secondary,
      roughness: 0.2,
      metalness: 0.2,
      transparent: true,
      opacity: 0.35,
    });
    disposables.materials.push(orbMat2);

    const orb2 = new THREE.Mesh(orbGeo, orbMat2);
    orb2.scale.set(0.65, 0.65, 0.65);
    orb2.position.set(3.4, -1.6, -1.0);
    floatingGroup.add(orb2);

    // Zen Torus Ring
    const torusGeo = new THREE.TorusGeometry(1.2, 0.18, 24, 48);
    disposables.geometries.push(torusGeo);

    const torusMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.5,
      transparent: true,
      opacity: 0.35,
    });
    disposables.materials.push(torusMat);

    const torus = new THREE.Mesh(torusGeo, torusMat);
    torus.position.set(3.6, 2.0, -2.5);
    torus.rotation.x = Math.PI * 0.3;
    floatingGroup.add(torus);

    // Small ambient torus
    const torusSmallGeo = new THREE.TorusGeometry(0.7, 0.1, 16, 32);
    disposables.geometries.push(torusSmallGeo);
    const torusSmall = new THREE.Mesh(torusSmallGeo, torusMat);
    torusSmall.position.set(-3.5, -2.2, -2.0);
    floatingGroup.add(torusSmall);

    // 4. Ambient 3D Star/Wellness Dust Particles
    const particleCount = isSoftwareGl ? 60 : 140;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      scales[i] = Math.random() * 0.08 + 0.03;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    disposables.geometries.push(particleGeo);

    // Particle sprite using canvas texture to avoid any external 404
    const particleCanvas = document.createElement('canvas');
    particleCanvas.width = 32;
    particleCanvas.height = 32;
    const pctx = particleCanvas.getContext('2d')!;
    const grad = pctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    pctx.fillStyle = grad;
    pctx.fillRect(0, 0, 32, 32);

    const particleTexture = new THREE.CanvasTexture(particleCanvas);
    particleTexture.colorSpace = THREE.SRGBColorSpace;

    const particleMat = new THREE.PointsMaterial({
      size: 0.25,
      map: particleTexture,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    disposables.materials.push(particleMat);

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 5. Mouse Interaction for 3D Camera Parallax
    const handlePointerMove = (e: MouseEvent) => {
      _mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
      _mouseTarget.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // 6. Resize Handler
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // 7. Render Loop
    let frameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // Damped camera parallax follow
      _mouseCurrent.x = THREE.MathUtils.damp(_mouseCurrent.x, _mouseTarget.x, 2.5, delta);
      _mouseCurrent.y = THREE.MathUtils.damp(_mouseCurrent.y, _mouseTarget.y, 2.5, delta);

      camera.position.x = _mouseCurrent.x * 0.7;
      camera.position.y = _mouseCurrent.y * 0.45;
      camera.lookAt(0, 0, 0);

      // Smooth floating rotations
      torus.rotation.x = elapsed * 0.25;
      torus.rotation.y = elapsed * 0.35;
      torusSmall.rotation.x = -elapsed * 0.3;
      torusSmall.rotation.z = elapsed * 0.2;

      orb1.position.y = 1.8 + Math.sin(elapsed * 0.8) * 0.25;
      orb2.position.y = -1.6 + Math.cos(elapsed * 0.9) * 0.2;

      // Particle gentle drift
      particles.rotation.y = elapsed * 0.04;
      particles.rotation.x = Math.sin(elapsed * 0.02) * 0.08;

      // Dynamically interpolate theme lighting to match active companion
      const activePalette = COMPANION_PALETTES[activeAvatarRef.current] || COMPANION_PALETTES.raj;
      orbMat1.color.lerp(new THREE.Color(activePalette.primary), 0.05);
      orbMat2.color.lerp(new THREE.Color(activePalette.secondary), 0.05);
      themeLight.color.lerp(new THREE.Color(activePalette.light), 0.05);

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);

      disposables.geometries.forEach((g) => g.dispose());
      disposables.materials.forEach((m) => m.dispose());
      particleTexture.dispose();
      renderer.dispose();

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-60 transition-opacity duration-1000"
      aria-hidden="true"
    />
  );
};
