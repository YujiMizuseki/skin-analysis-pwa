/**
 * skinAgeScorer.js
 * Combines all feature scores into a final skin age estimate
 */
const SkinAgeScorer = (() => {
  function calculate(nasolabial, cheek, wrinkle, bone) {
    // Weighted combination
    const weights = {
      nasolabial: 0.28,
      cheek: 0.28,
      wrinkle: 0.22,
      bone: 0.22
    };

    const totalScore =
      (nasolabial.score || 65) * weights.nasolabial +
      (cheek.score || 70) * weights.cheek +
      (wrinkle.score || 72) * weights.wrinkle +
      (bone.score || 72) * weights.bone;

    const rounded = Math.round(totalScore);

    // Map score to apparent age range
    const ageRange = scoreToAge(rounded);

    // Skin vs bone factor from bone analyzer
    const boneFactor = bone.boneFactor || 25;
    const skinFactor = 100 - boneFactor;

    // Identify top improvements (lowest scoring features)
    const features = [
      { key: 'nasolabial', name: '法令線', icon: '👄', score: nasolabial.score || 65,
        severity: nasolabial.severity, skinContrib: nasolabial.skinContrib || 75, boneContrib: nasolabial.boneContrib || 25 },
      { key: 'cheek', name: '頬のたるみ', icon: '💫', score: cheek.score || 70,
        severity: cheek.severity, skinContrib: cheek.skinContrib || 70, boneContrib: cheek.boneContrib || 30 },
      { key: 'wrinkle', name: '目尻のシワ', icon: '👁', score: wrinkle.score || 72,
        severity: wrinkle.severity, skinContrib: wrinkle.skinContrib || 85, boneContrib: wrinkle.boneContrib || 15 },
      { key: 'faceContour', name: 'フェイスライン', icon: '✨', score: bone.jawScore || 68,
        severity: bone.severity, skinContrib: 60, boneContrib: 40 },
    ].sort((a, b) => a.score - b.score);

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

  function scoreToAge(score) {
    if (score >= 90) return { min: 18, max: 23, label: '18〜23歳相当' };
    if (score >= 82) return { min: 24, max: 28, label: '24〜28歳相当' };
    if (score >= 74) return { min: 29, max: 34, label: '29〜34歳相当' };
    if (score >= 65) return { min: 35, max: 42, label: '35〜42歳相当' };
    if (score >= 54) return { min: 43, max: 50, label: '43〜50歳相当' };
    if (score >= 42) return { min: 51, max: 58, label: '51〜58歳相当' };
    return { min: 59, max: 70, label: '59歳以上相当' };
  }

  function getGrade(score) {
    if (score >= 82) return { label: 'A', text: '非常に若々しい肌', color: '#2ecc71' };
    if (score >= 68) return { label: 'B', text: '年齢より若い肌', color: '#27ae60' };
    if (score >= 54) return { label: 'C', text: '年齢相応の肌', color: '#f39c12' };
    if (score >= 40) return { label: 'D', text: 'ケアが効果的な段階', color: '#e67e22' };
    return { label: 'E', text: '積極的なケアを推奨', color: '#e74c3c' };
  }

  return { calculate };
})();