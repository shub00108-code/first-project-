import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AvatarId, EmotionTag } from '../../types';
import { AVATAR_FRIENDS } from '../../utils/avatarFriends';
import { Volume2, Mic, Sparkles, RefreshCw } from 'lucide-react';

export type CameraAngle = 'front' | 'threeQuarter' | 'cinema';
export type LightingPreset = 'studio' | 'sunset' | 'cyber';

interface Avatar3DStageProps {
  avatarId: AvatarId;
  isSpeaking: boolean;
  isListening?: boolean;
  emotion?: EmotionTag;
  className?: string;
  onAvatarClick?: () => void;
  cameraAngle?: CameraAngle;
  lightingPreset?: LightingPreset;
}

// Pre-allocated math helpers to ensure ZERO Garbage Collection in the render loop
const _mouseTarget = new THREE.Vector2(0, 0);

// Detect software WebGL from GPU renderer string
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

// Character specific color palette and styling for 3D meshes
const CHARACTER_3D_PALETTE: Record<AvatarId, {
  skin: number;
  skinShadow: number;
  lips: number;
  hair: number;
  hairRoughness: number;
  eyes: number;
  clothes: number;
  collar: number;
  accent: number;
  eyebrows: number;
  gender: 'male' | 'female';
}> = {
  raj: {
    skin: 0xd99b73,
    skinShadow: 0xba7b55,
    lips: 0xb56960,
    hair: 0x1f1d1d,
    hairRoughness: 0.65,
    eyes: 0x2b1d16,
    clothes: 0x1e3a8a, // Navy blue formal/smart casual shirt
    collar: 0x3b82f6,
    accent: 0x60a5fa,
    eyebrows: 0x18181b,
    gender: 'male',
  },
  aneet: {
    skin: 0xf5c29e,
    skinShadow: 0xd99e79,
    lips: 0xd95d73,
    hair: 0x1a1614,
    hairRoughness: 0.45,
    eyes: 0x3d271d,
    clothes: 0xbe123c, // Warm rose kurta
    collar: 0xfb7185,
    accent: 0xf59e0b,
    eyebrows: 0x1c1917,
    gender: 'female',
  },
  mira: {
    skin: 0xfce3d2,
    skinShadow: 0xe2b99f,
    lips: 0xd946ef, // Soft bashful pink
    hair: 0x0f172a, // Deep blue-black sleek hair
    hairRoughness: 0.35,
    eyes: 0x312e81,
    clothes: 0x312e81, // Indigo blazer / school style
    collar: 0xa5b4fc,
    accent: 0xc084fc,
    eyebrows: 0x0f172a,
    gender: 'female',
  },
  ren: {
    skin: 0xdeb897,
    skinShadow: 0xbe9575,
    lips: 0xa86759,
    hair: 0x27272a, // Messy graphite hair
    hairRoughness: 0.7,
    eyes: 0x18181b,
    clothes: 0x334155, // Relaxed slate hoodie
    collar: 0x475569,
    accent: 0x38bdf8,
    eyebrows: 0x27272a,
    gender: 'male',
  },
};

export const Avatar3DStage: React.FC<Avatar3DStageProps> = ({
  avatarId,
  isSpeaking,
  isListening = false,
  emotion = 'caring',
  className = '',
  onAvatarClick,
  cameraAngle = 'front',
  lightingPreset = 'studio',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const friend = AVATAR_FRIENDS[avatarId] || AVATAR_FRIENDS.raj;

  // Mutable refs for tracking runtime state without triggering React re-renders
  const animStateRef = useRef({
    isSpeaking,
    isListening,
    emotion,
    avatarId,
    cameraAngle,
    lightingPreset,
    userOrbitY: 0,
    mouthOpen: 0,
    blinkProgress: 0,
    isBlinking: false,
    nextBlinkTime: 2.0,
    elapsed: 0,
    mouseTarget: new THREE.Vector2(0, 0),
  });

  // Keep state in sync with props
  useEffect(() => {
    animStateRef.current.isSpeaking = isSpeaking;
    animStateRef.current.isListening = isListening;
    animStateRef.current.emotion = emotion;
    animStateRef.current.avatarId = avatarId;
    animStateRef.current.cameraAngle = cameraAngle;
    animStateRef.current.lightingPreset = lightingPreset;
  }, [isSpeaking, isListening, emotion, avatarId, cameraAngle, lightingPreset]);

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = checkIsSoftwareGl();
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 450;

    // 1. Scene, Camera, and Renderer
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 0.2, 2.65);
    camera.lookAt(0, 0.15, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Lighting Rig: Warm Key Light, Cool Fill Light, High-Rim Backlight
    const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.9);
    keyLight.position.set(1.5, 2.2, 2.2);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 512;
      keyLight.shadow.mapSize.height = 512;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xbbe1fa, 0.9);
    fillLight.position.set(-2, 1.2, 1.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xa5b4fc, 1.6);
    rimLight.position.set(0, 2.2, -2.0);
    scene.add(rimLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x475569, 0.7);
    hemiLight.position.set(0, 4, 0);
    scene.add(hemiLight);

    // 3. Grounding Contact Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(2.4, 2.4);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(64, 64, 8, 64, 64, 64);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.45)');
    grad.addColorStop(0.5, 'rgba(15, 23, 42, 0.20)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    shadowTex.colorSpace = THREE.SRGBColorSpace;
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.8,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.95;
    scene.add(shadowMesh);

    // 4. Procedural 3D Character Avatar Composite Group
    const avatarGroup = new THREE.Group();
    avatarGroup.position.set(0, -0.25, 0);
    scene.add(avatarGroup);

    const currentPalette = CHARACTER_3D_PALETTE[avatarId] || CHARACTER_3D_PALETTE.raj;

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: currentPalette.skin,
      roughness: 0.55,
      metalness: 0.05,
    });

    const skinShadowMat = new THREE.MeshStandardMaterial({
      color: currentPalette.skinShadow,
      roughness: 0.6,
      metalness: 0.05,
    });

    const lipMat = new THREE.MeshStandardMaterial({
      color: currentPalette.lips,
      roughness: 0.45,
      metalness: 0.05,
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: currentPalette.hair,
      roughness: currentPalette.hairRoughness,
      metalness: 0.15,
    });

    const eyesWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.2,
      metalness: 0.0,
    });

    const irisMat = new THREE.MeshStandardMaterial({
      color: currentPalette.eyes,
      roughness: 0.25,
      metalness: 0.1,
    });

    const pupilMat = new THREE.MeshBasicMaterial({
      color: 0x09090b,
    });

    const teethMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.05,
    });

    const mouthCavityMat = new THREE.MeshBasicMaterial({
      color: 0x3f0a15,
    });

    const clothesMat = new THREE.MeshStandardMaterial({
      color: currentPalette.clothes,
      roughness: 0.7,
      metalness: 0.05,
    });

    const collarMat = new THREE.MeshStandardMaterial({
      color: currentPalette.collar,
      roughness: 0.65,
      metalness: 0.05,
    });

    const eyebrowMat = new THREE.MeshStandardMaterial({
      color: currentPalette.eyebrows,
      roughness: 0.8,
      metalness: 0.0,
    });

    // ----------------------------------------------------
    // Body / Torso & Shoulders
    // ----------------------------------------------------
    const torsoGroup = new THREE.Group();
    avatarGroup.add(torsoGroup);

    // Shoulders base
    const torsoGeo = new THREE.CylinderGeometry(0.55, 0.75, 0.7, 24);
    const torsoMesh = new THREE.Mesh(torsoGeo, clothesMat);
    torsoMesh.position.set(0, -0.65, 0);
    torsoMesh.scale.set(1.1, 1.0, 0.65);
    torsoGroup.add(torsoMesh);

    // Collar / Lapel
    const collarGeo = new THREE.TorusGeometry(0.24, 0.06, 12, 24, Math.PI);
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.position.set(0, -0.32, 0.15);
    collarMesh.rotation.x = Math.PI * 0.45;
    torsoGroup.add(collarMesh);

    // Character specific torso accent (Mira's ribbon or Ren's hoodie strings)
    if (avatarId === 'mira') {
      const ribbonGeo = new THREE.SphereGeometry(0.045, 12, 12);
      const ribbonMat = new THREE.MeshStandardMaterial({ color: currentPalette.accent, roughness: 0.4 });
      const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
      ribbonMesh.position.set(0, -0.34, 0.22);
      torsoGroup.add(ribbonMesh);
    } else if (avatarId === 'ren') {
      const stringGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8);
      const stringMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
      const leftString = new THREE.Mesh(stringGeo, stringMat);
      leftString.position.set(-0.06, -0.42, 0.2);
      const rightString = new THREE.Mesh(stringGeo, stringMat);
      rightString.position.set(0.06, -0.42, 0.2);
      torsoGroup.add(leftString);
      torsoGroup.add(rightString);
    }

    // ----------------------------------------------------
    // Neck & Head Pivot Group (Animates with breathing and mouse tracking)
    // ----------------------------------------------------
    const headPivot = new THREE.Group();
    headPivot.position.set(0, -0.1, 0);
    avatarGroup.add(headPivot);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.35, 20);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.position.set(0, -0.15, 0);
    headPivot.add(neckMesh);

    // Main Head Geometry
    const headGeo = new THREE.SphereGeometry(0.48, 32, 32);
    // Sculpt slightly oval head
    headGeo.scale(1.0, 1.15, 1.05);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.position.set(0, 0.22, 0);
    headPivot.add(headMesh);

    // Cheek blush highlights
    const cheekGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const cheekMat = new THREE.MeshBasicMaterial({
      color: currentPalette.lips,
      transparent: true,
      opacity: avatarId === 'mira' ? 0.38 : 0.18,
    });
    const leftCheek = new THREE.Mesh(cheekGeo, cheekMat);
    leftCheek.position.set(-0.28, 0.15, 0.36);
    leftCheek.scale.set(1.2, 0.8, 0.5);
    headPivot.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeo, cheekMat);
    rightCheek.position.set(0.28, 0.15, 0.36);
    rightCheek.scale.set(1.2, 0.8, 0.5);
    headPivot.add(rightCheek);

    // Ears
    const earGeo = new THREE.SphereGeometry(0.1, 16, 16);
    earGeo.scale(0.5, 1.2, 0.8);
    const leftEar = new THREE.Mesh(earGeo, skinShadowMat);
    leftEar.position.set(-0.49, 0.22, 0);
    leftEar.rotation.y = -0.2;
    headPivot.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, skinShadowMat);
    rightEar.position.set(0.49, 0.22, 0);
    rightEar.rotation.y = 0.2;
    headPivot.add(rightEar);

    // Nose
    const noseGeo = new THREE.ConeGeometry(0.065, 0.18, 16);
    noseGeo.rotateX(Math.PI * 0.35);
    const noseMesh = new THREE.Mesh(noseGeo, skinShadowMat);
    noseMesh.position.set(0, 0.20, 0.51);
    headPivot.add(noseMesh);

    // ----------------------------------------------------
    // Eyes & Eyelids (Natural Asynchronous Blinking)
    // ----------------------------------------------------
    const eyesGroup = new THREE.Group();
    eyesGroup.position.set(0, 0.28, 0.42);
    headPivot.add(eyesGroup);

    const eyeSpacing = 0.18;
    const eyeRadius = 0.075;

    // Left Eye
    const eyeGeo = new THREE.SphereGeometry(eyeRadius, 24, 24);
    const leftEyeWhite = new THREE.Mesh(eyeGeo, eyesWhiteMat);
    leftEyeWhite.position.set(-eyeSpacing, 0, 0);
    eyesGroup.add(leftEyeWhite);

    const irisGeo = new THREE.CircleGeometry(0.042, 24);
    const leftIris = new THREE.Mesh(irisGeo, irisMat);
    leftIris.position.set(0, 0, eyeRadius * 0.98);
    leftEyeWhite.add(leftIris);

    const pupilGeo = new THREE.CircleGeometry(0.024, 20);
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(0, 0, 0.002);
    leftIris.add(leftPupil);

    const catchlightGeo = new THREE.CircleGeometry(0.012, 12);
    const catchlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftCatch = new THREE.Mesh(catchlightGeo, catchlightMat);
    leftCatch.position.set(0.015, 0.015, 0.003);
    leftIris.add(leftCatch);

    // Right Eye
    const rightEyeWhite = new THREE.Mesh(eyeGeo, eyesWhiteMat);
    rightEyeWhite.position.set(eyeSpacing, 0, 0);
    eyesGroup.add(rightEyeWhite);

    const rightIris = new THREE.Mesh(irisGeo, irisMat);
    rightIris.position.set(0, 0, eyeRadius * 0.98);
    rightEyeWhite.add(rightIris);

    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0, 0, 0.002);
    rightIris.add(rightPupil);

    const rightCatch = new THREE.Mesh(catchlightGeo, catchlightMat);
    rightCatch.position.set(0.015, 0.015, 0.003);
    rightIris.add(rightCatch);

    // Eyelids (Blinking Shells that sweep down)
    const eyelidGeo = new THREE.SphereGeometry(eyeRadius * 1.05, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const leftEyelid = new THREE.Mesh(eyelidGeo, skinMat);
    leftEyelid.position.set(-eyeSpacing, 0, 0);
    leftEyelid.rotation.x = -Math.PI * 0.55; // Open by default
    eyesGroup.add(leftEyelid);

    const rightEyelid = new THREE.Mesh(eyelidGeo, skinMat);
    rightEyelid.position.set(eyeSpacing, 0, 0);
    rightEyelid.rotation.x = -Math.PI * 0.55; // Open by default
    eyesGroup.add(rightEyelid);

    // ----------------------------------------------------
    // Eyebrows (Expressive Emotion Tilt)
    // ----------------------------------------------------
    const eyebrowGeo = new THREE.BoxGeometry(0.14, 0.03, 0.04);
    const leftEyebrow = new THREE.Mesh(eyebrowGeo, eyebrowMat);
    leftEyebrow.position.set(-eyeSpacing, 0.12, 0.44);
    leftEyebrow.rotation.z = 0.08;
    headPivot.add(leftEyebrow);

    const rightEyebrow = new THREE.Mesh(eyebrowGeo, eyebrowMat);
    rightEyebrow.position.set(eyeSpacing, 0.12, 0.44);
    rightEyebrow.rotation.z = -0.08;
    headPivot.add(rightEyebrow);

    // ----------------------------------------------------
    // DYNAMIC TALKING LIPS & JAW (Real-Time Lip Sync Engine)
    // ----------------------------------------------------
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, 0.02, 0.46);
    headPivot.add(mouthGroup);

    // Mouth cavity interior
    const cavityGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16);
    cavityGeo.rotateX(Math.PI / 2);
    const cavityMesh = new THREE.Mesh(cavityGeo, mouthCavityMat);
    cavityMesh.position.set(0, 0, -0.02);
    mouthGroup.add(cavityMesh);

    // Upper Teeth
    const teethGeo = new THREE.BoxGeometry(0.12, 0.03, 0.02);
    const upperTeeth = new THREE.Mesh(teethGeo, teethMat);
    upperTeeth.position.set(0, 0.02, -0.01);
    mouthGroup.add(upperTeeth);

    // Lower Teeth (moves with jaw)
    const lowerTeeth = new THREE.Mesh(teethGeo, teethMat);
    lowerTeeth.position.set(0, -0.02, -0.01);
    mouthGroup.add(lowerTeeth);

    // Upper Lip Mesh
    const upperLipGeo = new THREE.TorusGeometry(0.09, 0.022, 12, 24, Math.PI);
    const upperLipMesh = new THREE.Mesh(upperLipGeo, lipMat);
    upperLipMesh.rotation.z = Math.PI;
    upperLipMesh.position.set(0, 0.01, 0.02);
    mouthGroup.add(upperLipMesh);

    // Lower Lip Mesh (Animated with speech)
    const lowerLipGeo = new THREE.TorusGeometry(0.09, 0.025, 12, 24, Math.PI);
    const lowerLipMesh = new THREE.Mesh(lowerLipGeo, lipMat);
    lowerLipMesh.position.set(0, -0.015, 0.02);
    mouthGroup.add(lowerLipMesh);

    // Jaw mesh (subtle chin movement when speaking)
    const chinGeo = new THREE.SphereGeometry(0.14, 16, 16);
    chinGeo.scale(1.2, 0.9, 0.9);
    const chinMesh = new THREE.Mesh(chinGeo, skinMat);
    chinMesh.position.set(0, -0.14, 0.38);
    mouthGroup.add(chinMesh);

    // ----------------------------------------------------
    // Character-Specific 3D Hair Structures
    // ----------------------------------------------------
    const hairGroup = new THREE.Group();
    headPivot.add(hairGroup);

    if (avatarId === 'raj') {
      // Raj: Neat adult gentleman haircut, cropped on sides, swept on top
      const topHairGeo = new THREE.SphereGeometry(0.51, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.55);
      topHairGeo.scale(1.02, 1.08, 1.02);
      const topHair = new THREE.Mesh(topHairGeo, hairMat);
      topHair.position.set(0, 0.26, -0.02);
      hairGroup.add(topHair);

      // Side sweep tuft
      const sweepGeo = new THREE.BoxGeometry(0.35, 0.12, 0.25);
      const sweepMesh = new THREE.Mesh(sweepGeo, hairMat);
      sweepMesh.position.set(0.12, 0.54, 0.28);
      sweepMesh.rotation.z = -0.15;
      sweepMesh.rotation.y = 0.2;
      hairGroup.add(sweepMesh);
    } else if (avatarId === 'aneet') {
      // Aneet: Long flowing graceful hair framing her face and back
      const crownGeo = new THREE.SphereGeometry(0.52, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const crownMesh = new THREE.Mesh(crownGeo, hairMat);
      crownMesh.position.set(0, 0.26, -0.02);
      hairGroup.add(crownMesh);

      // Left flowing locks
      const lockGeo = new THREE.CylinderGeometry(0.08, 0.14, 0.75, 12);
      const leftLock = new THREE.Mesh(lockGeo, hairMat);
      leftLock.position.set(-0.38, -0.08, 0.12);
      leftLock.rotation.z = 0.15;
      hairGroup.add(leftLock);

      // Right flowing locks
      const rightLock = new THREE.Mesh(lockGeo, hairMat);
      rightLock.position.set(0.38, -0.08, 0.12);
      rightLock.rotation.z = -0.15;
      hairGroup.add(rightLock);

      // Back cascade
      const backGeo = new THREE.CylinderGeometry(0.38, 0.48, 0.8, 16);
      const backMesh = new THREE.Mesh(backGeo, hairMat);
      backMesh.position.set(0, -0.15, -0.22);
      hairGroup.add(backMesh);
    } else if (avatarId === 'mira') {
      // Mira: 18-year-old sleek straight dark hair with neat front bangs
      const crownGeo = new THREE.SphereGeometry(0.52, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.58);
      const crownMesh = new THREE.Mesh(crownGeo, hairMat);
      crownMesh.position.set(0, 0.26, -0.02);
      hairGroup.add(crownMesh);

      // Straight neat bangs across forehead
      const bangsGeo = new THREE.BoxGeometry(0.52, 0.14, 0.18);
      const bangsMesh = new THREE.Mesh(bangsGeo, hairMat);
      bangsMesh.position.set(0, 0.44, 0.42);
      bangsMesh.rotation.x = 0.25;
      hairGroup.add(bangsMesh);

      // Long side hime locks
      const himeGeo = new THREE.BoxGeometry(0.12, 0.7, 0.12);
      const leftHime = new THREE.Mesh(himeGeo, hairMat);
      leftHime.position.set(-0.42, -0.02, 0.22);
      hairGroup.add(leftHime);

      const rightHime = new THREE.Mesh(himeGeo, hairMat);
      rightHime.position.set(0.42, -0.02, 0.22);
      hairGroup.add(rightHime);

      // Long straight hair in back
      const backGeo = new THREE.BoxGeometry(0.72, 0.85, 0.18);
      const backHair = new THREE.Mesh(backGeo, hairMat);
      backHair.position.set(0, -0.12, -0.26);
      hairGroup.add(backHair);
    } else {
      // Ren: Messy, relaxed, textured anime/realist hair tufts
      const baseGeo = new THREE.SphereGeometry(0.52, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const baseMesh = new THREE.Mesh(baseGeo, hairMat);
      baseMesh.position.set(0, 0.26, -0.02);
      hairGroup.add(baseMesh);

      // Ruffled tufts
      const tuftGeo = new THREE.ConeGeometry(0.14, 0.32, 8);
      const tufts = [
        { pos: [-0.15, 0.52, 0.35], rot: [0.3, 0.2, 0.4] },
        { pos: [0.12, 0.54, 0.36], rot: [0.2, -0.3, -0.3] },
        { pos: [0.32, 0.42, 0.28], rot: [0.1, -0.4, -0.6] },
        { pos: [-0.34, 0.42, 0.28], rot: [0.1, 0.4, 0.6] },
        { pos: [0.0, 0.58, 0.2], rot: [0.4, 0.0, 0.1] },
      ];
      tufts.forEach((t) => {
        const m = new THREE.Mesh(tuftGeo, hairMat);
        m.position.set(t.pos[0], t.pos[1], t.pos[2]);
        m.rotation.set(t.rot[0], t.rot[1], t.rot[2]);
        hairGroup.add(m);
      });
    }

    // ----------------------------------------------------
    // Pointer Mouse Tracking & Interactive Drag Orbit
    // ----------------------------------------------------
    let isDragging = false;
    let startPointerX = 0;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      isDragging = true;
      startPointerX = e.clientX;
      try {
        container.setPointerCapture(e.pointerId);
      } catch {}
    };

    const handleContainerPointerMove = (e: PointerEvent) => {
      if (isDragging) {
        const dx = e.clientX - startPointerX;
        startPointerX = e.clientX;
        animStateRef.current.userOrbitY += dx * 0.007;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      isDragging = false;
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {}
    };

    const handleDblClick = () => {
      animStateRef.current.userOrbitY = 0;
    };

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handleContainerPointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointercancel', handlePointerUp);
    container.addEventListener('dblclick', handleDblClick);

    const handlePointerMove = (e: MouseEvent | PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      animStateRef.current.mouseTarget.set(
        THREE.MathUtils.clamp(x * 0.45, -0.35, 0.35),
        THREE.MathUtils.clamp(y * 0.35, -0.25, 0.25)
      );
    };

    window.addEventListener('pointermove', handlePointerMove);

    // ----------------------------------------------------
    // Resize Handler
    // ----------------------------------------------------
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 400;
      const newH = container.clientHeight || 450;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    // ----------------------------------------------------
    // Main Animation Loop
    // ----------------------------------------------------
    let frameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.1);
      const state = animStateRef.current;
      state.elapsed += delta;
      const time = state.elapsed;

      // 0. Dynamic Camera Angle Interpolation
      let targetCamX = 0;
      let targetCamY = 0.2;
      let targetCamZ = 2.65;

      if (state.cameraAngle === 'threeQuarter') {
        targetCamX = 0.65;
        targetCamY = 0.22;
        targetCamZ = 2.5;
      } else if (state.cameraAngle === 'cinema') {
        targetCamX = Math.sin(time * 0.35) * 0.42;
        targetCamY = 0.2 + Math.cos(time * 0.25) * 0.08;
        targetCamZ = 2.55;
      }

      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 3.5, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 3.5, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, 3.5, delta);
      camera.lookAt(0, 0.15, 0);

      // Dynamic Lighting Presets
      if (state.lightingPreset === 'sunset') {
        keyLight.color.lerp(new THREE.Color(0xf59e0b), 0.05);
        fillLight.color.lerp(new THREE.Color(0xf43f5e), 0.05);
        rimLight.color.lerp(new THREE.Color(0xfbbf24), 0.05);
      } else if (state.lightingPreset === 'cyber') {
        keyLight.color.lerp(new THREE.Color(0x06b6d4), 0.05);
        fillLight.color.lerp(new THREE.Color(0xa855f7), 0.05);
        rimLight.color.lerp(new THREE.Color(0x10b981), 0.05);
      } else {
        keyLight.color.lerp(new THREE.Color(0xfff5e6), 0.05);
        fillLight.color.lerp(new THREE.Color(0xbbe1fa), 0.05);
        rimLight.color.lerp(new THREE.Color(0xffffff), 0.05);
      }

      // User 3D Drag Orbit
      avatarGroup.rotation.y = THREE.MathUtils.damp(avatarGroup.rotation.y, state.userOrbitY, 6.0, delta);

      // 1. Natural Breathing Motion on Torso & Base
      const breathingY = Math.sin(time * 2.2) * 0.015;
      torsoGroup.position.y = breathingY;
      headPivot.position.y = -0.1 + breathingY * 0.8;

      // 2. Head Orientation: Soft Damped Mouse Cursor Follow
      headPivot.rotation.y = THREE.MathUtils.damp(headPivot.rotation.y, state.mouseTarget.x, 4.0, delta);
      headPivot.rotation.x = THREE.MathUtils.damp(headPivot.rotation.x, -state.mouseTarget.y, 4.0, delta);

      // 3. Listening State: Gentle forward tilt and soft nod
      if (state.isListening) {
        headPivot.rotation.x += Math.sin(time * 3.5) * 0.035;
        headPivot.rotation.z = THREE.MathUtils.damp(headPivot.rotation.z, 0.05, 3.0, delta);
      } else {
        headPivot.rotation.z = THREE.MathUtils.damp(headPivot.rotation.z, 0, 3.0, delta);
      }

      // 4. Eyes Gaze Tracking
      leftEyeWhite.rotation.y = state.mouseTarget.x * 0.4;
      leftEyeWhite.rotation.x = -state.mouseTarget.y * 0.35;
      rightEyeWhite.rotation.y = state.mouseTarget.x * 0.4;
      rightEyeWhite.rotation.x = -state.mouseTarget.y * 0.35;

      // 5. Asynchronous Eye Blinking Engine
      if (!state.isBlinking && time >= state.nextBlinkTime) {
        state.isBlinking = true;
        state.blinkProgress = 0;
      }

      if (state.isBlinking) {
        state.blinkProgress += delta * 9.0; // Fast natural blink (approx 0.11s)
        const blinkAngle = Math.sin(state.blinkProgress * Math.PI);
        const rot = THREE.MathUtils.lerp(-Math.PI * 0.55, 0.05, Math.max(0, blinkAngle));
        leftEyelid.rotation.x = rot;
        rightEyelid.rotation.x = rot;

        if (state.blinkProgress >= 1.0) {
          state.isBlinking = false;
          leftEyelid.rotation.x = -Math.PI * 0.55;
          rightEyelid.rotation.x = -Math.PI * 0.55;
          state.nextBlinkTime = time + 3.0 + Math.random() * 3.5;
        }
      }

      // 6. REAL-TIME LIP SYNC & TALKING JAW MOVEMENT
      if (state.isSpeaking) {
        // Multi-frequency speech mouth shape oscillation simulating natural speech phonemes
        const speechEnvelope = (Math.sin(time * 18.0) * 0.5 + 0.5) * (Math.cos(time * 7.5) * 0.3 + 0.7);
        const targetOpen = 0.035 + speechEnvelope * 0.07;
        state.mouthOpen = THREE.MathUtils.damp(state.mouthOpen, targetOpen, 14.0, delta);

        // Lower lip and jaw depress
        lowerLipMesh.position.y = -0.015 - state.mouthOpen;
        lowerTeeth.position.y = -0.02 - state.mouthOpen * 0.8;
        chinMesh.position.y = -0.14 - state.mouthOpen * 0.5;

        // Upper lip subtle lift
        upperLipMesh.position.y = 0.01 + state.mouthOpen * 0.25;

        // Subtle mouth widening
        const mouthScaleX = 1.0 + Math.sin(time * 14.0) * 0.15;
        mouthGroup.scale.x = THREE.MathUtils.damp(mouthGroup.scale.x, mouthScaleX, 10.0, delta);

        // Subtle speech head micro-nods
        headPivot.rotation.x += Math.sin(time * 12.0) * 0.008;
      } else {
        // Natural resting lips
        state.mouthOpen = THREE.MathUtils.damp(state.mouthOpen, 0, 10.0, delta);
        lowerLipMesh.position.y = THREE.MathUtils.damp(lowerLipMesh.position.y, -0.015, 10.0, delta);
        lowerTeeth.position.y = THREE.MathUtils.damp(lowerTeeth.position.y, -0.02, 10.0, delta);
        chinMesh.position.y = THREE.MathUtils.damp(chinMesh.position.y, -0.14, 10.0, delta);
        upperLipMesh.position.y = THREE.MathUtils.damp(upperLipMesh.position.y, 0.01, 10.0, delta);
        mouthGroup.scale.x = THREE.MathUtils.damp(mouthGroup.scale.x, 1.0, 10.0, delta);
      }

      // 7. Expressive Eyebrow Tilt based on Emotion
      let eyebrowTiltTarget = 0.08;
      if (state.emotion === 'happy' || state.emotion === 'excited') {
        eyebrowTiltTarget = 0.14;
      } else if (state.emotion === 'worried' || state.emotion === 'serious') {
        eyebrowTiltTarget = -0.04;
      } else if (state.emotion === 'comforting' || state.emotion === 'caring') {
        eyebrowTiltTarget = 0.11;
      }
      leftEyebrow.rotation.z = THREE.MathUtils.damp(leftEyebrow.rotation.z, eyebrowTiltTarget, 4.0, delta);
      rightEyebrow.rotation.z = THREE.MathUtils.damp(rightEyebrow.rotation.z, -eyebrowTiltTarget, 4.0, delta);

      // Render Scene
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    // ----------------------------------------------------
    // Cleanup on Component Unmount
    // ----------------------------------------------------
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handleContainerPointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('pointercancel', handlePointerUp);
      container.removeEventListener('dblclick', handleDblClick);

      // Clean up geometries & materials to avoid WebGL memory leaks
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });

      shadowTex.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [avatarId]);

  return (
    <div
      className={`relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden ${className}`}
      onClick={onAvatarClick}
    >
      {/* 3D Canvas Mount Point */}
      <div
        ref={mountRef}
        className="w-full h-full min-h-[280px] sm:min-h-[340px] flex items-center justify-center cursor-pointer"
        title="3D Interactive Avatar - moves eyes and lips dynamically"
      />

      {/* Floating 3D Interactive Badge */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-[11px] font-semibold text-slate-200 shadow-md pointer-events-none">
        <Sparkles className="w-3.5 h-3.5 text-teal-400" />
        <span>3D Real-time Lip Sync</span>
      </div>

      {/* Dynamic Voice Status Pill in 3D Canvas */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-sm pointer-events-none">
        <span
          className={`w-2 h-2 rounded-full ${
            isSpeaking ? 'bg-emerald-500' : isListening ? 'bg-rose-500' : 'bg-teal-500'
          }`}
        />
        <span>{isSpeaking ? 'Speaking' : isListening ? 'Listening' : 'Ready'}</span>
      </div>
    </div>
  );
};
