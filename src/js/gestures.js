import { state } from "./state.js";
import { CONFIG } from "./constants.js";
import { updateUI } from "./ui.js";
import { countFingers, getHandOpenness } from "./utils.js";
import { widthAtZero, heightAtZero } from "./scene.js";

export function getLabel(g) {
  if (g === 1) return CONFIG.text1;
  if (g === 2) return CONFIG.text2;
  if (g === 3) return CONFIG.text3;
  if (g === 4) return CONFIG.text4;
  return "";
}

export function getWeights(g) {
  if (g === 1) return [1, 0, 0, 0, 0];
  if (g === 2) return [0, 1, 0, 0, 0];
  if (g === 3) return [0, 0, 1, 0, 0];
  if (g === 4) return [0, 0, 0, 1, 0];
  return state.targetWeights;
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

export function onResults(results) {
  const loading = document.getElementById("loading");
  if (loading) loading.style.display = "none";

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
        }
        else if (Date.now() - state.heartGestureStart > 2000) {
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
      }
      else if (isHeart) {
         // Đang giữ tim nhưng chưa đủ 2s (hoặc chưa khóa)
         // KHÔNG hiện thẻ, nhưng hiện tiến trình
         if (cardLayer) cardLayer.classList.remove("visible");
         const progress = Math.min((Date.now() - state.heartGestureStart) / 2000, 1);
         state.targetGestureLabel = `Holding Heart... ${Math.floor(progress * 100)}%`;
         state.spreadTarget = 1.0; 
         state.galaxyEffectActive = false;
         state.scatterScaleTarget = 1.5; 
      }
      else if (detectedGesture > 0) {
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
        bgMusic.play().catch(e => {
            console.log("Phát nhạc bị chặn:", e);
            // Nếu bị chặn, đặt lại cờ để thử lại ở khung hình tiếp theo
            state.musicActivated = false;
        });
    }
  }

  updateUI();
}