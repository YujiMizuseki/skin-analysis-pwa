/**
 * nasolabialAnalyzer.js
 * Analyzes nasolabial folds (法令線) depth and length
 * Higher score = younger (shallower/shorter folds)
 */
const NasolabialAnalyzer = (() => {
  // MediaPipe landmarks for NLF region
  // Viewer's right side (face's left):
  const R_NOSTRIL = 49;
  const R_MOUTH   = 61;
  const R_FOLD_MID = 206; // point on fold
  const R_CHEEK_REF = [116, 123, 147]; // cheek surface reference

  // Viewer's left side (face's right):
  const L_NOSTRIL = 279;
  const L_MOUTH   = 291;
  const L_FOLD_MID = 426;
  const L_CHEEK_REF = [345, 352, 376];

  const FOREHEAD = 10;
  const CHIN     = 152;

  function analyze(kp) {
    if (!kp || kp.length < 400) return defaultResult();
    const get = i => kp[i] || { x: 0, y: 0, z: 0 };

    // Face scale
    const fh = get(FOREHEAD);
    const ch = get(CHIN);
    const faceH = Math.hypot(fh.x - ch.x, fh.y - ch.y);
    if (faceH < 10) return defaultResult();

    // Measure fold length (nose ala to mouth corner)
    const rightLen = dist(get(R_NOSTRIL), get(R_MOUTH)) / faceH;
    const leftLen  = dist(get(L_NOSTRIL), get(L_MOUTH)) / faceH;
    const avgLen   = (rightLen + leftLen) / 2;

    // Measure fold depth using z-coordinate relative to cheek surface
    const rCheekZ = avg(R_CHEEK_REF.map(i => get(i).z));
    const lCheekZ = avg(L_CHEEK_REF.map(i => get(i).z));
    const rFoldZ  = get(R_FOLD_MID).z;
    const lFoldZ  = get(L_FOLD_MID).z;
    const rDepth  = Math.abs(rFoldZ - rCheekZ);
    const lDepth  = Math.abs(lFoldZ - lCheekZ);
    const avgDepth = (rDepth + lDepth) / 2;

    // Scoring:
    // Length: normalized fold length 0.18-0.30 → score 100-0
    // Typical: young ~0.20, middle ~0.24, older ~0.28
    const lenScore = clamp(100 - ((avgLen - 0.17) / 0.14) * 100, 0, 100);

    // Depth: z-difference normalized → score 100-0
    // z values in pixels, normalize by face scale
    const normDepth = avgDepth / faceH;
    const depthScore = clamp(100 - (normDepth / 0.06) * 100, 0, 100);

    // Combined
    const score = lenScore * 0.5 + depthScore * 0.5;
    const asymmetry = Math.abs(rightLen - leftLen) / avgLen;

    return {
      score: Math.round(score),
      leftScore: Math.round(clamp(100 - ((leftLen - 0.17) / 0.14) * 100, 0, 100)),
      rightScore: Math.round(clamp(100 - ((rightLen - 0.17) / 0.14) * 100, 0, 100)),
      asymmetry: Math.round(asymmetry * 100),
      normalizedLength: avgLen,
      normalizedDepth: normDepth,
      severity: getSeverity(score),
      skinContrib: 75,
      boneContrib: 25
    };
  }

  function defaultResult() {
    return { score: 65, leftScore: 65, rightScore: 65, asymmetry: 5,
             normalizedLength: 0.23, normalizedDepth: 0.02,
             severity: getSeverity(65), skinContrib: 75, boneContrib: 25 };
  }

  function getSeverity(score) {
    if (score >= 80) return { label: 'ほぼ目立たない', color: '#2ecc71', level: 0 };
    if (score >= 65) return { label: 'わずかに見られる', color: '#f39c12', level: 1 };
    if (score >= 45) return { label: '中程度', color: '#e67e22', level: 2 };
    return { label: 'はっきり見られる', color: '#e74c3c', level: 3 };
  }

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const avg  = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
  const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));

  return { analyze };
})();