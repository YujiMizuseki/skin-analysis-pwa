/**
 * wrinkleAnalyzer.js
 * Analyzes crow's feet and eye corner wrinkles
 * Uses z-coordinate surface variation as a proxy for wrinkle depth
 */
const WrinkleAnalyzer = (() => {
  // Eye outer corner regions (crow's feet area)
  // Viewer's right (face's left eye):
  const L_EYE_OUTER = 33;
  const L_CROW_REGION = [33, 7, 163, 144, 145, 153, 154, 155, 133];
  // Viewer's left (face's right eye):
  const R_EYE_OUTER = 263;
  const R_CROW_REGION = [263, 249, 390, 373, 374, 380, 381, 382, 362];

  // Under-eye region
  const L_UNDER_EYE = [159, 158, 157, 173, 133, 155, 154, 153, 145];
  const R_UNDER_EYE = [386, 385, 384, 398, 362, 382, 381, 380, 374];

  // Forehead (for reference)
  const FOREHEAD = 10;
  const CHIN = 152;

  function analyze(neutralKP, smileKP) {
    if (!neutralKP || neutralKP.length < 400) return defaultResult();

    const get = (kp, i) => (kp && kp[i]) ? kp[i] : { x: 0, y: 0, z: 0 };
    const fh = get(neutralKP, FOREHEAD);
    const ch = get(neutralKP, CHIN);
    const faceH = Math.hypot(fh.x - ch.x, fh.y - ch.y);
    if (faceH < 10) return defaultResult();

    // Z-coordinate variance in crow's feet region (proxy for wrinkle depth)
    const lCrowZ = L_CROW_REGION.map(i => get(neutralKP, i).z);
    const rCrowZ = R_CROW_REGION.map(i => get(neutralKP, i).z);

    const lVariance = variance(lCrowZ);
    const rVariance = variance(rCrowZ);
    const avgVariance = (lVariance + rVariance) / 2;

    // Normalize by face height
    const normVariance = avgVariance / (faceH * faceH);

    // Score: lower variance = smoother = higher score
    // Typical values: very smooth ~0.0001, moderate ~0.0004, deep wrinkles ~0.001+
    const crowFeetScore = clamp(100 - (normVariance / 0.0008) * 100, 0, 100);

    // Under-eye quality
    const lUnderZ = L_UNDER_EYE.map(i => get(neutralKP, i).z);
    const rUnderZ = R_UNDER_EYE.map(i => get(neutralKP, i).z);
    const underVariance = (variance(lUnderZ) + variance(rUnderZ)) / 2;
    const normUnder = underVariance / (faceH * faceH);
    const underEyeScore = clamp(100 - (normUnder / 0.0010) * 100, 0, 100);

    // Smile test: do crow's feet appear when smiling?
    let smileWrinkleScore = 75;
    if (smileKP && smileKP.length > 400) {
      const lSmileZ = L_CROW_REGION.map(i => get(smileKP, i).z);
      const rSmileZ = R_CROW_REGION.map(i => get(smileKP, i).z);
      const smileVar = (variance(lSmileZ) + variance(rSmileZ)) / 2;
      const normSmile = smileVar / (faceH * faceH);
      smileWrinkleScore = clamp(100 - (normSmile / 0.0012) * 100, 0, 100);
    }

    const score = crowFeetScore * 0.5 + underEyeScore * 0.25 + smileWrinkleScore * 0.25;

    return {
      score: Math.round(score),
      crowFeetScore: Math.round(crowFeetScore),
      underEyeScore: Math.round(underEyeScore),
      smileWrinkleScore: Math.round(smileWrinkleScore),
      leftScore: Math.round(clamp(100 - (lVariance / (faceH * faceH) / 0.0008) * 100, 0, 100)),
      rightScore: Math.round(clamp(100 - (rVariance / (faceH * faceH) / 0.0008) * 100, 0, 100)),
      severity: getSeverity(score),
      skinContrib: 85,
      boneContrib: 15
    };
  }

  function defaultResult() {
    return { score: 72, crowFeetScore: 72, underEyeScore: 72, smileWrinkleScore: 72,
             leftScore: 72, rightScore: 72, severity: getSeverity(72), skinContrib: 85, boneContrib: 15 };
  }

  function getSeverity(score) {
    if (score >= 80) return { label: 'ほぼなし', color: '#2ecc71', level: 0 };
    if (score >= 65) return { label: '微細なシワ', color: '#f39c12', level: 1 };
    if (score >= 45) return { label: 'はっきりしたシワ', color: '#e67e22', level: 2 };
    return { label: '深いシワ', color: '#e74c3c', level: 3 };
  }

  function variance(arr) {
    const m = arr.reduce((s, v) => s + v, 0) / arr.length;
    return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
  }

  const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));

  return { analyze };
})();