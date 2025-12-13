export const galaxyCount = 8000;
export const galaxyGeo = new THREE.BufferGeometry();
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

export const galaxyMaterial = new THREE.PointsMaterial({
  vertexColors: true,
  size: 0.04,
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

export const galaxySystem = new THREE.Points(galaxyGeo, galaxyMaterial);

export function initGalaxy(scene) {
    scene.add(galaxySystem);
}