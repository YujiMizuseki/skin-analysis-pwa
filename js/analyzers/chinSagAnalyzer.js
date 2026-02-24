/**
 * chinSagAnalyzer.js
 * Analyzes chin/jaw sagging using neutral + bottom-up photo
 * Bottom-up shot (from below) reveals gravity-induced chin sag and double chin
 */
const ChinSagAnalyzer = (() => {
  // Jawline landmarks (left & right sides)
  const JAW_L   = [172, 136, 150, 149, 176, 148];
  const JAW_R   = [377, 400, 378, 379, 365, 397];
  const CHIN    = 152;   // chin tip
  const FOREHEAD = 10;
  const NOSE_TIP = 1;

  // Sub-mental / under-chin area
  const CHIN_AREA = [152, 200, 199, 175, 148, 377];

  function get(kp, idx) {
    if (!kp || !kp[idx]) return null;
    return kp[idx];
  }

  function dist(a, b) {
    if (!a || !b) return 0;
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
  }

  function dist2D(a, b) {
    if (!a || !b) return 0;
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function analyze(neutralKP, bottomKP) {
    if (!neutralKP) {
      return { score: 65, severity: chinSeverity(65), future: chinFuture(65), jawRatio: null };
    }

    const chin_n      = get(neutralKP, CHIN);
    const jaw_l_n     = get(neutralKP, 136);
    const jaw_r_n     = get(neutralKP, 365);
    const forehead_n  = get(neutralKP, FOREHEAD);
    const nose_n      = get(neutralKP, NOSE_TIP);

    if (!chin_n || !jaw_l_n || !jaw_r_n || !forehead_n) {
      return { score: 65, severity: chinSeverity(65), future: chinFuture(65), jawRatio: null };
    }

    const faceH = dist(forehead_n, chin_n) || 1;

    // ── Metric 1: Jaw sharpness from neutral (40%) ──────────────────
    // Compare jaw width at chin level vs cheekbone level
    // Sagging = jaw bottom becomes wider relative to face height
    const jawW_n = dist2D(jaw_l_n, jaw_r_n);
    const jawRatio = jawW_n / faceH;
    // Ideal range: 0.5–0.68; above 0.68 = drooping/sagging jaw
    const jawSharpScore = clamp(100 - Math.max(0, jawRatio - 0.50) / 0.30 * 80, 0, 100);

    // ── Metric 2: Jawline Z-depth contour from neutral (30%) ────────
    // Sharp jawline = high Z-variance along jaw; sagging = flatter
    const jawPts = [...JAW_L, ...JAW_R].map(idx => get(neutralKP, idx)).filter(Boolean);
    const jawZs  = jawPts.map(p => p.z);
    if (jawZs.length === 0) {
      const score60 = Math.round(jawSharpScore * 0.70 + 65 * 0.30);
      return { score: clamp(score60, 0, 100), severity: chinSeverity(score60), future: chinFuture(score60), jawRatio };
    }
    const meanZ   = jawZs.reduce((a, b) => a + b, 0) / jawZs.length;
    const zVar    = jawZs.reduce((s, z) => s + (z - meanZ) ** 2, 0) / jawZs.length;
    // Normalize: ~0.0003 = flat/sagging, ~0.0015 = sharp jawline
    const contourScore = clamp(zVar / 0.0015 * 100, 0, 100);

    // ── Metric 3: Gravity sag from bottom-up photo (30%) ───────────
    // In bottom-up shot, gravity pulls soft tissue down → shows more sag
    // More jaw-width difference between bottom and neutral = more sag risk
    let gravityScore = 65; // default if no bottom photo

    if (bottomKP) {
      const chin_b     = get(bottomKP, CHIN);
      const jaw_lb     = get(bottomKP, 136);
      const jaw_rb     = get(bottomKP, 365);
      const forehead_b = get(bottomKP, FOREHEAD);

      if (chin_b && jaw_lb && jaw_rb && forehead_b) {
        const faceH_b   = dist(forehead_b, chin_b) || 1;
        const jawW_b    = dist2D(jaw_lb, jaw_rb);
        const jawRatio_b = jawW_b / faceH_b;

        // Sag differential: bottom-up shot shows more jaw width if sagging
        const sagDiff   = jawRatio_b - jawRatio;
        // sagDiff near 0 = minimal sag; sagDiff > 0.12 = significant sag
        gravityScore    = clamp(100 - Math.max(0, sagDiff) / 0.15 * 100, 0, 100);
      }
    }

    // ── Combined score ─────────────────────────────────────────
    const combined = jawSharpScore * 0.40 + contourScore * 0.30 + gravityScore * 0.30;
    const score    = clamp(Math.round(combined), 0, 100);

    return {
      score,
      severity: chinSeverity(score),
      future:   chinFuture(score),
      jawRatio: Math.round(jawRatio * 100) / 100,
      gravityScore: Math.round(gravityScore),
      contourScore: Math.round(contourScore),
    };
  }

  // ─── Severity labels ──────────────────────────────────────────
  function chinSeverity(s) {
    if (s >= 80) return { label: 'シャープ',    color: '#2ecc71', level: 0 };
    if (s >= 65) return { label: 'やや丸み',    color: '#27ae60', level: 1 };
    if (s >= 48) return { label: 'たるみあり',  color: '#f39c12', level: 2 };
    return             { label: '要ケア',       color: '#e74c3c', level: 3 };
  }

  function chinFuture(s) {
    if (s >= 80) return 'たるみリスク低い';
    if (s >= 65) return '数年後に注意が必要';
    if (s >= 48) return 'たるみが進行中';
    return             '早急なケアを推奨';
  }

  return { analyze };
})();
