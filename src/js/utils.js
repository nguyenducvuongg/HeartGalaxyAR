export function getHandOpenness(landmarks) {
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

export function countFingers(landmarks, handedness) {
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
