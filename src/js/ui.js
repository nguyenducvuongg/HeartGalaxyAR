import { state } from "./state.js";
import { CONFIG } from "./constants.js";
import { getLabel, getWeights } from "./gestures.js";

export function setupUI(updateUIHelper) {
  // 1. Thu gọn Giao diện
  const btnCollapse = document.getElementById("btn-collapse");
  const uiLayer = document.getElementById("ui-layer");
  if (btnCollapse && uiLayer) {
    btnCollapse.addEventListener("click", () => {
      uiLayer.classList.toggle("collapsed");
      btnCollapse.innerText = uiLayer.classList.contains("collapsed")
        ? "+"
        : "−";
    });
  }

  // 2. Kéo thả Camera
  const camWrapper = document.getElementById("camera-wrapper");
  const camHandle = document.getElementById("camera-handle");
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  if (camHandle && camWrapper) {
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
  }
}

export function updateUI() {
  const uiGesture = document.getElementById("gesture-val");
  const uiFingers = document.getElementById("finger-val");
  if (uiGesture) uiGesture.innerText = state.targetGestureLabel;
  if (uiFingers) uiFingers.innerText = state.fingerCount;
}

// LOGIC HỆ THỐNG THẺ (Chuyển từ card.html)
let cardSystemInitialized = false;
const cardState = {
  radius: 240,
  autoRotate: true,
  rotateSpeed: -60,
  imgWidth: 120,
  imgHeight: 170,
};

export function initCardSystem() {
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

      if (odrag.timer) clearInterval(odrag.timer);
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