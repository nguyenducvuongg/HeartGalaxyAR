import { CONFIG } from "./constants.js";

// THIẾT LẬP THREE.JS
const container = document.getElementById("canvas-container");
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.FogExp2(0x050505, 0.012);

export const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = CONFIG.camZ;

const vFOV = THREE.MathUtils.degToRad(camera.fov);
export const heightAtZero = 2 * Math.tan(vFOV / 2) * camera.position.z;
export const widthAtZero = heightAtZero * camera.aspect;

export const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
if (container) {
  container.appendChild(renderer.domElement);
}

export const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = false;
controls.enableZoom = false;

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});