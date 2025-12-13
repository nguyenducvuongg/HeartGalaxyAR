import { state } from "./state.js";
import { CONFIG } from "./constants.js";
import {
  scene,
  camera,
  renderer,
  controls,
  widthAtZero,
  heightAtZero,
} from "./scene.js";
import {
  initParticles,
  particleSystem,
  particleGeometry,
  posText1,
  posText2,
  posText3,
  posText4,
  posText5,
  posScatter,
} from "./particles.js";
import { initGalaxy, galaxySystem, galaxyMaterial } from "./galaxy.js";
import {
  initHeart,
  heartSystem,
  heartMaterial,
  heartGeometry,
  heartBasePositions,
  heartParticleCount,
} from "./heart.js";
import { setupUI, initCardSystem, updateUI } from "./ui.js";
import { setupVoice } from "./voice.js";
import { onResults, getLabel, getWeights } from "./gestures.js";

// === INITIALIZATION ===

initParticles(scene);
initGalaxy(scene);
initHeart(scene);
setupUI(updateUI);
setupVoice();
initCardSystem();

// === BLACK HOLE RING MESH ===
const ringGeometry = new THREE.RingGeometry(0.5, 1, 64);
const ringMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.6,
});
const blackHoleRing = new THREE.Mesh(ringGeometry, ringMaterial);
blackHoleRing.position.set(0, 0, 0);
blackHoleRing.rotation.x = Math.PI / 2; // Face camera
blackHoleRing.visible = false;
scene.add(blackHoleRing);

// === CAMERA SETUP ===
const videoElement = document.getElementById("webcam-preview");
const loading = document.getElementById("loading");

const hands = new Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  },
});

hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

hands.onResults(onResults);

let cameraFeed = null;
if (videoElement) {
  cameraFeed = new Camera(videoElement, {
    onFrame: async () => {
      await hands.send({ image: videoElement });
    },
    width: 1280,
    height: 720,
  });
}

async function startCamera() {
  try {
    if (loading) loading.innerHTML = "Requesting Camera Access...";
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        "Browser API 'navigator.mediaDevices.getUserMedia' not available"
      );
    }

    // Yêu cầu quyền rõ ràng trước để gỡ lỗi
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());

    if (loading) loading.innerHTML = "Starting MediaPipe Camera...";
    if (cameraFeed) await cameraFeed.start();
  } catch (err) {
    console.error("Camera Error:", err);
    if (loading)
      loading.innerHTML = `Camera not found (${err.name}).<br>Switching to <b>Mouse Interaction Mode</b>.`;
    setTimeout(() => {
      if (loading) loading.style.display = "none";
      activateMouseMode();
    }, 2500);
  }
}

let isMouseMode = false;
function activateMouseMode() {
  isMouseMode = true;
  state.isHandDetected = true; // Luôn "phát hiện" tay trong chế độ chuột

  const camWrapper = document.getElementById("camera-wrapper");
  if (camWrapper) {
    camWrapper.style.display = "flex";
    camWrapper.style.justifyContent = "center";
    camWrapper.style.alignItems = "center";
    camWrapper.style.background = "rgba(20, 20, 20, 0.8)";
    camWrapper.style.border = "1px solid #444";

    // Thêm văn bản giữ chỗ nếu chưa tồn tại
    if (!document.getElementById("no-cam-msg")) {
      const msg = document.createElement("div");
      msg.id = "no-cam-msg";
      msg.innerHTML = "NO CAMERA<br>Mouse Mode";
      msg.style.color = "#aaa";
      msg.style.textAlign = "center";
      msg.style.fontSize = "12px";
      msg.style.position = "absolute";
      camWrapper.appendChild(msg);
    }
  }

  const video = document.getElementById("webcam-preview");
  if (video) video.style.opacity = "0.1";

  window.addEventListener("mousemove", (event) => {
    const vec = new THREE.Vector3();
    const pos = new THREE.Vector3();

    vec.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1,
      0.5
    );

    vec.unproject(camera);
    vec.sub(camera.position).normalize();

    const distance = -camera.position.z / vec.z;
    pos.copy(camera.position).add(vec.multiplyScalar(distance));

    state.handPositions = [pos];

    state.handPositionRaw.x = event.clientX / window.innerWidth;
    state.handPositionRaw.y = event.clientY / window.innerHeight;
  });

  let gestureIndex = 0;
  window.addEventListener("click", () => {
    if (state.voiceModeActive) return;

    gestureIndex = (gestureIndex + 1) % 5; // 0 to 4
    const g = gestureIndex;

    if (g === 0) {
      state.targetGestureLabel = "Mouse Click: Scatter";
      state.spreadTarget = 1.0;
      state.galaxyEffectActive = false;
    } else {
      state.targetGestureLabel = "Mouse Click: " + getLabel(g);
      state.spreadTarget = 0.0;
      state.targetWeights = getWeights(g);
      state.galaxyEffectActive = g === 4;
    }
    updateUI();
  });

  const uiContent = document.getElementById("ui-content");
  if (uiContent) {
    const helpText = uiContent.querySelector('div[style*="font-size: 11px"]');
    if (helpText) {
      helpText.innerHTML = `
                    <b>Mouse Mode Active:</b><br>
                    🖱️ Move mouse to interact<br>
                    🖱️ Click to cycle gestures<br>
                    (I -> MISS -> YOU -> ...)<br>
                    <br>
                    <b>Voice Mode:</b><br>
                    🎤 Still works if Mic is available
                `;
    }
  }
}

// Start Camera
startCamera();

// === ANIMATION LOOP ===

function animate() {
  requestAnimationFrame(animate);

  const camWrapper = document.getElementById("camera-wrapper");

  // Xử lý Chuyển đổi Chế độ AR
  if (state.voiceModeActive !== state.wasVoiceModeActive) {
    if (state.voiceModeActive) {
      if (camWrapper) {
          camWrapper.classList.add("fullscreen");
          camWrapper.style.top = "";
          camWrapper.style.left = "";
          camWrapper.style.bottom = "";
          camWrapper.style.right = "";
      }
      if (!isMouseMode) {
        scene.background = null;
      } else {
        scene.background = new THREE.Color(0x050505);
      }
    } else {
      if (camWrapper) {
          camWrapper.classList.remove("fullscreen");
          if (!camWrapper.style.top) {
            camWrapper.style.bottom = "15px";
            camWrapper.style.right = "15px";
          }
      }
      scene.background = new THREE.Color(0x050505);
    }
    state.wasVoiceModeActive = state.voiceModeActive;
  }

  // Nội suy
  state.currentSpread += (state.spreadTarget - state.currentSpread) * 0.08;
  state.currentScatterScale +=
    (state.scatterScaleTarget - state.currentScatterScale) * 0.1;

  for (let i = 0; i < 5; i++) {
    state.currentWeights[i] +=
      (state.targetWeights[i] - state.currentWeights[i]) * 0.1;
  }

  // Xoay Tay
  const targetRotY = (state.handPositionRaw.x - 0.5) * 1.5;
  const targetRotX = (state.handPositionRaw.y - 0.5) * 1.5;
  particleSystem.rotation.y += (targetRotY - particleSystem.rotation.y) * 0.1;
  particleSystem.rotation.x += (targetRotX - particleSystem.rotation.x) * 0.1;

  // Xoay Thiên Hà (độc lập)
  galaxySystem.rotation.y += 0.002;
  galaxySystem.rotation.x += 0.001;

  const positionsArray = particleGeometry.attributes.position.array;
  const colorsArray = particleGeometry.attributes.color.array;

  const time = Date.now() * 0.001;

  const w1 = state.currentWeights[0];
  const w2 = state.currentWeights[1];
  const w3 = state.currentWeights[2];
  const w4 = state.currentWeights[3];
  const w5 = state.currentWeights[4];

  const interactionRadSq = CONFIG.interactionRadius * CONFIG.interactionRadius;

  for (let i = 0; i < CONFIG.particleCount; i++) {
    // 1. Tính toán Mục tiêu
    const p1 = posText1[i];
    const p2 = posText2[i];
    const p3 = posText3[i];
    const p4 = posText4[i];
    const p5 = posText5[i]; // Dynamic Text

    const tx = p1.x * w1 + p2.x * w2 + p3.x * w3 + p4.x * w4 + p5.x * w5;
    const ty = p1.y * w1 + p2.y * w2 + p3.y * w3 + p4.y * w4 + p5.y * w5;
    const tz = p1.z * w1 + p2.z * w2 + p3.z * w3 + p4.z * w4 + p5.z * w5;

    // 2. Phân tán
    const s = posScatter[i];
    const sX = s.x * state.currentScatterScale;
    const sY = s.y * state.currentScatterScale;
    const sZ = s.z * state.currentScatterScale;

    const noiseScale = 0.5 * state.currentScatterScale;
    const nX = Math.sin(time + i * 0.1) * noiseScale;
    const nY = Math.cos(time + i * 0.13) * noiseScale;

    // 3. Pha trộn
    let finalX = THREE.MathUtils.lerp(tx, sX + nX, state.currentSpread);
    let finalY = THREE.MathUtils.lerp(ty, sY + nY, state.currentSpread);
    let finalZ = THREE.MathUtils.lerp(tz, sZ, state.currentSpread);

    // 4. Tương tác Vật lý (Đa điểm chạm)
    if (state.voiceModeActive && state.handPositions.length > 0) {
      for (const hPos of state.handPositions) {
        const dx = finalX - hPos.x;
        const dy = finalY - hPos.y;
        const dz = finalZ - hPos.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < interactionRadSq) {
          const dist = Math.sqrt(distSq);
          const force =
            (CONFIG.interactionRadius - dist) / CONFIG.interactionRadius;

          // Logic đẩy lùi mạnh hơn
          const repulsion = Math.pow(force, 2) * CONFIG.repulsionStrength;

          finalX += (dx / dist) * repulsion * 5;
          finalY += (dy / dist) * repulsion * 5;
          finalZ += (dz / dist) * repulsion * 5;
        }
      }
    }

    // 5. BLACK HOLE EFFECT: Realistic Gravitational Pull (Interstellar-style)
    if (state.blackHoleActive) {
      const centerX = 0;
      const centerY = 0;
      const centerZ = 0;
      
      const dx = centerX - finalX;
      const dy = centerY - finalY;
      const dz = centerZ - finalZ;
      const distSq = dx * dx + dy * dy + dz * dz;
      const dist = Math.sqrt(distSq) + 0.001; // Very small epsilon for extreme pull
      
      // Time-based progression for dramatic buildup
      const elapsed = Date.now() - state.blackHoleStart;
      const progress = Math.min(elapsed / 3000, 1);
      
      // ENHANCED GRAVITY: Much stronger pull with exponential growth
      // Starts at 100, grows exponentially to 500 at full power
      const gravitationalConstant = 100 * Math.pow(5, progress); // 100 -> 500
      
      // Inverse square law with enhanced close-range attraction
      // Particles very close to center get sucked in extremely fast
      const gravity = gravitationalConstant / (dist * dist + 0.1);
      
      // Event horizon effect: extreme pull when very close
      const eventHorizonRadius = 3;
      let eventHorizonBoost = 1;
      if (dist < eventHorizonRadius) {
        eventHorizonBoost = 1 + (eventHorizonRadius - dist) * 2;
      }
      
      // Radial inward force with event horizon boost
      const radialForceX = (dx / dist) * gravity * eventHorizonBoost;
      const radialForceY = (dy / dist) * gravity * eventHorizonBoost;
      const radialForceZ = (dz / dist) * gravity * eventHorizonBoost;
      
      // ENHANCED ORBITAL MOTION: Faster rotation for dramatic spiral
      // Tangential velocity perpendicular to radial direction
      const tangentialX = -dy;
      const tangentialY = dx;
      const tangentialZ = 0;
      
      // Normalize tangential vector
      const tangentialMag = Math.sqrt(tangentialX * tangentialX + tangentialY * tangentialY) + 0.01;
      const tangentialNormX = tangentialX / tangentialMag;
      const tangentialNormY = tangentialY / tangentialMag;
      
      // Orbital velocity: faster as particles approach center (Kepler + boost)
      // Increases dramatically with progress for intense spin
      const orbitalSpeed = Math.sqrt(gravitationalConstant / dist) * (1.2 + progress * 0.8);
      
      const orbitalForceX = tangentialNormX * orbitalSpeed;
      const orbitalForceY = tangentialNormY * orbitalSpeed;
      
      // Combine forces: radial pull + orbital rotation = spiral accretion
      finalX += radialForceX + orbitalForceX;
      finalY += radialForceY + orbitalForceY;
      finalZ += radialForceZ;
      
      // Add Z-axis compression (flattening into disk)
      finalZ *= 0.95;
      
      // Enhanced turbulence for chaotic accretion disk
      const turbulenceStrength = 0.5 * progress;
      const turbulence1 = Math.sin(time * 3 + i * 0.1) * turbulenceStrength;
      const turbulence2 = Math.cos(time * 2.5 + i * 0.15) * turbulenceStrength;
      finalX += turbulence1 * Math.cos(i * 0.5);
      finalY += turbulence2 * Math.sin(i * 0.5);
    }

    // 6. BIG BANG EFFECT: Radial Explosion with Shockwave
    if (state.bigBangActive) {
      const bangElapsed = Date.now() - state.bigBangStart;
      
      if (bangElapsed < 2000) {
        // Extended explosion phase (2 seconds for more drama)
        const progress = bangElapsed / 2000;
        
        // Push particles outward from center
        const dx = finalX;
        const dy = finalY;
        const dz = finalZ;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1;
        
        // Multi-phase explosion for realism
        let explosionStrength;
        if (progress < 0.3) {
          // Initial massive burst (first 600ms)
          explosionStrength = 100 * (1 - progress / 0.3);
        } else if (progress < 0.7) {
          // Sustained shockwave (600-1400ms)
          explosionStrength = 40 * Math.sin((progress - 0.3) * Math.PI / 0.4);
        } else {
          // Decay phase (1400-2000ms)
          explosionStrength = 20 * (1 - (progress - 0.7) / 0.3);
        }
        
        // Add radial velocity with some randomness
        const randomFactor = 1 + (Math.random() - 0.5) * 0.3;
        finalX += (dx / dist) * explosionStrength * randomFactor;
        finalY += (dy / dist) * explosionStrength * randomFactor;
        finalZ += (dz / dist) * explosionStrength * randomFactor;
        
        // Add rotation during explosion for chaos
        const rotationSpeed = explosionStrength * 0.05;
        finalX += Math.sin(time * 3 + i) * rotationSpeed;
        finalY += Math.cos(time * 3 + i) * rotationSpeed;
      }
    }

    // Cập nhật Vị trí
    const cx = positionsArray[i * 3];
    const cy = positionsArray[i * 3 + 1];
    const cz = positionsArray[i * 3 + 2];
    const speed = 0.1;
    positionsArray[i * 3] += (finalX - cx) * speed;
    positionsArray[i * 3 + 1] += (finalY - cy) * speed;
    positionsArray[i * 3 + 2] += (finalZ - cz) * speed;

    // 5. Màu sắc (THỐNG NHẤT & MÀU AR MỚI)
    const baseColor = new THREE.Color();
    const cBlueNeon = new THREE.Color(0x00ffff); // Cyan for AR
    
    // BLACK HOLE COLOR EFFECT: Gravitational redshift + accretion disk glow
    if (state.blackHoleActive || state.bigBangActive) {
      const distFromCenter = Math.sqrt(finalX * finalX + finalY * finalY + finalZ * finalZ);
      const normalizedDist = Math.min(distFromCenter / 30, 1);
      
      if (state.blackHoleActive) {
        // Accretion disk colors: hot white/blue near center, orange/red at edges
        if (normalizedDist < 0.15) {
          // Event horizon region: intense white/blue
          const intensity = 1 - (normalizedDist / 0.15);
          baseColor.setRGB(
            0.8 + intensity * 0.2,  // White
            0.9 + intensity * 0.1,
            1.0
          );
        } else if (normalizedDist < 0.4) {
          // Inner accretion disk: blue-white
          const t = (normalizedDist - 0.15) / 0.25;
          baseColor.setHSL(0.55, 0.8, 0.7 + (1 - t) * 0.3);
        } else {
          // Outer accretion disk: orange to red
          const t = (normalizedDist - 0.4) / 0.6;
          baseColor.setHSL(0.05 + t * 0.05, 1.0, 0.5 + (1 - t) * 0.2);
        }
        
        // Add some flickering for realism
        const flicker = Math.sin(time * 5 + i * 0.5) * 0.1;
        baseColor.offsetHSL(0, 0, flicker);
      } else if (state.bigBangActive) {
        // Explosion colors: intense white/yellow
        const bangElapsed = Date.now() - state.bigBangStart;
        const bangProgress = Math.min(bangElapsed / 1000, 1);
        baseColor.setHSL(0.15, 1.0, 0.9 - bangProgress * 0.4);
      }
    } else if (state.currentSpread > 0.8) {
      // Scatter Color
      const dist = Math.sqrt(
        finalX * finalX + finalY * finalY + finalZ * finalZ
      );
      const normDist = Math.min(dist / 40, 1);
      baseColor.setHSL(0.9, 0.5, 0.8 + normDist * 0.2);
    } else {
      if (w5 > 0.5) {
        // AR / Voice Mode -> BLUE NEON / High Contrast
        baseColor.copy(cBlueNeon);
        // Make it brighter/more contrasty
        baseColor.offsetHSL(0, 0, 0.1);
        // Sparkle
        if (Math.random() > 0.92) baseColor.setHex(0xffffff);
      } else if (w1 > 0.5 || w2 > 0.5 || w3 > 0.5 || w4 > 0.5) {
        // Cử chỉ 1-4: Hồng Đồng nhất
        baseColor.setHSL(0.92, 1.0, 0.75);
      } else {
        // Mặc định / Nắm tay (Trạng thái Hình cầu): Hồng Đồng nhất (Khớp với Trái tim)
        baseColor.setHSL(0.92, 1.0, 0.75);
      }
    }

    colorsArray[i * 3] = baseColor.r;
    colorsArray[i * 3 + 1] = baseColor.g;
    colorsArray[i * 3 + 2] = baseColor.b;
  }

  particleGeometry.attributes.position.needsUpdate = true;
  particleGeometry.attributes.color.needsUpdate = true;

  // === BLACK HOLE RING VISUAL ===
  if (blackHoleRing) {
    if (state.blackHoleActive) {
      // Show ring and shrink over 3 seconds
      const elapsed = Date.now() - state.blackHoleStart;
      const progress = Math.min(elapsed / 3000, 1);
      blackHoleRing.visible = true;
      const scale = 1 - progress; // from 1 to 0
      blackHoleRing.scale.set(scale, scale, 1);
      blackHoleRing.material.opacity = 0.6 * (1 - progress);
    } else if (state.bigBangActive) {
      // Explosion: ring expands quickly then disappears
      const bangElapsed = Date.now() - state.bigBangStart;
      if (bangElapsed < 1000) {
        const progress = bangElapsed / 1000;
        blackHoleRing.visible = true;
        const scale = progress * 3; // expand to 3x
        blackHoleRing.scale.set(scale, scale, 1);
        blackHoleRing.material.opacity = 0.6 * (1 - progress);
      } else {
        blackHoleRing.visible = false;
      }
    } else {
      blackHoleRing.visible = false;
    }
  }

  // === PARTICLE VISIBILITY (Big Bang) ===
  if (state.bigBangActive) {
    const bangElapsed = Date.now() - state.bigBangStart;
    if (bangElapsed >= 1000) {
      // Hide particles after 1s to reveal heart
      particleSystem.visible = false;
    } else {
      particleSystem.visible = true;
    }
  } else {
    particleSystem.visible = true;
  }

  // Hoạt hình Thiên Hà (Độ mờ khớp với Cử chỉ 4)
  galaxyMaterial.opacity = THREE.MathUtils.lerp(
    galaxyMaterial.opacity,
    state.galaxyEffectActive ? 0.8 : 0.0,
    0.03
  );

  // ==========================
  // LOGIC TRÁI TIM & CHUYỂN ĐỔI
  // ==========================

  const showHeart =
    (state.isHandDetected && state.fingerCount === 0 && !state.voiceModeActive && !state.blackHoleActive && !state.bigBangActive) ||
    state.heartPersistent;

  // 1. Quản lý Tỷ lệ Hệ thống Hạt (Hình cầu)
  const targetSphereScale = showHeart ? 0.0 : 1.0;

  // Nội suy mượt mà tỷ lệ hình cầu
  const curScale = particleSystem.scale.x;
  const newScale = THREE.MathUtils.lerp(curScale, targetSphereScale, 0.08);
  particleSystem.scale.setScalar(newScale);

  // 2. Quản lý Độ mờ Trái tim
  let targetHeartOpacity = 0.0;
  if (showHeart) {
    if (newScale < 0.2) {
      targetHeartOpacity = 0.9;
    }
  } else {
    // Làm mờ ngay lập tức nếu không phải chế độ trái tim
    targetHeartOpacity = 0.0;
  }

  heartMaterial.opacity = THREE.MathUtils.lerp(
    heartMaterial.opacity,
    targetHeartOpacity,
    0.1
  );
  heartSystem.visible = heartMaterial.opacity > 0.01;

  if (heartSystem.visible) {
    // Hoạt hình Nhịp tim
    // const beatStrength = ... (unused in original loop for position but maybe used for intensity? No, only beatStrength used in formula)
    const scaleFactor = 1.0 + 0.15 * Math.sin(time * 6);

    // Đồng bộ Xoay
    heartSystem.rotation.y = particleSystem.rotation.y;
    heartSystem.rotation.x = particleSystem.rotation.x;

    // Cập nhật hạt cho nhịp đập
    const hPos = heartGeometry.attributes.position.array;
    for (let i = 0; i < heartParticleCount; i++) {
      const base = heartBasePositions[i];
      hPos[i * 3] = base.x * scaleFactor;
      hPos[i * 3 + 1] = base.y * scaleFactor;
      hPos[i * 3 + 2] = base.z * scaleFactor;
    }
    heartGeometry.attributes.position.needsUpdate = true;
  }

  // Buộc Thiên Hà mờ dần trong chế độ trái tim, nếu chưa mờ
  if (showHeart) galaxyMaterial.opacity *= 0.9;

  controls.update();
  renderer.render(scene, camera);
}

animate();