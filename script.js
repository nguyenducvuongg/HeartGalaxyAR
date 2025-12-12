/**
 * CẤU HÌNH
 */
const CONFIG = {
  particleCount: 40000,
  text1: "I",
  text2: "MISS YOU",
  text3: "❤️",
  text4: "I MISS YOU",
  particleSize: 0.08,
  scatterRadius: 35,
  textScale: 0.055,
  camZ: 40,
  interactionRadius: 8.0,
  repulsionStrength: 8.0,
};

/**
 * QUẢN LÝ TRẠNG THÁI
 */
const state = {
  targetGestureLabel: "Waiting...",
  currentWeights: [0, 0, 0, 0, 0],
  targetWeights: [0, 0, 0, 0, 0],

  spreadTarget: 1.0,
  currentSpread: 1.0,

  scatterScaleTarget: 1.0,
  currentScatterScale: 1.0,

  fingerCount: 0,
  galaxyEffectActive: false,

  voiceModeActive: false,
  wasVoiceModeActive: false,
  voiceEnabledByUser: false,

  // Logic Xoay
  handPositionRaw: { x: 0.5, y: 0.5 },

  // Logic Vật lý Tương tác
  handPositions: [],
  isHandDetected: false,
  musicActivated: false,
  heartGestureStart: 0,
  isViewLocked: false,
};

/**
 * LOGIC TƯƠNG TÁC GIAO DIỆN (Thu gọn & Kéo thả)
 */

// 1. Thu gọn Giao diện
const btnCollapse = document.getElementById("btn-collapse");
const uiLayer = document.getElementById("ui-layer");
btnCollapse.addEventListener("click", () => {
  uiLayer.classList.toggle("collapsed");
  btnCollapse.innerText = uiLayer.classList.contains("collapsed") ? "+" : "−";
});

// 2. Kéo thả Camera
const camWrapper = document.getElementById("camera-wrapper");
const camHandle = document.getElementById("camera-handle");
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

camHandle.addEventListener("mousedown", (e) => {
  if (state.voiceModeActive) return; // Vô hiệu hóa kéo thả ở chế độ toàn màn hình
  isDragging = true;
  const rect = camWrapper.getBoundingClientRect();
  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;

  // Chuyển từ định vị dưới/phải sang trên/trái cho logic kéo thả
  camWrapper.style.bottom = "auto";
  camWrapper.style.right = "auto";
  camWrapper.style.left = rect.left + "px";
  camWrapper.style.top = rect.top + "px";
});

window.addEventListener("mousemove", (e) => {
  if (isDragging) {
    camWrapper.style.left = e.clientX - dragOffset.x + "px";
    camWrapper.style.top = e.clientY - dragOffset.y + "px";
  }
});

window.addEventListener("mouseup", () => {
  isDragging = false;
});

/**
 * THIẾT LẬP THREE.JS
 */
const container = document.getElementById("canvas-container");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.FogExp2(0x050505, 0.012);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = CONFIG.camZ;

const vFOV = THREE.MathUtils.degToRad(camera.fov);
const heightAtZero = 2 * Math.tan(vFOV / 2) * camera.position.z;
const widthAtZero = heightAtZero * camera.aspect;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = false;
controls.enableZoom = false;

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/**
 * HỆ THỐNG HẠT & TẠO VĂN BẢN
 */

// Tạo Tọa độ Văn bản Động (Tái sử dụng cho Giọng nói)
function generateTextCoordinates(text, step = 2, scaleOverride = null) {
  console.log(`Generating text coords for: "${text}"`);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const width = 3000;
  const height = 800;
  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "white";
  ctx.font = "900 250px Arial, sans-serif"; // Font đơn giản
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const coords = [];

  const finalScale = scaleOverride || CONFIG.textScale;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      if (data[i] > 128) {
        const pX = (x - width / 2) * finalScale;
        const pY = -(y - height / 2) * finalScale;
        coords.push(new THREE.Vector3(pX, pY, 0));
      }
    }
  }
  console.log(`Generated ${coords.length} points for "${text}"`);
  return coords;
}

const coordsText1 = generateTextCoordinates(CONFIG.text1, 3);
const coordsText2 = generateTextCoordinates(CONFIG.text2, 3);
const coordsText3 = generateTextCoordinates(CONFIG.text3, 3);
const coordsText4 = generateTextCoordinates(CONFIG.text4, 3);
let coordsText5 = generateTextCoordinates("HELLO", 2);

const particleGeometry = new THREE.BufferGeometry();
const positions = new Float32Array(CONFIG.particleCount * 3);
const colors = new Float32Array(CONFIG.particleCount * 3);

const posScatter = [];
const posText1 = [];
const posText2 = [];
const posText3 = [];
const posText4 = [];
const posText5 = [];

function fillPosArray(targetArray, sourceCoords) {
  targetArray.length = 0;
  const depth = 2.0;
  const noise = 0.2;
  for (let i = 0; i < CONFIG.particleCount; i++) {
    if (sourceCoords.length === 0) {
      targetArray.push(new THREE.Vector3(0, 0, 0));
      continue;
    }
    const index = Math.floor(Math.random() * sourceCoords.length);
    const p = sourceCoords[index];
    targetArray.push(
      new THREE.Vector3(
        p.x + (Math.random() - 0.5) * noise,
        p.y + (Math.random() - 0.5) * noise,
        p.z + (Math.random() - 0.5) * depth
      )
    );
  }
}

for (let i = 0; i < CONFIG.particleCount; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(Math.random() * 2 - 1);
  const r = Math.cbrt(Math.random()) * CONFIG.scatterRadius;
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);
  positions[i * 3] = x;
  positions[i * 3 + 1] = y;
  positions[i * 3 + 2] = z;
  colors[i * 3] = 1;
  colors[i * 3 + 1] = 1;
  colors[i * 3 + 2] = 1;
  posScatter.push(new THREE.Vector3(x, y, z));
}

fillPosArray(posText1, coordsText1);
fillPosArray(posText2, coordsText2);
fillPosArray(posText3, coordsText3);
fillPosArray(posText4, coordsText4);
fillPosArray(posText5, coordsText5);

particleGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(positions, 3)
);
particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

const particleMaterial = new THREE.PointsMaterial({
  vertexColors: true,
  size: CONFIG.particleSize,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true,
});

const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particleSystem);

function updateDynamicText(text) {
  const length = Math.max(text.length, 3);
  let optimalScale = 0.09;
  if (length > 4) {
    optimalScale = 0.4 / length;
  }
  optimalScale = Math.max(0.035, optimalScale);

  const newCoords = generateTextCoordinates(text, 2, optimalScale);
  fillPosArray(posText5, newCoords);
}

/**
 * HỆ THỐNG 3: Nền Thiên Hà
 */
const galaxyCount = 8000;
const galaxyGeo = new THREE.BufferGeometry();
const galaxyPos = new Float32Array(galaxyCount * 3);
const galaxyColors = new Float32Array(galaxyCount * 3);

for (let i = 0; i < galaxyCount; i++) {
  const r = 20 + Math.random() * 60;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(Math.random() * 2 - 1);

  galaxyPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  galaxyPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  galaxyPos[i * 3 + 2] = r * Math.cos(phi);

  const c = new THREE.Color();
  const rand = Math.random();
  if (rand < 0.3) c.setHex(0x00ffff);
  else if (rand < 0.6) c.setHex(0x0000ff);
  else if (rand < 0.8) c.setHex(0x4b0082);
  else c.setHex(0xffffff);

  c.multiplyScalar(0.5 + Math.random() * 0.5);

  galaxyColors[i * 3] = c.r;
  galaxyColors[i * 3 + 1] = c.g;
  galaxyColors[i * 3 + 2] = c.b;
}

galaxyGeo.setAttribute("position", new THREE.BufferAttribute(galaxyPos, 3));
galaxyGeo.setAttribute("color", new THREE.BufferAttribute(galaxyColors, 3));

const galaxyMaterial = new THREE.PointsMaterial({
  vertexColors: true,
  size: 0.04,
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const galaxySystem = new THREE.Points(galaxyGeo, galaxyMaterial);
scene.add(galaxySystem);

/**
 * HỆ THỐNG 4: Hệ thống Hạt Trái Tim (Trái tim 3D đang đập)
 */
const heartParticleCount = 15000;
const heartGeometry = new THREE.BufferGeometry();
const heartPositions = new Float32Array(heartParticleCount * 3);
const heartColors = new Float32Array(heartParticleCount * 3);
const heartBasePositions = []; // Lưu trữ vị trí gốc cho hiệu ứng đập

function getHeartPoint() {
  // Lấy mẫu từ chối cho khối lượng trái tim 3D
  // Công thức: (x^2 + 9/4y^2 + z^2 - 1)^3 - x^2z^3 - 9/80y^2z^3 < 0
  // "y" trong công thức này thường là "độ sâu" hoặc độ dày nếu z hướng lên.

  let x, y, z;
  while (true) {
    // Tìm kiếm trong khối lập phương
    x = (Math.random() - 0.5) * 3;
    y = (Math.random() - 0.5) * 3;
    z = (Math.random() - 0.5) * 3;

    const a = x * x + (9 / 4) * y * y + z * z - 1;
    const b = x * x * z * z * z;
    const c = (9 / 80) * y * y * z * z * z;

    if (a * a * a - b - c < 0) {
    
      return new THREE.Vector3(x, y, z);
    }
  }
}

for (let i = 0; i < heartParticleCount; i++) {
  const p = getHeartPoint();

  // Định hướng và Tỷ lệ Tinh chỉnh cho "Cân bằng và Đẹp"
  // Công thức có 'z' là trục dọc (đỉnh ở trên).
  // 'x' là chiều rộng.
  // 'y' là độ sâu.

  // Chúng ta ánh xạ:
  // THREE.x = Math.x * giãn_rộng
  // THREE.y = Math.z * giãn_cao
  // THREE.z = Math.y * làm_phẳng (trái tim thường phẳng hơn)

  const scale = 16.0;

  const rotX = p.x * scale * 1.2; // Mở rộng một chút
  const rotY = p.z * scale * 1.2; // Chiều cao
  const rotZ = p.y * scale * 0.6; // Làm phẳng hồ sơ

  heartPositions[i * 3] = rotX;
  heartPositions[i * 3 + 1] = rotY;
  heartPositions[i * 3 + 2] = rotZ;

  heartBasePositions.push(new THREE.Vector3(rotX, rotY, rotZ));

  // Màu sắc: Hồng Đồng nhất (Khớp với Văn bản)
  const color = new THREE.Color();
  // Hồng Pastel Rực rỡ
  color.setHSL(0.92, 1.0, 0.75);

  heartColors[i * 3] = color.r;
  heartColors[i * 3 + 1] = color.g;
  heartColors[i * 3 + 2] = color.b;
}

heartGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(heartPositions, 3)
);
heartGeometry.setAttribute("color", new THREE.BufferAttribute(heartColors, 3));

const heartMaterial = new THREE.PointsMaterial({
  vertexColors: true,
  size: 0.15,
  transparent: true,
  opacity: 0.0, // Start invisible
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const heartSystem = new THREE.Points(heartGeometry, heartMaterial);
heartSystem.visible = false; // Ban đầu ẩn
scene.add(heartSystem);

/**
 * NHẬN DIỆN GIỌNG NÓI
 */
const voiceBtn = document.getElementById("btn-voice");
const voiceIndicator = document.getElementById("voice-indicator");
const voiceBtnText = document.getElementById("voice-btn-text");

let recognition = null;

if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    console.log("Voice recognition started");
    voiceIndicator.classList.add("listening");
    voiceBtnText.innerText = "Voice Mode: ON";
    voiceBtn.classList.add("active");
  };

  recognition.onerror = (event) => {
    console.error("Voice recognition error", event.error);
    if (event.error === "not-allowed") {
      alert("Microphone access denied. Please allow microphone access.");
      state.voiceEnabledByUser = false;
    }
    voiceIndicator.classList.remove("listening");
  };

  recognition.onend = () => {
    console.log("Voice recognition ended");
    voiceIndicator.classList.remove("listening");
    if (state.voiceEnabledByUser) {
      // Thêm độ trễ nhỏ trước khi khởi động lại để tránh vòng lặp nhanh
      setTimeout(() => {
        try {
          recognition.start();
        } catch (e) {
          console.warn("Restart failed", e);
        }
      }, 300);
    } else {
      voiceBtnText.innerText = "Enable Voice Mode";
      voiceBtn.classList.remove("active");
    }
  };

  recognition.onresult = (event) => {
    if (!state.voiceEnabledByUser) return;

    const last = event.results.length - 1;
    const transcript = event.results[last][0].transcript.trim().toUpperCase();

    const words = transcript.split(" ");
    const displayPhrase = words.slice(-3).join(" ");

    if (displayPhrase.length > 0) {
      updateDynamicText(displayPhrase);
      state.targetGestureLabel = "Voice: " + displayPhrase;
      state.targetWeights = [0, 0, 0, 0, 1];
      state.spreadTarget = 0.0;
    }
  };
} else {
  voiceBtnText.innerText = "Voice Not Supported";
  voiceBtn.disabled = true;
}

voiceBtn.addEventListener("click", () => {
  if (!recognition) return;

  state.voiceEnabledByUser = !state.voiceEnabledByUser;

  if (state.voiceEnabledByUser) {
    try {
      recognition.start();
      state.voiceModeActive = true;
      state.targetGestureLabel = "Listening...";
      state.spreadTarget = 0.0;
      state.targetWeights = [0, 0, 0, 0, 1];

      updateDynamicText("HELLO");
    } catch (e) {
      console.warn(e);
    }
  } else {
    recognition.stop();
    state.voiceModeActive = false;
    state.targetGestureLabel = "Voice Mode OFF";
    state.spreadTarget = 1.0;
  }
});

/**
 * THEO DÕI BÀN TAY & TƯƠNG TÁC
 */
const videoElement = document.getElementById("webcam-preview");
const uiGesture = document.getElementById("gesture-val");
const uiFingers = document.getElementById("finger-val");
const loading = document.getElementById("loading");

function onResults(results) {
  loading.style.display = "none";

  let detectedGesture = 0;
  let fCount = 0;
  let openness = 1.0;

  state.handPositions = [];

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    state.isHandDetected = true;

    for (const landmarks of results.multiHandLandmarks) {
      const palmX = 1.0 - landmarks[9].x;
      const palmY = landmarks[9].y;
      const hPos = new THREE.Vector3(
        (palmX - 0.5) * widthAtZero,
        -(palmY - 0.5) * heightAtZero,
        0
      );
      state.handPositions.push(hPos);
    }

    const landmarks = results.multiHandLandmarks[0];
    const handedness = results.multiHandedness[0].label;

    const wrist = landmarks[0];
    state.handPositionRaw.x = 1.0 - wrist.x;
    state.handPositionRaw.y = wrist.y;

    fCount = countFingers(landmarks, handedness);
    openness = getHandOpenness(landmarks);

    if (state.voiceEnabledByUser) {
      state.targetWeights = [0, 0, 0, 0, 1];
      state.spreadTarget = 0.0;
      state.galaxyEffectActive = false;
    } else {
      if (fCount === 1) detectedGesture = 1;
      else if (fCount === 2) detectedGesture = 2;
      else if (fCount === 3) detectedGesture = 3;
      else if (fCount === 4) detectedGesture = 4;

      // Kiểm tra Cử chỉ Trái tim (Cần 2 tay)
      const isHeart = detectHeartGesture(results);
      const cardLayer = document.getElementById("card-layer");

      // LOGIC MỚI: Khóa Heart (3 giây) & Mở khóa Fist
      if (isHeart) {
        if (state.heartGestureStart === 0) {
          state.heartGestureStart = Date.now();
        } else if (Date.now() - state.heartGestureStart > 2000) {
          state.isViewLocked = true;
        }
      } else {
        state.heartGestureStart = 0;
      }

      // Xử lý mở khóa bằng nắm tay (Fist)
      if (state.isViewLocked && fCount === 0) {
        state.isViewLocked = false;
      }

      if (state.isViewLocked) {
        // ĐANG KHÓA: Luôn hiện thẻ
        if (cardLayer) cardLayer.classList.add("visible");
        state.targetGestureLabel = "LOCKED (Fist to Close)";
        state.spreadTarget = 1.0;
        state.galaxyEffectActive = false;
        state.scatterScaleTarget = 1.5;
      } else if (isHeart) {
        // Đang giữ tim nhưng chưa đủ 2s (hoặc chưa khóa)
        // KHÔNG hiện thẻ, nhưng hiện tiến trình
        if (cardLayer) cardLayer.classList.remove("visible");
        const progress = Math.min(
          (Date.now() - state.heartGestureStart) / 2000,
          1
        );
        state.targetGestureLabel = `Holding Heart... ${Math.floor(
          progress * 100
        )}%`;
        state.spreadTarget = 1.0;
        state.galaxyEffectActive = false;
        state.scatterScaleTarget = 1.5;
      } else if (detectedGesture > 0) {
        // Ẩn Thẻ
        if (cardLayer) cardLayer.classList.remove("visible");

        state.targetGestureLabel = getLabel(detectedGesture);
        state.spreadTarget = 0.0;
        state.targetWeights = getWeights(detectedGesture);
        state.galaxyEffectActive = detectedGesture === 4;
      } else {
        // Ẩn Thẻ
        if (cardLayer) cardLayer.classList.remove("visible");

        state.targetGestureLabel =
          fCount === 0 ? "Fist (Contract)" : "Scatter (Expand)";
        state.spreadTarget = 1.0;
        state.galaxyEffectActive = false;
        const minScale = 0.1;
        const maxScale = 1.5;
        state.scatterScaleTarget = minScale + openness * (maxScale - minScale);
      }
    }

    state.fingerCount = fCount;
  } else {
    state.isHandDetected = false;

    if (state.voiceEnabledByUser) {
      state.spreadTarget = 0.0;
      state.targetWeights = [0, 0, 0, 0, 1];
      state.handPositionRaw.x = 0.5;
      state.handPositionRaw.y = 0.5;
    } else {
      state.spreadTarget = 1.0;
      state.targetGestureLabel = "Waiting...";
      state.scatterScaleTarget = 1.0;
      state.handPositionRaw.x = 0.5;
      state.handPositionRaw.y = 0.5;
    }

    state.fingerCount = 0;
    state.galaxyEffectActive = false;
  }

  // =====================
  // NHẠC TƯƠNG TÁC
  // =====================
  const bgMusic = document.getElementById("bg-music");
  if (bgMusic) {
    // Kích hoạt nhạc khi phát hiện tay LẦN ĐẦU.
    // Khi đã kích hoạt, nó sẽ bật mãi mãi (vòng lặp được bật trong HTML).
    if (state.isHandDetected && !state.musicActivated) {
      state.musicActivated = true;
      bgMusic.play().catch((e) => {
        console.log("Phát nhạc bị chặn:", e);
        state.musicActivated = false;
      });
    }
  }

  updateUI();
}

function getLabel(g) {
  if (g === 1) return CONFIG.text1;
  if (g === 2) return CONFIG.text2;
  if (g === 3) return CONFIG.text3;
  if (g === 4) return "I MISS YOU";
  return "";
}

function getWeights(g) {
  if (g === 1) return [1, 0, 0, 0, 0];
  if (g === 2) return [0, 1, 0, 0, 0];
  if (g === 3) return [0, 0, 1, 0, 0];
  if (g === 4) return [0, 0, 0, 1, 0];
  return state.targetWeights;
}

function getHandOpenness(landmarks) {
  const wrist = landmarks[0];
  const tips = [8, 12, 16, 20];
  const mcps = [5, 9, 13, 17];
  let distTips = 0,
    distMcps = 0;
  for (let i = 0; i < 4; i++) {
    distTips += Math.hypot(
      landmarks[tips[i]].x - wrist.x,
      landmarks[tips[i]].y - wrist.y
    );
    distMcps += Math.hypot(
      landmarks[mcps[i]].x - wrist.x,
      landmarks[mcps[i]].y - wrist.y
    );
  }
  const ratio = distTips / distMcps;
  return Math.max(0, Math.min(1, (ratio - 1.0) / 1.2));
}

function countFingers(landmarks, handedness) {
  let count = 0;
  const fingerTips = [8, 12, 16, 20];
  const fingerPips = [6, 10, 14, 18];
  for (let i = 0; i < 4; i++) {
    if (landmarks[fingerTips[i]].y < landmarks[fingerPips[i]].y) count++;
  }
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const isRightHand = handedness === "Right";
  if (isRightHand) {
    if (thumbTip.x < thumbIp.x) count++;
  } else {
    if (thumbTip.x > thumbIp.x) count++;
  }
  return count;
}

function detectHeartGesture(results) {
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length !== 2) {
    return false;
  }

  const hand1 = results.multiHandLandmarks[0];
  const hand2 = results.multiHandLandmarks[1];

  // Các mốc: 4 = Đầu ngón cái, 8 = Đầu ngón trỏ
  const h1Index = hand1[8];
  const h1Thumb = hand1[4];
  const h2Index = hand2[8];
  const h2Thumb = hand2[4];

  // Tính khoảng cách giữa các đầu ngón tay
  const distIndices = Math.hypot(h1Index.x - h2Index.x, h1Index.y - h2Index.y);
  const distThumbs = Math.hypot(h1Thumb.x - h2Thumb.x, h1Thumb.y - h2Thumb.y);

  // Ngưỡng "chạm" (0.05 là ~5% chiều rộng/cao màn hình)
  // Kiểm tra nếu CẢ HAI ngón trỏ gần nhau VÀ CẢ HAI ngón cái gần nhau
  const threshold = 0.08;

  if (distIndices < threshold && distThumbs < threshold) {
    return true;
  }
  return false;
}

function updateUI() {
  uiGesture.innerText = state.targetGestureLabel;
  uiFingers.innerText = state.fingerCount;
}

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

const cameraFeed = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 1280,
  height: 720,
});

async function startCamera() {
  try {
    loading.innerHTML = "Requesting Camera Access...";
    // Kiểm tra xem trình duyệt có hỗ trợ getUserMedia không
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        "Browser API 'navigator.mediaDevices.getUserMedia' not available"
      );
    }

    // Yêu cầu quyền rõ ràng trước để gỡ lỗi
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    // Dừng luồng ngay lập tức, chúng ta chỉ muốn kiểm tra quyền/tính khả dụng
    stream.getTracks().forEach((track) => track.stop());

    loading.innerHTML = "Starting MediaPipe Camera...";
    await cameraFeed.start();
  } catch (err) {
    console.error("Camera Error:", err);
    loading.innerHTML = `Camera not found (${err.name}).<br>Switching to <b>Mouse Interaction Mode</b>.`;
    setTimeout(() => {
      loading.style.display = "none";
      activateMouseMode();
    }, 2500);
  }
}

let isMouseMode = false;
function activateMouseMode() {
  isMouseMode = true;
  state.isHandDetected = true; // Luôn "phát hiện" tay trong chế độ chuột

  // Giữ khung bao camera hiển thị nhưng báo hiệu không có tín hiệu
  const camWrapper = document.getElementById("camera-wrapper");
  camWrapper.style.display = "flex"; // Ensure it's visible
  camWrapper.style.justifyContent = "center";
  camWrapper.style.alignItems = "center";
  camWrapper.style.background = "rgba(20, 20, 20, 0.8)";
  camWrapper.style.border = "1px solid #444";

  const video = document.getElementById("webcam-preview");
  video.style.opacity = "0.1"; // Làm mờ phần tử video bị hỏng

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

  // Thêm lắng nghe chuột để tương tác
  window.addEventListener("mousemove", (event) => {
    // Ánh xạ chuột sang tọa độ thế giới 3D trên mặt phẳng z=0
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

    // Ánh xạ chuột X sang xoay
    state.handPositionRaw.x = event.clientX / window.innerWidth;
    state.handPositionRaw.y = event.clientY / window.innerHeight;
  });

  // Thêm lắng nghe nhấp chuột để chuyển đổi cử chỉ
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

  // Update UI instructions
  const uiContent = document.getElementById("ui-content");
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

startCamera();

// =========================================
// LOGIC HỆ THỐNG THẺ (Chuyển từ card.html)
// =========================================
let cardSystemInitialized = false;
const cardState = {
  radius: 240,
  autoRotate: true,
  rotateSpeed: -60,
  imgWidth: 120,
  imgHeight: 170,
};

function initCardSystem() {
  if (cardSystemInitialized) return;

  setTimeout(() => {
    const odrag = document.getElementById("drag-container");
    const ospin = document.getElementById("spin-container");
    if (!odrag || !ospin) return;

    // Chọn tất cả ảnh và video theo thứ tự DOM để giữ xen kẽ
    const aEle = ospin.querySelectorAll("img, video");

    // Size of images
    ospin.style.width = cardState.imgWidth + "px";
    ospin.style.height = cardState.imgHeight + "px";

    // Kích thước mặt đất
    const ground = document.getElementById("ground");
    if (ground) {
      ground.style.width = cardState.radius * 3 + "px";
      ground.style.height = cardState.radius * 3 + "px";
    }

    function initDelay(delayTime) {
      for (let i = 0; i < aEle.length; i++) {
        aEle[i].style.transform =
          "rotateY(" +
          i * (360 / aEle.length) +
          "deg) translateZ(" +
          cardState.radius +
          "px)";
        aEle[i].style.transition = "transform 1s";
        aEle[i].style.transitionDelay =
          delayTime || (aEle.length - i) / 4 + "s";
      }
    }

    // Thiết lập ban đầu
    initDelay(1);

    // Tự động xoay
    if (cardState.autoRotate) {
      const animationName = cardState.rotateSpeed > 0 ? "spin" : "spinRevert";
      ospin.style.animation = `${animationName} ${Math.abs(
        cardState.rotateSpeed
      )}s infinite linear`;
    }

    // Sự kiện Chuột/Cảm ứng để xoay vòng thẻ thông qua kéo thả (Chỉ hoạt động khi hiển thị)
    let sX,
      sY,
      nX,
      nY,
      desX = 0,
      desY = 0,
      tX = 0,
      tY = 10;

    function applyTransform(obj) {
      if (tY > 180) tY = 180;
      if (tY < 0) tY = 0;
      obj.style.transform = "rotateX(" + -tY + "deg) rotateY(" + tX + "deg)";
    }

    function playSpin(yes) {
      ospin.style.animationPlayState = yes ? "running" : "paused";
    }

    document.onpointerdown = function (e) {
      // Chỉ bắt sự kiện nếu lớp thẻ đang hiển thị
      const cardLayer = document.getElementById("card-layer");
      if (!cardLayer || !cardLayer.classList.contains("visible")) return;

      clearInterval(odrag.timer);
      e = e || window.event;
      sX = e.clientX;
      sY = e.clientY;

      this.onpointermove = function (e) {
        e = e || window.event;
        nX = e.clientX;
        nY = e.clientY;
        desX = nX - sX;
        desY = nY - sY;
        tX += desX * 0.1;
        tY += desY * 0.1;
        applyTransform(odrag);
        sX = nX;
        sY = nY;
      };

      this.onpointerup = function (e) {
        odrag.timer = setInterval(function () {
          desX *= 0.95;
          desY *= 0.95;
          tX += desX * 0.1;
          tY += desY * 0.1;
          applyTransform(odrag);
          playSpin(false);
          if (Math.abs(desX) < 0.5 && Math.abs(desY) < 0.5) {
            clearInterval(odrag.timer);
            playSpin(true);
          }
        }, 17);
        this.onpointermove = this.onpointerup = null;
      };
      return false;
    };

    // Cuộn chuột để phóng to
    document.onmousewheel = function (e) {
      const cardLayer = document.getElementById("card-layer");
      if (!cardLayer || !cardLayer.classList.contains("visible")) return;

      e = e || window.event;
      const d = e.wheelDelta / 20 || -e.detail;
      cardState.radius += d;
      initDelay(1);
    };
  }, 100);
  cardSystemInitialized = true;
}

// Bắt đầu logic hệ thống thẻ
initCardSystem();

/**
 * HOẠT HÌNH
 */

function animate() {
  requestAnimationFrame(animate);

  // Xử lý Chuyển đổi Chế độ AR
  if (state.voiceModeActive !== state.wasVoiceModeActive) {
    if (state.voiceModeActive) {
      camWrapper.classList.add("fullscreen");
      // Chỉ làm nền trong suốt nếu camera thực sự hoạt động/hiển thị
      if (!isMouseMode) {
        scene.background = null;
      } else {
        scene.background = new THREE.Color(0x050505);
      }

      // Đặt lại vị trí khi vào chế độ toàn màn hình để đảm bảo nó bao phủ mọi thứ
      camWrapper.style.top = "";
      camWrapper.style.left = "";
      camWrapper.style.bottom = "";
      camWrapper.style.right = "";
    } else {
      camWrapper.classList.remove("fullscreen");
      scene.background = new THREE.Color(0x050505);
      // Đặt lại về vị trí góc mặc định hoặc giữ vị trí kéo thả cuối cùng?
      // Hãy đặt lại cho an toàn hoặc giữ nó nếu đã kéo.
      // Vì chúng ta đã sửa đổi kiểu nội tuyến trong khi kéo, chúng vẫn tồn tại.
      if (!camWrapper.style.top) {
        camWrapper.style.bottom = "15px";
        camWrapper.style.right = "15px";
      }
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
    const cPink1 = new THREE.Color(0xff69b4); // HotPink
    const cPurple = new THREE.Color(0xda70d6); // Orchid
    const cBlueNeon = new THREE.Color(0x00ffff); // Cyan for AR
    const cWhite = new THREE.Color(0xffffff);

    if (state.currentSpread > 0.8) {
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
    state.isHandDetected && state.fingerCount === 0 && !state.voiceModeActive;

  // 1. Quản lý Tỷ lệ Hệ thống Hạt (Hình cầu)
  // Nếu hiển thị trái tim, chúng ta muốn hình cầu thu nhỏ về 0.
  // Nếu không hiển thị trái tim, chúng ta muốn nó là 1.
  const targetSphereScale = showHeart ? 0.0 : 1.0;

  // Nội suy mượt mà tỷ lệ hình cầu
  // truy cập trực tiếp vào tỷ lệ đối tượng three.js
  const curScale = particleSystem.scale.x;
  const newScale = THREE.MathUtils.lerp(curScale, targetSphereScale, 0.08);
  particleSystem.scale.setScalar(newScale);

  // 2. Quản lý Độ mờ Trái tim
  // Chỉ hiện trái tim khi hình cầu đủ nhỏ (để tránh lộn xộn/xung đột)
  // Khi biến mất, làm mờ trái tim trước, sau đó hình cầu sẽ lớn lên (kết quả tự nhiên của việc targetSphereScale trở thành 1)
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
    const beatStrength =
      Math.pow(Math.sin(time * 3), 63) * 0.3 +
      Math.pow(Math.sin(time * 3 + 0.8), 20) * 0.1;
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
