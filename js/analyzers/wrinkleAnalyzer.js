/**
 * wrinkleAnalyzer.js
 * Analyzes wrinkles and eye-area aging:
 *   - Crow's feet (目尻のシワ)
 *   - Under-eye (目の下)
 *   - Smile wrinkles (笑いジワ)
 *   - Glabellar lines (眉間のシワ / 11ライン)
 *   - Eyelid hooding (まぶたのたるみ)
 */
const WrinkleAnalyzer = (() => {

  // ── Crow's feet region ──
  const L_CROW = [33, 7, 163, 144, 145, 153, 154, 155, 133];
  const R_CROW = [263, 249, 390, 373, 374, 380, 381, 382, 362];

  // ── Under-eye region ──
  const L_UNDER = [159, 158, 157, 173, 133, 155, 154, 153, 145];
  const R_UNDER = [386, 385, 384, 398, 362, 382, 381, 380, 374];

  // ── Glabellar region (between brows / 】6lines】7) ──
  const L_INNER_BROW = [107, 55, 65, 52, 53];
  const R_INNER_BROW = [336, 285, 295, 282, 283];
  const GLABELLA_CTR = [9, 8, 168];   // nose-bridge centre

  // ── Eye-openness landmarks ──
  const L_UPPER_LID = 159;  const L_LOWER_LID = 145;
  const L_EYE_IN    = 133;  const L_EYE_OUT   = 33;
  const R_UPPER_LID = 386;  const R_LOWER_LID = 374;
  const R_EYE_IN    = 362;  const R_EYE_OUT   = 263;

  // ── Reference ──
  const FOREHEAD = 10;
  const CHIN     = 152;

  function analyze(neutralKP, smileKP) {
    if (!neutralKP || neutralKP.length < 400) return defaultResult();

    const get = (kp, i) => (kp && kp[i]) ? kp[i] : { x: 0, y: 0, z: 0 };
    const fh = get(neutralKP, FOREHEAD);
    const ch = get(neutralKP, CHIN);
    const faceH = Math.hypot(fh.x - ch.x, fh.y - ch.y);
    if (faceH < 10) return defaultResult();

    // ── 1. Crow's feet (Z-variance) ──
    const lCrowZ = L_CROW.map(i => get(neutralKP, i).z);
    const rCrowZ = R_CROW.map(i => get(neutralKP, i).z);
    const crowVar = ((variance(lCrowZ) + variance(rCrowZ)) / 2) / (faceH * faceH);
    const crowFeetScore = clamp(100 - (crowVar / 0.0008) * 100, 0, 100);

    // ── 2. Under-eye ──
    const lUZ = L_UNDER.map(i => get(neutralKP, i).z);
    const rUZ = R_UNDER.map(i => get(neutralKP, i).z);
    const underVar = ((variance(lUZ) + variance(rUZ)) / 2) / (faceH * faceH);
    const underEyeScore = clamp(100 - (underVar / 0.0010) * 100, 0, 100);

    // ── 3. Smile wrinkles ──
    let smileWrinkleScore = 75;
    if (smileKP && smileKP.length > 400) {
      const lSZ = L_CROW.map(i => get(smileKP, i).z);
      const rSZ = R_CROW.map(i => get(smileKP, i).z);
      const smileVar = ((variance(lSZ) + variance(rSZ)) / 2) / (faceH * faceH);
      smileWrinkleScore = clamp(100 - (smileVar / 0.0012) * 100, 0, 100);
    }

    // ── 4. Glabellar lines (11ライン) ──
    // Z-variance in inner-brow + glabella region
    const lBrowZ = L_INNER_BROW.map(i => get(neutralKP, i).z);
    const rBrowZ = R_INNER_BROW.map(i => get(neutralKP, i).z);
    const ctrZ   = GLABELLA_CTR.map(i => get(neutralKP, i).z);
    const allBrowZ = [...lBrowZ, ...rBrowZ, ...ctrZ];
    const browVar = variance(allBrowZ) / (faceH * faceH);
    // Also measure inner-brow height asymmetry (furrowed = pushed down / together)
    const lBrowY = avg(L_INNER_BROW.map(i => get(neutralKP, i).y));
    const rBrowY = avg(R_INNER_BROW.map(i => get(neutralKP, i).y));
    const browAsym = Math.abs(lBrowY - rBrowY) / faceH;  // asymmetry
    const glabellarScore = clamp(
      100 - (browVar / 0.0009) * 60 - browAsym * 200,
      0, 100
    );

    // ── 5. Eyelid hooding (まぶたのたるみ) ──
    // Openness ratio = vertical eye height / horizontal eye width
    const lH = dist(get(neutralKP, L_UPPER_LID), get(neutralKP, L_LOWER_LID));
    const lW = dist(get(neutralKP, L_EYE_IN),    get(neutralKP, L_EYE_OUT));
    const rH = dist(get(neutralKP, R_UPPER_LID), get(neutralKP, R_LOWER_LID));
    const rW = dist(get(neutralKP, R_EYE_IN),    get(neutralKP, R_EYE_OUT));
    const lOpen = lW > 0 ? lH / lW : 0.28;
    const rOpen = rW > 0 ? rH / rW : 0.28;
    const openRatio = (lOpen + rOpen) / 2;
    // Ideal openness ~0.28-0.35; droopy eyelids <0.22
    const eyelidScore = clamp((openRatio - 0.18) / (0.36 - 0.18) * 100, 0, 100);

    const score = crowFeetScore * 0.35 + underEyeScore * 0.20 +
                  smileWrinkleScore * 0.15 + glabellarScore * 0.20 + eyelidScore * 0.10;

    return {
      score:            Math.round(score),
      crowFeetScore:    Math.round(crowFeetScore),
      underEyeScore:    Math.round(underEyeScore),
      smileWrinkleScore:Math.round(smileWrinkleScore),
      glabellarScore:   Math.round(glabellarScore),
      eyelidScore:      Math.round(eyelidScore),
      leftScore:  Math.round(clamp(100 - (variance(lCrowZ) / (faceH * faceH) / 0.0008) * 100, 0, 100)),
      rightScore: Math.round(clamp(100 - (variance(rCrowZ) / (faceH * faceH) / 0.0008) * 100, 0, 100)),
      severity: getSeverity(score),
      skinContrib: 88, boneContrib: 12
    };
  }

  function defaultResult() {
    const s = 72;
    return { score: s, crowFeetScore: s, underEyeScore: s, smileWrinkleScore: s,
             glabellarScore: s, eyelidScore: s,
             leftScore: s, rightScore: s,
             severity: getSeverity(s), skinContrib: 88, boneContrib: 12 };
  }

  function getSeverity(score) {
    if (score >= 80) return { label: 'ほぼなし',         color: '#2ecc71', level: 0 };
    if (score >= 65) return { label: '微細なシワ',     color: '#f39c12', level: 1 };
    if (score >= 45) return { label: 'はっきりしたシワ', color: '#e67e22', level: 2 };
    return              { label: '深いシワ',         color: '#e74c3c', level: 3 };
  }

  function variance(arr) {
    const m = avg(arr);
    return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
  }
  function avg(arr) { return arr.reduce((s, v) => s + v, 0) / arr.length; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));

  return { analyze };
})();
