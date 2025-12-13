export const heartParticleCount = 15000;
export const heartGeometry = new THREE.BufferGeometry();
const heartPositions = new Float32Array(heartParticleCount * 3);
const heartColors = new Float32Array(heartParticleCount * 3);
export const heartBasePositions = []; // Lưu trữ vị trí gốc cho hiệu ứng đập

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
    
    const a = x * x + (9/4) * y * y + z * z - 1;
    const b = x * x * z * z * z;
    const c = (9/80) * y * y * z * z * z;
    
    if (a * a * a - b - c < 0) {
      // Thành công
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

heartGeometry.setAttribute("position", new THREE.BufferAttribute(heartPositions, 3));
heartGeometry.setAttribute("color", new THREE.BufferAttribute(heartColors, 3));

export const heartMaterial = new THREE.PointsMaterial({
  vertexColors: true,
  size: 0.15,
  transparent: true,
  opacity: 0.0, // Start invisible
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

export const heartSystem = new THREE.Points(heartGeometry, heartMaterial);
heartSystem.visible = false; // Ban đầu ẩn

export function initHeart(scene) {
    scene.add(heartSystem);
}