/**
 * boneStructureAnalyzer.js
 * Evaluates skeletal structure factors that contribute to appearance.
 * Also calculates bone vs skin factor ratio.
 */
const BoneStructureAnalyzer = (() => {
  const LM = {
    FOREHEAD: 10,
    CHIN:     152,
    L_EAR:    234,
    R_EAR:    454,
    L_EYE_O:  33,
    R_EYE_O:  263,
    L_EYE_I:  133,
    R_EYE_I:  362,
    L_CHEEK:  116,
    R_CHEEK:  345,
    L_JAW:    172,
    R_JAW:    397,
    NOSE_TIP: 4,
    L_MOUTH:  61,
    R_MOUTH:  291,
  };

  function analyze(neutralKP, smileKP, downKP) {
    if (!neutralKP || neutralKP.length < 400) return defaultResult();

    const get = i => neutralKP[i] || { x: 0, y: 0, z: 0 };

    // Face dimensions
    const fh = get(LM.FOREHEAD);
    const ch = get(LM.CHIN);
    const le = get(LM.L_EAR);
    const re = get(LM.R_EAR);
    const faceH = dist(fh, ch);
    const faceW = dist(le, re);
    if (faceH < 10) return defaultResult();

    // 1. Facial proportions (golden ratio etc.)
    const ratio = faceH / faceW; // ideal ~1.6 (golden)
    const ratioScore = clamp(100 - Math.abs(ratio - 1.6) * 80, 40, 100);

    // 2. Jaw definition
    const lj = get(LM.L_JAW);
    const rj = get(LM.R_JAW);
    const jawW = dist(lj, rj);
    const jawRatio = jawW / faceW; // ideal ~0.65-0.75
    const jawScore = clamp(100 - Math.abs(jawRatio - 0.70) * 200, 30, 100);

    // 3. Cheekbone prominence (relative to jaw width)
    const lck = get(LM.L_CHEEK);
    const rck = get(LM.R_CHEEK);
    const cheekW = dist(lck, rck);
    const cheekJawRatio = cheekW / jawW; // high cheekbones: >1.1
    const cheekScore = clamp((cheekJawRatio - 0.85) / 0.35 * 100, 30, 100);

    // 4. Geometric stability across photos (bone = stable)
    let stabilityScore = 75;
    const allKPs = [neutralKP, smileKP, downKP].filter(k => k && k.length > 400);
    if (allKPs.length > 1) {
      // Measure variance in key bony distances across photos
      const measurements = allKPs.map(kp => ({
        ipd: dist(kp[LM.L_EYE_I] || get(LM.L_EYE_I), kp[LM.R_EYE_I] || get(LM.R_EYE_I)),
        jawW: dist(kp[LM.L_JAW] || get(LM.L_JAW), kp[LM.R_JAW] || get(LM.R_JAW)),
      }));
      const ipdVar = relVariance(measurements.map(m => m.ipd));
      const jawVar = relVariance(measurements.map(m => m.jawW));
      const avgVar = (ipdVar + jawVar) / 2;
      // Low variance = stable bone structure
      stabilityScore = clamp(100 - avgVar * 1000, 40, 100);
    }

    const structureScore = ratioScore * 0.3 + jawScore * 0.3 + cheekScore * 0.2 + stabilityScore * 0.2;

    // Bone factor: how much of appearance is determined by skeleton
    // Higher structure score = bones are favorable = lower bone "problem" factor
    // But bone factor as % of TOTAL aging = how much can't be changed
    // This is typically 20-35%
    const boneFactor = clamp(15 + (100 - structureScore) * 0.20, 15, 40);
    const skinFactor = 100 - boneFactor;

    return {
      score: Math.round(structureScore),
      ratioScore: Math.round(ratioScore),
      jawScore: Math.round(jawScore),
      cheekScore: Math.round(cheekScore),
      boneFactor: Math.round(boneFactor),
      skinFactor: Math.round(skinFactor),
      faceRatio: ratio.toFixed(2),
      jawRatio: jawRatio.toFixed(2),
      severity: getSeverity(structureScore)
    };
  }

  function defaultResult() {
    return { score: 72, ratioScore: 72, jawScore: 68, cheekScore: 75,
             boneFactor: 25, skinFactor: 75, faceRatio: '1.58', jawRatio: '0.68',
             severity: getSeverity(72) };
  }

  function getSeverity(score) {
    if (score >= 80) return { label: '骨格バランス良好', color: '#3498db', level: 0 };
    if (score >= 65) return { label: '標準的', color: '#2ecc71', level: 1 };
    if (score >= 50) return { label: 'やや変化あり', color: '#f39c12', level: 2 };
    return { label: '骨格変化が目立つ', color: '#e67e22', level: 3 };
  }

  const dist = (a, b) => a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));

  function relVariance(arr) {
    if (arr.length < 2) return 0;
    const m = arr.reduce((s, v) => s + v, 0) / arr.length;
    if (m === 0) return 0;
    const v = arr.reduce((s, v2) => s + (v2 - m) ** 2, 0) / arr.length;
    return Math.sqrt(v) / m;
  }

  return { analyze };
})();