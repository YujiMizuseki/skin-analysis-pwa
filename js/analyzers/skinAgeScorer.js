/**
 * skinAgeScorer.js
 * Combines all feature scores into a final skin age estimate
 */
const SkinAgeScorer = (() => {
  function calculate(nasolabial, cheek, wrinkle, bone) {
    // Weighted combination using primary scores
    const weights = {
      nasolabial: 0.22,
      cheek: 0.22,
      wrinkle: 0.20,
      bone: 0.18,
      elasticity: 0.10,
      underEye: 0.08
    };

    const totalScore =
      (nasolabial.score   || 65) * weights.nasolabial +
      (cheek.sagScore     || cheek.score || 70) * weights.cheek +
      (wrinkle.crowFeetScore || wrinkle.score || 72) * weights.wrinkle +
      (bone.score         || 72) * weights.bone +
      (cheek.elasticityScore || 70) * weights.elasticity +
      (wrinkle.underEyeScore || 70) * weights.underEye;

    const rounded = Math.round(totalScore);
    const ageRange = scoreToAge(rounded);
    const boneFactor = bone.boneFactor || 25;
    const skinFactor = 100 - boneFactor;

    // 8 feature items — fixed display order
    const features = [
      {
        key: 'nasolabial',
        name: '法令線',
        icon: '👄',
        score: nasolabial.score || 65,
        severity: nasolabial.severity || genericSeverity(nasolabial.score || 65),
        skinContrib: 75, boneContrib: 25
      },
      {
        key: 'cheekSag',
        name: '頬のたるみ',
        icon: '💫',
        score: cheek.sagScore || cheek.score || 70,
        severity: genericSeverity(cheek.sagScore || cheek.score || 70),
        skinContrib: 70, boneContrib: 30
      },
      {
        key: 'elasticity',
        name: '肌の弾力',
        icon: '🌸',
        score: cheek.elasticityScore || 70,
        severity: elasticitySeverity(cheek.elasticityScore || 70),
        skinContrib: 90, boneContrib: 10
      },
      {
        key: 'crowFeet',
        name: '目尻のシワ',
        icon: '👁️',
        score: wrinkle.crowFeetScore || wrinkle.score || 72,
        severity: genericSeverity(wrinkle.crowFeetScore || wrinkle.score || 72),
        skinContrib: 85, boneContrib: 15
      },
      {
        key: 'underEye',
        name: '目の下',
        icon: '✨',
        score: wrinkle.underEyeScore || 70,
        severity: underEyeSeverity(wrinkle.underEyeScore || 70),
        skinContrib: 80, boneContrib: 20
      },
      {
        key: 'smileWrinkle',
        name: '笑いジワ',
        icon: '😊',
        score: wrinkle.smileWrinkleScore || 72,
        severity: genericSeverity(wrinkle.smileWrinkleScore || 72),
        skinContrib: 90, boneContrib: 10
      },
      {
        key: 'jawLine',
        name: 'フェイスライン',
        icon: '🔷',
        score: bone.jawScore || 68,
        severity: jawSeverity(bone.jawScore || 68),
        skinContrib: 55, boneContrib: 45
      },
      {
        key: 'cheekbone',
        name: '頬骨・立体感',
        icon: '💎',
        score: bone.cheekScore || 72,
        severity: cheekboneSeverity(bone.cheekScore || 72),
        skinContrib: 25, boneContrib: 75
      },
    ];

    return {
      totalScore: rounded,
      ageRange,
      boneFactor,
      skinFactor,
      features,
      grade: getGrade(rounded),
      rawData: { nasolabial, cheek, wrinkle, bone }
    };
  }

  // ─── Severity helpers ────────────────────────────────────────
  function genericSeverity(score) {
    if (score >= 80) return { label: '優秀',   color: '#2ecc71', level: 0 };
    if (score >= 65) return { label: '良好',   color: '#27ae60', level: 1 };
    if (score >= 48) return { label: '注意',   color: '#f39c12', level: 2 };
    return              { label: '要ケア', color: '#e74c3c', level: 3 };
  }

  function elasticitySeverity(score) {
    if (score >= 80) return { label: 'ハリあり',   color: '#2ecc71', level: 0 };
    if (score >= 65) return { label: '弾力あり',   color: '#27ae60', level: 1 };
    if (score >= 48) return { label: '弾力低下',   color: '#f39c12', level: 2 };
    return              { label: 'かなり低下', color: '#e74c3c', level: 3 };
  }

  function underEyeSeverity(score) {
    if (score >= 80) return { label: 'きれい',   color: '#2ecc71', level: 0 };
    if (score >= 65) return { label: 'やや影あり', color: '#27ae60', level: 1 };
    if (score >= 48) return { label: 'くすみあり', color: '#f39c12', level: 2 };
    return              { label: '要ケア',   color: '#e74c3c', level: 3 };
  }

  function jawSeverity(score) {
    if (score >= 80) return { label: 'シャープ',   color: '#3498db', level: 0 };
    if (score >= 65) return { label: '標準的',     color: '#2ecc71', level: 1 };
    if (score >= 48) return { label: 'やや丸み',   color: '#f39c12', level: 2 };
    return              { label: '輪郭ぼやけ', color: '#e67e22', level: 3 };
  }

  function cheekboneSeverity(score) {
    if (score >= 80) return { label: '高い',   color: '#9b59b6', level: 0 };
    if (score >= 65) return { label: '標準',   color: '#3498db', level: 1 };
    if (score >= 48) return { label: 'やや低い', color: '#f39c12', level: 2 };
    return              { label: '低め',   color: '#e67e22', level: 3 };
  }

  // ─── Score → age range ──────────────────────────────────────
  function scoreToAge(score) {
    if (score >= 90) return { min: 18, max: 23 };
    if (score >= 82) return { min: 24, max: 28 };
    if (score >= 74) return { min: 29, max: 34 };
    if (score >= 65) return { min: 35, max: 42 };
    if (score >= 54) return { min: 43, max: 50 };
    if (score >= 42) return { min: 51, max: 58 };
    return { min: 59, max: 70 };
  }

  function getGrade(score) {
    if (score >= 82) return { label: 'A', text: '非常に若々しい肌', color: '#2ecc71' };
    if (score >= 68) return { label: 'B', text: '年齢より若い肌',   color: '#27ae60' };
    if (score >= 54) return { label: 'C', text: '年齢相応の肌',     color: '#f39c12' };
    if (score >= 40) return { label: 'D', text: 'ケアが効果的な段階', color: '#e67e22' };
    return              { label: 'E', text: '積極的なケアを推奨', color: '#e74c3c' };
  }

  return { calculate };
})();
