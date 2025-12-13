export const state = {
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
