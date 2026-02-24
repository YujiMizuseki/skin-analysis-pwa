/**
 * skinAgeScorer.js
 * Combines all feature scores into a final skin age estimate
 */
const SkinAgeScorer = (() => {
  function calculate(nasolabial, cheek, wrinkle, bone, marionette, chin) {
    const w = {
      nasolabial: 0.13,
      marionette: 0.11,
      chin:       0.10,
      cheek:      0.14,
      crowFeet:   0.10,
      glabellar:  0.10,
      eyelid:     0.08,
      bone:       0.09,
      elasticity: 0.07,
      underEye:   0.04,
      smile:      0.04
    };

    const mario    = marionette || { score: 68, severity: genericSeverity(68), skinContrib: 80, boneContrib: 20 };
    const chinData = chin       || { score: 65, severity: chinSeverity(65), future: '数年後に注意が必要' };

    const totalScore =
      (nasolabial.score              || 65) * w.nasolabial +
      mario.score                           * w.marionette +
      chinData.score                        * w.chin +
      (cheek.sagScore || cheek.score || 70) * w.cheek +
      (wrinkle.crowFeetScore         || 72) * w.crowFeet +
      (wrinkle.glabellarScore        || 72) * w.glabellar +
      (wrinkle.eyelidScore           || 72) * w.eyelid +
      (bone.score                    || 72) * w.bone +
      (cheek.elasticityScore         || 70) * w.elasticity +
      (wrinkle.underEyeScore         || 70) * w.underEye +
      (wrinkle.smileWrinkleScore     || 72) * w.smile;

    const rounded  = Math.round(totalScore);
    const ageRange = scoreToAge(rounded);
    const boneFactor = bone.boneFactor || 25;
    const skinFactor = 100 - boneFactor;

    // 11 feature items — fixed display order (top → bottom of face)
    const features = [
      // ─ 上顔面 ────────────────────────────────────────────
      {
        key: 'glabellar', name: '眉間のシワ', icon: '🧐',
        score: wrinkle.glabellarScore || 72,
        severity: glabellarSeverity(wrinkle.glabellarScore || 72),
        skinContrib: 92, boneContrib: 8
      },
      {
        key: 'eyelid', name: 'まぶたのたるみ', icon: '👁️',
        score: wrinkle.eyelidScore || 72,
        severity: eyelidSeverity(wrinkle.eyelidScore || 72),
        skinContrib: 70, boneContrib: 30
      },
      {
        key: 'crowFeet', name: '目尻のシワ', icon: '🌟',
        score: wrinkle.crowFeetScore || wrinkle.score || 72,
        severity: genericSeverity(wrinkle.crowFeetScore || wrinkle.score || 72),
        skinContrib: 85, boneContrib: 15
      },
      {
        key: 'underEye', name: '目の下', icon: '✨',
        score: wrinkle.underEyeScore || 70,
        severity: underEyeSeverity(wrinkle.underEyeScore || 70),
        skinContrib: 80, boneContrib: 20
      },
      // ─ 中顔面 ────────────────────────────────────────────
      {
        key: 'nasolabial', name: '法令線', icon: '👄',
        score: nasolabial.score || 65,
        severity: nasolabial.severity || genericSeverity(nasolabial.score || 65),
        skinContrib: 75, boneContrib: 25
      },
      {
        key: 'cheekSag', name: '頰のたるみ', icon: '💫',
        score: cheek.sagScore || cheek.score || 70,
        severity: genericSeverity(cheek.sagScore || cheek.score || 70),
        skinContrib: 70, boneContrib: 30
      },
      {
        key: 'elasticity', name: '肌の弾力', icon: '🌸',
        score: cheek.elasticityScore || 70,
        severity: elasticitySeverity(cheek.elasticityScore || 70),
        skinContrib: 90, boneContrib: 10
      },
      {
        key: 'smileWrinkle', name: '笑いジワ', icon: '😊',
        score: wrinkle.smileWrinkleScore || 72,
        severity: genericSeverity(wrinkle.smileWrinkleScore || 72),
        skinContrib: 90, boneContrib: 10
      },
      // ─ 下顔面 ──────────────────────────────────────────
      {
        key: 'marionette', name: 'マリオネットライン', icon: '🎭',
        score: mario.score,
        severity: mario.severity,
        skinContrib: mario.skinContrib, boneContrib: mario.boneContrib
      },
      {
        key: 'chin', name: '顎のたるみ', icon: '🪴',
        score: chinData.score,
        severity: chinData.severity,
        future: chinData.future,
        skinContrib: 65, boneContrib: 35
      },
      {
        key: 'jawLine', name: 'フェイスライン', icon: '🔷',
        score: bone.jawScore || 68,
        severity: jawSeverity(bone.jawScore || 68),
        skinContrib: 55, boneContrib: 45
      },
    ];

    return {
      totalScore: rounded, ageRange, boneFactor, skinFactor,
      features, grade: getGrade(rounded),
      rawData: { nasolabial, cheek, wrinkle, bone, marionette, chin: chinData }
    };
  }

  // ─── Severity helpers ───────────────────────────────────────────────
  function genericSeverity(s) {
    if (s >= 80) return { label: '優秀',   color: '#2ecc71', level: 0 };
    if (s >= 65) return { label: '良好',   color: '#27ae60', level: 1 };
    if (s >= 48) return { label: '注意',   color: '#f39c12', level: 2 };
    return            { label: '要ケア', color: '#e74c3c', level: 3 };
  }
  function glabellarSeverity(s) {
    if (s >= 80) return { label: 'なめらか',   color: '#2ecc71', level: 0 };
    if (s >= 65) return { label: '浅め',     color: '#f39c12', level: 1 };
    if (s >= 48) return { label: 'はっきり', color: '#e67e22', level: 2 };
    return            { label: '溺い',     color: '#e74c3c', level: 3 };
  }
  function eyelidSeverity(s) {
    if (s >= 80) return { label: 'ぱっちり',   color: '#2ecc71', level: 0 };
    if (s >= 65) return { label: 'やや挙れ',   color: '#27ae60', level: 1 };
    if (s >= 48) return { label: 'まぶた挙れ', color: '#f39c12', level: 2 };
    return            { label: 'フードあり', color: '#e74c3c', level: 3 };
  }
  function elasticitySeverity(s) {
    if (s >= 80) return { label: 'ハリあり',   color: '#2ecc71', level: 0 };
    if (s >= 65) return { label: '弾力あり',   color: '#27ae60', level: 1 };
    if (s >= 48) return { label: '弾力低下',   color: '#f39c12', level: 2 };
    return            { label: 'かなり低下', color: '#e74c3c', level: 3 };
  }
  function underEyeSeverity(s) {
    if (s >= 80) return { label: 'きれい',     color: '#2ecc71', level: 0 };
    if (s >= 65) return { label: 'やや影あり', color: '#27ae60', level: 1 };
    if (s >= 48) return { label: 'くすみあり', color: '#f39c12', level: 2 };
    return            { label: '要ケア',   color: '#e74c3c', level: 3 };
  }
  function chinSeverity(s) {
    if (s >= 80) return { label: 'シャープ',    color: '#2ecc71', level: 0 };
    if (s >= 65) return { label: 'やや丸み',    color: '#27ae60', level: 1 };
    if (s >= 48) return { label: 'たるみあり',  color: '#f39c12', level: 2 };
    return             { label: '要ケア',       color: '#e74c3c', level: 3 };
  }
  function jawSeverity(s) {
    if (s >= 80) return { label: 'シャープ',   color: '#3498db', level: 0 };
    if (s >= 65) return { label: '標準的',     color: '#2ecc71', level: 1 };
    if (s >= 48) return { label: 'やや丸み',   color: '#f39c12', level: 2 };
    return            { label: '輪郭ぼやけ', color: '#e67e22', level: 3 };
  }

  function scoreToAge(s) {
    if (s >= 90) return { min: 18, max: 23 };
    if (s >= 82) return { min: 24, max: 28 };
    if (s >= 74) return { min: 29, max: 34 };
    if (s >= 65) return { min: 35, max: 42 };
    if (s >= 54) return { min: 43, max: 50 };
    if (s >= 42) return { min: 51, max: 58 };
    return { min: 59, max: 70 };
  }

  function getGrade(s) {
    if (s >= 82) return { label: 'A', text: '非常に若々しい肌', color: '#2ecc71' };
    if (s >= 68) return { label: 'B', text: '年齢より若い肌',   color: '#27ae60' };
    if (s >= 54) return { label: 'C', text: '年齢相応の肌',     color: '#f39c12' };
    if (s >= 40) return { label: 'D', text: 'ケアが効果的な段階', color: '#e67e22' };
    return            { label: 'E', text: '積極的なケアを推奨', color: '#e74c3c' };
  }

  return { calculate };
})();
