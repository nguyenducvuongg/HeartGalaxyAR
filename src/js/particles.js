import { CONFIG } from "./constants.js";

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

export const particleGeometry = new THREE.BufferGeometry();
const positions = new Float32Array(CONFIG.particleCount * 3);
const colors = new Float32Array(CONFIG.particleCount * 3);

export const posScatter = [];
export const posText1 = [];
export const posText2 = [];
export const posText3 = [];
export const posText4 = [];
export const posText5 = [];

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

export const particleSystem = new THREE.Points(particleGeometry, particleMaterial);

export function initParticles(scene) {
    scene.add(particleSystem);
}

export function updateDynamicText(text) {
  const length = Math.max(text.length, 3);
  let optimalScale = 0.09;
  if (length > 4) {
    optimalScale = 0.4 / length;
  }
  optimalScale = Math.max(0.035, optimalScale);

  const newCoords = generateTextCoordinates(text, 2, optimalScale);
  fillPosArray(posText5, newCoords);
}