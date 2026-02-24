/**
 * marionetteAnalyzer.js
 * Analyzes marionette lines (puppet lines) running from mouth corners down toward chin.
 * Uses jowl sag depth + Z-variance in the lower-cheek region + gravity test.
 */
const MarionetteAnalyzer = (() => {
  const MOUTH_L  = 61;    // left mouth corner
  const MOUTH_R  = 291;   // right mouth corner
  const FOREHEAD = 10;
  const CHIN     = 152;

  // Landmarks along the marionette / jowl region (below mouth corners)
  const L_JOWL = [136, 150, 149, 176, 148, 171];
  const R_JOWL = [365, 379, 378, 400, 377, 395];

  function analyze(neutralKP, downKP) {
    if (!neutralKP || neutralKP.length < 400) return defaultResult();

    const get = (kp, i) => (kp && kp[i]) ? kp[i] : { x: 0, y: 0, z: 0 };

    const fh = get(neutralKP, FOREHEAD);
    const ch = get(neutralKP, CHIN);
    const faceH = Math.hypot(fh.x - ch.x, fh.y - ch.y);
    if (faceH < 10) return defaultResult();

    const mouthL = get(neutralKP, MOUTH_L);
    const mouthR = get(neutralKP, MOUTH_R);

    // ── 1. Jowl sag: how far jowl tissue sits below mouth corner (Y axis) ──
    const lJowlPts = L_JOWL.map(i => get(neutralKP, i));
    const rJowlPts = R_JOWL.map(i => get(neutralKP, i));

    const lJowlY = avg(lJowlPts.map(p => p.y));
    const rJowlY = avg(rJowlPts.map(p => p.y));

    // Normalised drop below mouth corner (higher Y = lower on face in image coords)
    const lDrop = (lJowlY - mouthL.y) / faceH;
    const rDrop = (rJowlY - mouthR.y) / faceH;
    const dropAvg = (lDrop + rDrop) / 2;

    // Score: drop < 0.07 → fine, > 0.19 → deep marionette
    const sagScore = clamp(100 - Math.max(0, dropAvg - 0.07) / 0.12 * 100, 0, 100);

    // ── 2. Z-depth variance in jowl region (surface irregularity = groove depth) ──
    const lZ = lJowlPts.map(p => p.z);
    const rZ = rJowlPts.map(p => p.z);
    const normVar = ((variance(lZ) + variance(rZ)) / 2) / (faceH * faceH);
    const depthScore = clamp(100 - (normVar / 0.0007) * 100, 0, 100);

    // ── 3. Gravity test: does jowl drop further when looking down? ──
    let gravityScore = 75;
    if (downKP && downKP.length > 400) {
      const mouthLd = get(downKP, MOUTH_L);
      const mouthRd = get(downKP, MOUTH_R);
      const lJowlYd = avg(L_JOWL.map(i => get(downKP, i).y));
      const rJowlYd = avg(R_JOWL.map(i => get(downKP, i).y));
      const dropD = ((lJowlYd - mouthLd.y) + (rJowlYd - mouthRd.y)) / 2 / faceH;
      gravityScore = clamp(100 - Math.max(0, dropD - 0.07) / 0.15 * 100, 0, 100);
    }

    const score = Math.round(sagScore * 0.45 + depthScore * 0.35 + gravityScore * 0.20);

    return {
      score,
      sagScore:     Math.round(sagScore),
      depthScore:   Math.round(depthScore),
      gravityScore: Math.round(gravityScore),
      severity:     getSeverity(score),
      skinContrib: 80,
      boneContrib: 20
    };
  }

  function defaultResult() {
    const score = 68;
    return { score, sagScore: 68, depthScore: 68, gravityScore: 68,
             severity: getSeverity(score), skinContrib: 80, boneContrib: 20 };
  }

  function getSeverity(score) {
    if (score >= 80) return { label: 'ほぼなし',       color: '#2ecc71', level: 0 };
    if (score >= 65) return { label: '浅め',           color: '#f39c12', level: 1 };
    if (score >= 48) return { label: 'はっきりしている', color: '#e67e22', level: 2 };
    return              { label: '深い',             color: '#e74c3c', level: 3 };
  }

  function avg(arr) { return arr.reduce((s, v) => s + v, 0) / arr.length; }
  function variance(arr) {
    const m = avg(arr);
    return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
  }
  const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));

  return { analyze };
})();
