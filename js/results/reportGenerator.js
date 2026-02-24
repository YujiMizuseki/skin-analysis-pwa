/**
 * reportGenerator.js
 * Generates the HTML report from analysis results
 */
const ReportGenerator = (() => {
  function generate(result, profile) {
    const { totalScore, ageRange, boneFactor, skinFactor, features, grade, relAge } = result;
    return `
      ${relAge ? relAgeCard(relAge, profile) : ''}
      ${skinAgeCard(totalScore, ageRange, grade)}
      ${factorCard(boneFactor, skinFactor)}
      ${featuresGrid(features)}
      ${improvementsSection(features)}
      <p class="disclaimer">
        \u26a0\ufe0f \u3053\u306e\u8a3a\u65ad\u306fAI\u306b\u3088\u308b\u63a8\u5b9a\u3067\u3042\u308a\u3001\u533b\u7642\u8a3a\u65ad\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002<br>
        \u7d50\u679c\u306f\u53c2\u8003\u3068\u3057\u3066\u3054\u6d3b\u7528\u304f\u3060\u3055\u3044\u3002\u5c02\u9580\u7684\u306a\u30b1\u30a2\u306b\u3064\u3044\u3066\u306f<br>
        \u76ae\u819a\u79d1\u30fb\u7f8e\u5bb9\u76ae\u819a\u79d1\u3078\u306e\u3054\u76f8\u8ac7\u3092\u304a\u52e7\u3081\u3057\u307e\u3059\u3002
      </p>
    `;
  }

  // ─── Relative age comparison card ────────────────────────────────
  function relAgeCard(relAge, profile) {
    const { diff, ageMidpoint, ageLabel } = relAge;
    const absDiff = Math.abs(diff);
    const genderLabel = !profile ? '' :
      profile.gender === 'female' ? '\ud83d\udc69 \u5973\u6027' :
      profile.gender === 'male'   ? '\ud83d\udc68 \u7537\u6027' : '';

    // Nearly identical (within 1 year)
    if (absDiff <= 1) {
      return `
        <div class="result-card" style="text-align:center;padding:20px 16px;">
          <p style="font-size:0.78rem;color:var(--text3);margin-bottom:8px;">\ud83d\udcca \u5b9f\u5e74\u9f62\u6bd4\u8f03\uff08${genderLabel}\u30fb${ageLabel}\uff09</p>
          <div style="font-size:1.05rem;font-weight:700;margin-bottom:4px;">\ud83c\udf1f \u5b9f\u5e74\u9f62\u3068\u540c\u7a0b\u5ea6\u306e\u808c\u5e74\u9f62\u3067\u3059</div>
          <p style="font-size:0.82rem;color:var(--text2);">\u63a8\u5b9a\u808c\u5e74\u9f62 <strong style="color:var(--text)">${ageMidpoint}\u6b73</strong> \u30fb\u5165\u529b\u5e74\u9f62 <strong style="color:var(--text)">${ageLabel}</strong></p>
        </div>
      `;
    }

    if (diff > 0) {
      // Looks younger than actual age
      return `
        <div class="result-card" style="text-align:center;padding:22px 16px;
          background:linear-gradient(135deg,rgba(46,204,113,0.12),rgba(39,174,96,0.08));
          border:1px solid rgba(46,204,113,0.3);">
          <p style="font-size:0.78rem;color:var(--text3);margin-bottom:10px;">\ud83d\udcca \u5b9f\u5e74\u9f62\u6bd4\u8f03\uff08${genderLabel}\u30fb${ageLabel}\uff09</p>
          <div style="display:flex;align-items:baseline;justify-content:center;gap:6px;">
            <span style="font-size:2.6rem;font-weight:900;color:#2ecc71;line-height:1;">${absDiff}</span>
            <span style="font-size:1.1rem;font-weight:700;color:#2ecc71;">\u6b73\u82e5\u304f\u898b\u3048\u307e\u3059\uff01</span>
          </div>
          <p style="font-size:0.82rem;color:var(--text2);margin-top:10px;">
            \u63a8\u5b9a\u808c\u5e74\u9f62 <strong style="color:#2ecc71">${ageMidpoint}\u6b73</strong> vs \u5b9f\u5e74\u9f62 <strong style="color:var(--text)">${ageLabel}</strong>
          </p>
          <div style="margin-top:12px;font-size:1.4rem;">\ud83c\udf89</div>
        </div>
      `;
    } else {
      // Looks older than actual age
      return `
        <div class="result-card" style="text-align:center;padding:22px 16px;
          background:linear-gradient(135deg,rgba(231,76,60,0.10),rgba(192,57,43,0.06));
          border:1px solid rgba(231,76,60,0.25);">
          <p style="font-size:0.78rem;color:var(--text3);margin-bottom:10px;">\ud83d\udcca \u5b9f\u5e74\u9f62\u6bd4\u8f03\uff08${genderLabel}\u30fb${ageLabel}\uff09</p>
          <div style="display:flex;align-items:baseline;justify-content:center;gap:6px;">
            <span style="font-size:2.6rem;font-weight:900;color:#e74c3c;line-height:1;">${absDiff}</span>
            <span style="font-size:1.1rem;font-weight:700;color:#e74c3c;">\u6b73\u8001\u3051\u3066\u898b\u3048\u307e\u3059</span>
          </div>
          <p style="font-size:0.82rem;color:var(--text2);margin-top:10px;">
            \u63a8\u5b9a\u808c\u5e74\u9f62 <strong style="color:#e74c3c">${ageMidpoint}\u6b73</strong> vs \u5b9f\u5e74\u9f62 <strong style="color:var(--text)">${ageLabel}</strong>
          </p>
          <p style="font-size:0.78rem;color:var(--text3);margin-top:6px;">\u30b1\u30a2\u3067\u5de5\u6c70\u3067\u304d\u308b\u5e74\u9f62\u3067\u3059\uff01\u4e0b\u306e\u6539\u5584\u30a2\u30c9\u30d0\u30a4\u30b9\u3092\u53c2\u8003\u306b\u3002</p>
        </div>
      `;
    }
  }

  // ─── Skin age card ───────────────────────────────────────────
  function skinAgeCard(score, ageRange, grade) {
    return `
      <div class="result-card skin-age-card">
        <p class="skin-age-label">\u808c\u306e\u898b\u305f\u76ee\u5e74\u9f62</p>
        <div class="skin-age-value">${ageRange.min}\u301c${ageRange.max}</div>
        <div class="skin-age-unit">\u6b73\u76f8\u5f53</div>
        <div style="margin-top:12px;display:flex;align-items:center;gap:8px;justify-content:center;">
          <span style="font-size:0.85rem;padding:4px 12px;border-radius:20px;
            background:${grade.color}22;color:${grade.color};font-weight:700;border:1px solid ${grade.color}44;">
            \u30b0\u30ec\u30fc\u30c9 ${grade.label}
          </span>
          <span style="font-size:0.85rem;color:var(--text2)">${grade.text}</span>
        </div>
        <div class="skin-score-bar">
          <span style="font-size:0.75rem;color:var(--text3)">0</span>
          <div class="score-track">
            <div class="score-fill" style="width:${score}%"></div>
          </div>
          <span style="font-size:0.75rem;color:var(--text3)">100</span>
        </div>
        <div class="score-labels">
          <span>\u8981\u6539\u5584</span>
          <span>\u82e5\u3005\u3057\u3044\u808c\u30b9\u30b3\u30a2: ${score}\u70b9</span>
          <span>\u6700\u9ad8</span>
        </div>
      </div>
    `;
  }

  // ─── Factor card ──────────────────────────────────────────
  function factorCard(boneFactor, skinFactor) {
    return `
      <div class="result-card factor-card">
        <p class="factor-title">\ud83d\udcca \u8001\u5316\u8981\u56e0\u306e\u5185\u8a33</p>
        <div class="factor-bars">
          <div class="factor-row">
            <span class="factor-label">\ud83e\uddb4 \u9aa8\u683c\u8981\u56e0</span>
            <div class="factor-bar-track">
              <div class="factor-bar-fill bone" style="width:${boneFactor}%"></div>
            </div>
            <span class="factor-pct" style="color:var(--accent3)">${boneFactor}%</span>
          </div>
          <div class="factor-row">
            <span class="factor-label">\u2728 \u808c\u30fb\u8edf\u7d44\u7e54</span>
            <div class="factor-bar-track">
              <div class="factor-bar-fill skin" style="width:${skinFactor}%"></div>
            </div>
            <span class="factor-pct" style="color:var(--accent)">${skinFactor}%</span>
          </div>
        </div>
        <p style="font-size:0.78rem;color:var(--text2);margin-top:12px;line-height:1.5;">
          \ud83d\udca1 \u9aa8\u683c\u8981\u56e0\u306f\u751f\u307e\u308c\u3064\u304d\u306e\u8981\u7d20\u3067\u3059\u3002<strong style="color:var(--text)">\u808c\u30fb\u8edf\u7d44\u7e54\u8981\u56e0\uff08${skinFactor}%\uff09</strong>\u306f\u30b1\u30a2\u3084\u65bd\u8853\u3067\u6539\u5584\u304c\u53ef\u80fd\u3067\u3059\u3002
        </p>
      </div>
    `;
  }

  // ─── Features grid ──────────────────────────────────────────
  function featuresGrid(features) {
    const cards = features.map(f => {
      const r = 17;
      const circ = 2 * Math.PI * r;
      const dash = (f.score / 100) * circ;
      const scoreColor =
        f.score >= 80 ? '#2ecc71' :
        f.score >= 65 ? '#27ae60' :
        f.score >= 48 ? '#f39c12' : '#e74c3c';

      const rating =
        f.score >= 80 ? { text: '\u512a\u79c0', bg: '#2ecc7122', border: '#2ecc7155' } :
        f.score >= 65 ? { text: '\u826f\u597d', bg: '#27ae6022', border: '#27ae6055' } :
        f.score >= 48 ? { text: '\u6ce8\u610f', bg: '#f39c1222', border: '#f39c1255' } :
                        { text: '\u8981\u30b1\u30a2', bg: '#e74c3c22', border: '#e74c3c55' };

      return `
        <div class="feature-score-card">
          <div class="fs-icon">${f.icon}</div>
          <div class="fs-name">${f.name}</div>
          <div class="fs-score-row">
            <svg class="fs-ring" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="${r}" fill="none" stroke="var(--bg)" stroke-width="3"/>
              <circle cx="20" cy="20" r="${r}" fill="none" stroke="${scoreColor}" stroke-width="3"
                stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}"
                stroke-linecap="round" transform="rotate(-90 20 20)"/>
            </svg>
            <div>
              <div class="fs-score-num" style="color:${scoreColor}">${f.score}</div>
              <div class="fs-severity" style="color:${f.severity?.color || '#a0a0c0'}">${f.severity?.label || ''}</div>
            </div>
          </div>
          <div style="margin-top:6px;">
            <span style="font-size:0.68rem;padding:2px 8px;border-radius:10px;
              background:${rating.bg};color:${f.severity?.color || scoreColor};
              border:1px solid ${rating.border};font-weight:600;">
              ${rating.text}
            </span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px;">
        <p class="section-title" style="margin:0">\ud83d\udccd \u90e8\u4f4d\u5225\u30b9\u30b3\u30a2</p>
        <span style="font-size:0.72rem;color:var(--text3);">
          100\u70b9 \uff1d \u6700\u3082\u82e5\u3005\u3057\u3044 \u2191
        </span>
      </div>
      <div class="features-grid">${cards}</div>
    `;
  }

  // ─── Improvement section ──────────────────────────────────
  function improvementsSection(features) {
    const worstFeatures = features.filter(f => f.score < 75);
    if (worstFeatures.length === 0) {
      return `
        <div class="result-card" style="text-align:center;padding:24px">
          <div style="font-size:2rem;margin-bottom:8px">\ud83c\udfc6</div>
          <p style="font-weight:700;margin-bottom:4px">\u7d20\u6674\u3089\u3057\u3044\u30b9\u30b3\u30a2\u3067\u3059\uff01</p>
          <p style="font-size:0.85rem;color:var(--text2)">\u73fe\u5728\u306e\u808c\u72b6\u6cc1\u3092\u7dad\u6301\u3059\u308b\u305f\u3081\u306e\u30b1\u30a2\u3092\u7d9a\u3051\u307e\u3057\u3087\u3046\u3002</p>
        </div>
      `;
    }

    const sorted = [...worstFeatures].sort((a, b) => a.score - b.score);
    const tiers = buildTiers(sorted);
    const html = tiers.map(tier => `
      <div class="improve-card">
        <div class="improve-tier">
          <span class="tier-badge tier-${tier.key}">${tier.label}</span>
          <span class="tier-cost">${tier.cost}</span>
        </div>
        <div class="improve-list">
          ${tier.items.map(item => `<span class="improve-tag">${item}</span>`).join('')}
        </div>
        <p class="timeline-text">\u231c ${tier.timeline}</p>
      </div>
    `).join('');

    return `
      <p class="section-title">\ud83d\udca1 \u6539\u5584\u30a2\u30c9\u30d0\u30a4\u30b9</p>
      ${html}
    `;
  }

  function buildTiers(features) {
    const has = key => features.some(f => f.key === key);

    const homeItems  = ['SPF50+ \u65e5\u7126\u3051\u6b62\u3081\uff08\u6bce\u65e5\uff09', '\u9ad8\u4fdd\u6e7f\u30af\u30ea\u30fc\u30e0\uff08\u671d\u30fb\u591c\uff09'];
    const proItems   = [];
    const medItems   = [];

    if (has('nasolabial')) {
      homeItems.push('\u30d5\u30a7\u30a4\u30b7\u30e3\u30eb\u30de\u30c3\u30b5\u30fc\u30b8\uff08\u307b\u3046\u308c\u3044\u7dda\uff09', '\u30ec\u30c1\u30ce\u30fc\u30eb\u542b\u6709\u30af\u30ea\u30fc\u30e0');
      proItems.push('EMS\u30d5\u30a7\u30a4\u30b7\u30e3\u30eb', '\u30e9\u30b8\u30aa\u6ce2\u30ea\u30d5\u30c8');
      medItems.push('\u30d2\u30a2\u30eb\u30ed\u30f3\u9178\u6ce8\u5165\uff08\u30d5\u30a3\u30e9\u30fc\uff09', '\u30b9\u30ec\u30c3\u30c9\u30ea\u30d5\u30c8');
    }
    if (has('cheekSag') || has('elasticity')) {
      homeItems.push('\u30b3\u30e9\u30fc\u30b2\u30f3\u30fb\u30a8\u30e9\u30b9\u30c1\u30f3\u88dc\u7d66\u30b5\u30d7\u30ea', '\u30d5\u30a7\u30a4\u30b9\u30a8\u30af\u30b5\u30b5\u30a4\u30ba');
      proItems.push('HIFU\uff08\u30a6\u30eb\u30bb\u30e9\u7b49\uff09', '\u30dd\u30ec\u30fc\u30b7\u30e7\u30f3\u5c0e\u5165');
      medItems.push('\u30b5\u30fc\u30de\u30af\u30fc\u30eb', '\u30ea\u30d5\u30c8\u30a2\u30c3\u30d7\u65bd\u8853');
    }
    if (has('crowFeet') || has('smileWrinkle')) {
      homeItems.push('\u30a2\u30a4\u30af\u30ea\u30fc\u30e0\uff08\u30ec\u30c1\u30ce\u30fc\u30eb\u30fb\u30da\u30d7\u30c1\u30c9\uff09', '\u6469\u64e6\u30ec\u30b9\u30b1\u30a2');
      proItems.push('\u30de\u30a4\u30af\u30ed\u30cb\u30fc\u30c9\u30ea\u30f3\u30b0', 'LED\u5149\u7642\u6cd5');
      medItems.push('\u30dc\u30c8\u30c3\u30af\u30b9\u6ce8\u5c04\uff08\u76ee\u5c3b\u30fb\u984d\uff09', '\u30d5\u30e9\u30af\u30b7\u30e7\u30ca\u30eb\u30ec\u30fc\u30b6\u30fc');
    }
    if (has('underEye')) {
      homeItems.push('\u30a2\u30a4\u30af\u30ea\u30fc\u30e0\uff08\u30ab\u30d5\u30a7\u30a4\u30f3\u30fb\u30d3\u30bf\u30df\u30f3C\uff09', '\u5341\u5206\u306a\u7756\u7720');
      proItems.push('\u76ee\u306e\u4e0b\u30dd\u30ec\u30fc\u30b7\u30e7\u30f3', '\u30a4\u30aa\u30f3\u5c0e\u5165\u30d3\u30bf\u30df\u30f3C');
      medItems.push('PRP\uff08\u591a\u8840\u5c0f\u677f\u8840\u6f4f\uff09\u6ce8\u5c04', '\u30ec\u30fc\u30b6\u30fc\u30c8\u30fc\u30cb\u30f3\u30b0');
    }
    if (has('chin')) {
      homeItems.push('\u984e\u4e0b\u30ea\u30f3\u30d1\u30de\u30c3\u30b5\u30fc\u30b8', '\u820c\u3092\u4e0a\u3042\u3054\u306b\u62bc\u3057\u5f53\u3066\u308b\u30c8\u30ec\u30fc\u30cb\u30f3\u30b0');
      proItems.push('\u984e\u4e0bHIFU', 'EMS\u30d5\u30a7\u30a4\u30b9\u30d9\u30eb\u30c8');
      medItems.push('\u984e\u4e0b\u8102\u80aa\u6ea2\u89e3\u6ce8\u5c04\uff08BNLS\uff09', '\u30a6\u30eb\u30bb\u30e9\uff08\u984e\u4e0b\u30ea\u30d5\u30c8\uff09');
    }
    if (has('jawLine')) {
      homeItems.push('\u5c0f\u9854\u30de\u30c3\u30b5\u30fc\u30b8\uff08\u8f2a\u90ed\u30b1\u30a2\uff09', '\u30ac\u30e0\u3092\u4f7f\u3063\u305f\u5492\u5618\u30c8\u30ec\u30fc\u30cb\u30f3\u30b0');
      proItems.push('\u8d85\u97f3\u6ce2\u30ea\u30d5\u30c8', 'HIFU\u984e\u30e9\u30a4\u30f3');
      medItems.push('\u30dc\u30c8\u30c3\u30af\u30b9\uff08\u30a8\u30e9\uff09', '\u305f\u308b\u307f\u5207\u958b\u30ea\u30d5\u30c8');
    }
    if (has('cheekbone')) {
      proItems.push('\u982c\u9aa8\u30cf\u30a4\u30e9\u30a4\u30c8\u30e1\u30a4\u30af\u6307\u5c0e');
      medItems.push('\u30d2\u30a2\u30eb\u30ed\u30f3\u9178\uff08\u982c\u9aa8\u5f62\u6210\uff09', '\u8102\u80aa\u6ce2\u5165');
    }

    return [
      { key: 'home',    label: '\u30db\u30fc\u30e0\u30b1\u30a2', cost: '\u67083,000\u301c15,000\u5186',
        timeline: '3\u301c6\u30f6\u6708\u3067\u52b9\u679c\u3092\u5b9f\u611f', items: [...new Set(homeItems)] },
      { key: 'pro',     label: '\u30d7\u30ed\u30b1\u30a2',   cost: '1\u56de5,000\u301c30,000\u5186',
        timeline: '1\u301c3\u30f6\u6708\u3067\u6539\u5584',     items: [...new Set(proItems)] },
      { key: 'medical', label: '\u533b\u7642\u51e6\u7f6e',   cost: '1\u56de30,000\u301c200,000\u5186',
        timeline: '\u5373\u65e5\u301c\u6570\u9031\u9593\u3067\u52b9\u679c', items: [...new Set(medItems)] },
    ].filter(t => t.items.length > 0);
  }

  return { generate };
})();
