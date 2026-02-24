/**
 * cheekAnalyzer.js
 * Analyzes cheek sagging and volume loss
 * Compares neutral vs smile vs downward looking photos
 */
const CheekAnalyzer = (() => {
  // Cheek landmark indices
  const L_CHEEK_UPPER = [116, 123, 147];  // viewer's right upper cheek
  const L_CHEEK_LOWER = [192, 207, 213];  // viewer's right lower cheek
  const R_CHEEK_UPPER = [345, 352, 376];  // viewer's left upper cheek
  const R_CHEEK_LOWER = [416, 427, 433];  // viewer's left lower cheek

  const NOSE_TIP = 4;
  const CHIN = 152;
  const FOREHEAD = 10;
  const L_MOUTH = 61;
  const R_MOUTH = 291;

  function analyze(neutralKP, smileKP, downKP) {
    if (!neutralKP || neutralKP.length < 400) return defaultResult();

    const get = (kp, i) => (kp && kp[i]) ? kp[i] : { x: 0, y: 0, z: 0 };
    const fh = get(neutralKP, FOREHEAD);
    const ch = get(neutralKP, CHIN);
    const faceH = Math.hypot(fh.x - ch.x, fh.y - ch.y);
    if (faceH < 10) return defaultResult();

    // 1. Cheek vertical position (sag = lower position relative to nose)
    const nose = get(neutralKP, NOSE_TIP);
    const lCheekY = avg(L_CHEEK_LOWER.map(i => get(neutralKP, i).y));
    const rCheekY = avg(R_CHEEK_LOWER.map(i => get(neutralKP, i).y));
    const avgCheekY = (lCheekY + rCheekY) / 2;

    // Normalized cheek Y position relative to face (0=top, 1=bottom)
    const cheekYNorm = (avgCheekY - fh.y) / faceH;
    // Young cheeks: ~0.55-0.60 (above midface)
    // Sagging cheeks: ~0.62-0.70
    const sagScore = clamp(100 - ((cheekYNorm - 0.50) / 0.22) * 100, 0, 100);

    // 2. Cheek elasticity: compare neutral vs smile (how much cheeks lift)
    let elasticityScore = 75; // default
    if (smileKP && smileKP.length > 400) {
      const lCheekNeutralY = avg(L_CHEEK_LOWER.map(i => get(neutralKP, i).y));
      const lCheekSmileY   = avg(L_CHEEK_LOWER.map(i => get(smileKP, i).y));
      const rCheekNeutralY = avg(R_CHEEK_LOWER.map(i => get(neutralKP, i).y));
      const rCheekSmileY   = avg(R_CHEEK_LOWER.map(i => get(smileKP, i).y));
      // How much cheeks rise during smile (normalized by face height)
      const lLift = (lCheekNeutralY - lCheekSmileY) / faceH;
      const rLift = (rCheekNeutralY - rCheekSmileY) / faceH;
      const avgLift = (lLift + rLift) / 2;
      // Good lift ~0.04-0.08 of face height
      elasticityScore = clamp((avgLift / 0.07) * 100, 0, 100);
    }

    // 3. Gravity sag test: compare neutral vs downward
    let gravitySagScore = 75; // default
    if (downKP && downKP.length > 400) {
      // When looking down, sagging cheeks drop more
      const lDownY   = avg(L_CHEEK_LOWER.map(i => get(downKP, i).y));
      const lNeutralY = avg(L_CHEEK_LOWER.map(i => get(neutralKP, i).y));
      const rDownY   = avg(R_CHEEK_LOWER.map(i => get(downKP, i).y));
      const rNeutralY = avg(R_CHEEK_LOWER.map(i => get(neutralKP, i).y));
      const lDrop = (lDownY - lNeutralY) / faceH;
      const rDrop = (rDownY - rNeutralY) / faceH;
      const avgDrop = (lDrop + rDrop) / 2;
      // Large drop = more sagging (>0.06 = significant)
      gravitySagScore = clamp(100 - (avgDrop / 0.10) * 100, 0, 100);
    }

    const score = sagScore * 0.4 + elasticityScore * 0.35 + gravitySagScore * 0.25;

    return {
      score: Math.round(score),
      sagScore: Math.round(sagScore),
      elasticityScore: Math.round(elasticityScore),
      gravitySagScore: Math.round(gravitySagScore),
      cheekPosition: cheekYNorm,
      severity: getSeverity(score),
      skinContrib: 70,
      boneContrib: 30
    };
  }

  function defaultResult() {
    return { score: 70, sagScore: 70, elasticityScore: 70, gravitySagScore: 70,
             cheekPosition: 0.57, severity: getSeverity(70), skinContrib: 70, boneContrib: 30 };
  }

  function getSeverity(score) {
    if (score >= 80) return { label: 'ハリがある', color: '#2ecc71', level: 0 };
    if (score >= 65) return { label: 'やや緩み', color: '#f39c12', level: 1 };
    if (score >= 45) return { label: 'たるみあり', color: '#e67e22', level: 2 };
    return { label: '明らかなたるみ', color: '#e74c3c', level: 3 };
  }

  const avg = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
  const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));

  return { analyze };
})();