/**
 * skinAgeScorer.js
 * Combines all feature scores into a final skin age estimate
 * Accepts optional profile {ageValue, ageLabel, gender} for relative-age comparison
 */
const SkinAgeScorer = (() => {
  function calculate(nasolabial, cheek, wrinkle, bone, marionette, chin, profile) {
    // Base weights (sum = 1.00)
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

    // Gender-based weight adjustment (male: bone is more dominant, skin wrinkles less so)
    if (profile && profile.gender === 'male') {
      w.bone     += 0.02;
      w.eyelid   -= 0.02;
      w.crowFeet += 0.01;
      w.cheek    -= 0.01;
    }

    const mario    = marionette || { score: 68, severity: genericSeverity(68), skinContrib: 80, boneContrib: 20 };
    const chinData = chin       || { score: 65, severity: chinSeverity(65), future: '\u6570\u5e74\u5f8c\u306b\u6ce8\u610f\u304c\u5fc5\u8981' };

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

    // ── Relative age comparison ───────────────────────────────────────
    let relAge = null;
    if (profile && profile.ageValue) {
      const ageMidpoint = (ageRange.min + ageRange.max) / 2;
      // diff > 0 means actual age > estimated skin age → looks younger
      // diff < 0 means actual age < estimated skin age → looks older
      const diff = Math.round(profile.ageValue - ageMidpoint);
      relAge = {
        diff,
        ageMidpoint: Math.round(ageMidpoint),
        ageValue: profile.ageValue,
        ageLabel: profile.ageLabel
      };
    }

    // 11 feature items — fixed display order (top → bottom of face)
    const features = [
      // ─ \u4e0a\u9854\u9762 ────────────────────────────────────────────
      {
        key: 'glabellar', name: '\u7709\u9593\u306e\u30b7\u30ef', icon: '\ud83e\uddd0',
        score: wrinkle.glabellarScore || 72,
        severity: glabellarSeverity(wrinkle.glabellarScore || 72),
        skinContrib: 92, boneContrib: 8
      },
      {
        key: 'eyelid', name: '\u307e\u3076\u305f\u306e\u305f\u308b\u307f', icon: '\ud83d\udc41\ufe0f',
        score: wrinkle.eyelidScore || 72,
        severity: eyelidSeverity(wrinkle.eyelidScore || 72),
        skinContrib: 70, boneContrib: 30
      },
      {
        key: 'crowFeet', name: '\u76ee\u5c3b\u306e\u30b7\u30ef', icon: '\ud83c\udf1f',
        score: wrinkle.crowFeetScore || wrinkle.score || 72,
        severity: genericSeverity(wrinkle.crowFeetScore || wrinkle.score || 72),
        skinContrib: 85, boneContrib: 15
      },
      {
        key: 'underEye', name: '\u76ee\u306e\u4e0b', icon: '\u2728',
        score: wrinkle.underEyeScore || 70,
        severity: underEyeSeverity(wrinkle.underEyeScore || 70),
        skinContrib: 80, boneContrib: 20
      },
      // ─ \u4e2d\u9854\u9762 ────────────────────────────────────────────
      {
        key: 'nasolabial', name: '\u6cd5\u4ee4\u7dda', icon: '\ud83d\udc44',
        score: nasolabial.score || 65,
        severity: nasolabial.severity || genericSeverity(nasolabial.score || 65),
        skinContrib: 75, boneContrib: 25
      },
      {
        key: 'cheekSag', name: '\u9830\u306e\u305f\u308b\u307f', icon: '\ud83d\udcab',
        score: cheek.sagScore || cheek.score || 70,
        severity: genericSeverity(cheek.sagScore || cheek.score || 70),
        skinContrib: 70, boneContrib: 30
      },
      {
        key: 'elasticity', name: '\u808c\u306e\u5f3e\u529b', icon: '\ud83c\udf38',
        score: cheek.elasticityScore || 70,
        severity: elasticitySeverity(cheek.elasticityScore || 70),
        skinContrib: 90, boneContrib: 10
      },
      {
        key: 'smileWrinkle', name: '\u7b11\u3044\u30b8\u30ef', icon: '\ud83d\ude0a',
        score: wrinkle.smileWrinkleScore || 72,
        severity: genericSeverity(wrinkle.smileWrinkleScore || 72),
        skinContrib: 90, boneContrib: 10
      },
      // ─ \u4e0b\u9854\u9762 ──────────────────────────────────────────
      {
        key: 'marionette', name: '\u30de\u30ea\u30aa\u30cd\u30c3\u30c8\u30e9\u30a4\u30f3', icon: '\ud83c\udfa4',
        score: mario.score,
        severity: mario.severity,
        skinContrib: mario.skinContrib, boneContrib: mario.boneContrib
      },
      {
        key: 'chin', name: '\u984e\u306e\u305f\u308b\u307f', icon: '\ud83e\udeb4',
        score: chinData.score,
        severity: chinData.severity,
        future: chinData.future,
        skinContrib: 65, boneContrib: 35
      },
      {
        key: 'jawLine', name: '\u30d5\u30a7\u30a4\u30b9\u30e9\u30a4\u30f3', icon: '\ud83d\udd37',
        score: bone.jawScore || 68,
        severity: jawSeverity(bone.jawScore || 68),
        skinContrib: 55, boneContrib: 45
      },
    ];

    return {
      totalScore: rounded, ageRange, boneFactor, skinFactor,
      features, grade: getGrade(rounded), relAge,
      rawData: { nasolabial, cheek, wrinkle, bone, marionette, chin: chinData }
    };
  }

  // ─── Severity helpers ────────────────────────────────────────────────────
  function genericSeverity(s) {
    if (s >= 80) return { label: '\u512a\u79c0',   color: '#2ecc71', level: 0 };
    if (s >= 65) return { label: '\u826f\u597d',   color: '#27ae60', level: 1 };
    if (s >= 48) return { label: '\u6ce8\u610f',   color: '#f39c12', level: 2 };
    return            { label: '\u8981\u30b1\u30a2', color: '#e74c3c', level: 3 };
  }
  function glabellarSeverity(s) {
    if (s >= 80) return { label: '\u306a\u3081\u3089\u304b',   color: '#2ecc71', level: 0 };
    if (s >= 65) return { label: '\u6d45\u3081',     color: '#f39c12', level: 1 };
    if (s >= 48) return { label: '\u306f\u3063\u304d\u308a', color: '#e67e22', level: 2 };
    return            { label: '\u6eba\u3044',     color: '#e74c3c', level: 3 };
  }
  function eyelidSeverity(s) {
    if (s >= 80) return { label: '\u3071\u3063\u3061\u308a',   color: '#2ecc71', level: 0 };
    if (s >= 65) return { label: '\u3084\u3084\u5439\u308c',   color: '#27ae60', level: 1 };
    if (s >= 48) return { label: '\u307e\u3076\u305f\u5439\u308c', color: '#f39c12', level: 2 };
    return            { label: '\u30d5\u30fc\u30c9\u3042\u308a', color: '#e74c3c', level: 3 };
  }
  function elasticitySeverity(s) {
    if (s >= 80) return { label: '\u30cf\u30ea\u3042\u308a',   color: '#2ecc71', level: 0 };
    if (s >= 65) return { label: '\u5f3e\u529b\u3042\u308a',   color: '#27ae60', level: 1 };
    if (s >= 48) return { label: '\u5f3e\u529b\u4f4e\u4e0b',   color: '#f39c12', level: 2 };
    return            { label: '\u304b\u306a\u308a\u4f4e\u4e0b', color: '#e74c3c', level: 3 };
  }
  function underEyeSeverity(s) {
    if (s >= 80) return { label: '\u304d\u308c\u3044',     color: '#2ecc71', level: 0 };
    if (s >= 65) return { label: '\u3084\u3084\u5f71\u3042\u308a', color: '#27ae60', level: 1 };
    if (s >= 48) return { label: '\u304f\u3059\u307f\u3042\u308a', color: '#f39c12', level: 2 };
    return            { label: '\u8981\u30b1\u30a2',   color: '#e74c3c', level: 3 };
  }
  function chinSeverity(s) {
    if (s >= 80) return { label: '\u30b7\u30e3\u30fc\u30d7',    color: '#2ecc71', level: 0 };
    if (s >= 65) return { label: '\u3084\u3084\u4e38\u307f',    color: '#27ae60', level: 1 };
    if (s >= 48) return { label: '\u305f\u308b\u307f\u3042\u308a',  color: '#f39c12', level: 2 };
    return             { label: '\u8981\u30b1\u30a2',       color: '#e74c3c', level: 3 };
  }
  function jawSeverity(s) {
    if (s >= 80) return { label: '\u30b7\u30e3\u30fc\u30d7',   color: '#3498db', level: 0 };
    if (s >= 65) return { label: '\u6a19\u6e96\u7684',     color: '#2ecc71', level: 1 };
    if (s >= 48) return { label: '\u3084\u3084\u4e38\u307f',   color: '#f39c12', level: 2 };
    return            { label: '\u8f2a\u90ed\u307c\u3084\u3051', color: '#e67e22', level: 3 };
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
    if (s >= 82) return { label: 'A', text: '\u975e\u5e38\u306b\u82e5\u3005\u3057\u3044\u808c', color: '#2ecc71' };
    if (s >= 68) return { label: 'B', text: '\u5e74\u9f62\u3088\u308a\u82e5\u3044\u808c',   color: '#27ae60' };
    if (s >= 54) return { label: 'C', text: '\u5e74\u9f62\u76f8\u5fdc\u306e\u808c',     color: '#f39c12' };
    if (s >= 40) return { label: 'D', text: '\u30b1\u30a2\u304c\u52b9\u679c\u7684\u306a\u6bb5\u968e', color: '#e67e22' };
    return            { label: 'E', text: '\u7a4d\u6975\u7684\u306a\u30b1\u30a2\u3092\u63a8\u5968', color: '#e74c3c' };
  }

  return { calculate };
})();
