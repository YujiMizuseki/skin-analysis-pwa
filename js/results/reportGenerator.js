/**
 * reportGenerator.js
 * Generates the HTML report from analysis results
 */
const ReportGenerator = (() => {
  function generate(result) {
    const { totalScore, ageRange, boneFactor, skinFactor, features, grade } = result;

    return `
      ${skinAgeCard(totalScore, ageRange, grade)}
      ${factorCard(boneFactor, skinFactor)}
      ${featuresGrid(features)}
      ${improvementsSection(features)}
      <p class="disclaimer">
        ⚠️ この診断はAIによる推定であり、医療診断ではありません。<br>
        結果は参考としてご活用ください。専門的なケアについては<br>
        皆膚科・美容皆膚科へのご相談をお勧めします。
      </p>
    `;
  }

  function skinAgeCard(score, ageRange, grade) {
    const fillPct = score;
    return `
      <div class="result-card skin-age-card">
        <p class="skin-age-label">肌の見た目年齢</p>
        <div class="skin-age-value">${ageRange.min}〜${ageRange.max}</div>
        <div class="skin-age-unit">歳相当</div>
        <div style="margin-top:12px; display:flex; align-items:center; gap:8px; justify-content:center;">
          <span style="font-size:0.85rem; padding:4px 12px; border-radius:20px;
            background:${grade.color}22; color:${grade.color}; font-weight:700; border:1px solid ${grade.color}44;">
            グレード ${grade.label}
          </span>
          <span style="font-size:0.85rem; color:var(--text2)">${grade.text}</span>
        </div>
        <div class="skin-score-bar">
          <span style="font-size:0.75rem;color:var(--text3)">0</span>
          <div class="score-track">
            <div class="score-fill" id="main-score-fill" style="width:${fillPct}%"></div>
          </div>
          <span style="font-size:0.75rem;color:var(--text3)">100</span>
        </div>
        <div class="score-labels">
          <span>要改善</span>
          <span>若々しい肌スコア: ${score}点</span>
          <span>最高</span>
        </div>
      </div>
    `;
  }

  function factorCard(boneFactor, skinFactor) {
    return `
      <div class="result-card factor-card">
        <p class="factor-title">📄 老化要因の内訳</p>
        <div class="factor-bars">
          <div class="factor-row">
            <span class="factor-label">🦴 骨格要因</span>
            <div class="factor-bar-track">
              <div class="factor-bar-fill bone" style="width:${boneFactor}%"></div>
            </div>
            <span class="factor-pct" style="color:var(--accent3)">${boneFactor}%</span>
          </div>
          <div class="factor-row">
            <span class="factor-label">✨ 肌・軟組織</span>
            <div class="factor-bar-track">
              <div class="factor-bar-fill skin" style="width:${skinFactor}%"></div>
            </div>
            <span class="factor-pct" style="color:var(--accent)">${skinFactor}%</span>
          </div>
        </div>
        <p style="font-size:0.78rem;color:var(--text2);margin-top:12px;line-height:1.5;">
          💡 骨格要因は生まれつきの要素です。<strong style="color:var(--text)">肌・軟組織要因（${skinFactor}%）</strong>はケアや施術で改善が可能です。
        </p>
      </div>
    `;
  }

  function featuresGrid(features) {
    const cards = features.map(f => {
      const r = 17;
      const circ = 2 * Math.PI * r;
      const dash = (f.score / 100) * circ;
      const scoreColor = f.score >= 75 ? '#2ecc71' : f.score >= 55 ? '#f39c12' : '#e74c3c';
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
        </div>
      `;
    }).join('');

    return `
      <p class="section-title">d 部位別スコア</p>
      <div class="features-grid">${cards}</div>
    `;
  }

  function improvementsSection(features) {
    const worstFeatures = features.filter(f => f.score < 75);
    if (worstFeatures.length === 0) {
      return `
        <div class="result-card" style="text-align:center;padding:24px">
          <div style="font-size:2rem;margin-bottom:8px">ud83c���</div>
          <p style="font-weight:700;margin-bottom:4px">素晦らしいスコアです！</p>
          <p style="font-size:0.85rem;color:var(--text2)">現在の肌状況を維持するためのケアを続けましょう。</p>
        </div>
      `;
    }

    const tiers = buildTiers(worstFeatures);
    const html = tiers.map(tier => `
      <div class="improve-card">
        <div class="improve-tier">
          <span class="tier-badge tier-${tier.key}">${tier.label}</span>
          <span class="tier-cost">${tier.cost}</span>
        </div>
        <div class="improve-list">
          ${tier.items.map(item => `<span class="improve-tag">${item}</span>`).join('')}
        </div>
        <p class="timeline-text">⌟ ${tier.timeline}</p>
      </div>
    `).join('');

    return `
      <p class="section-title">ud83d��� 改善アドバイス</p>
      ${html}
    `;
  }

  function buildTiers(features) {
    const hasNLF    = features.some(f => f.key === 'nasolabial');
    const hasCheek  = features.some(f => f.key === 'cheek');
    const hasWrinkle = features.some(f => f.key === 'wrinkle');

    const homeItems = ['SPF50+ 日焼け止め（每日）', '保湿クリーム（朝・夜）'];
    const proItems  = [];
    const medItems  = [];

    if (hasNLF) {
      homeItems.push('フェイシャルマッサージ（ほうれい線）', 'レチノール含有クリーム');
      proItems.push('EMSフェイシャル', 'ラジオ波リフト');
      medItems.push('ヒアルロン酸注入（フィラー）', 'スレッドリフト');
    }
    if (hasCheek) {
      homeItems.push('コラーゲン・エラスチン補給サプリ', 'フェイスエクササイズ');
      proItems.push('HIFU（ウルセラ等）', 'ポレーション導入');
      medItems.push('サーマクール', 'リフトアップ施術');
    }
    if (hasWrinkle) {
      homeItems.push('アイクリーム（レチノール・ペプチド）', '摸擦レスケア');
      proItems.push('マイクロニードリング', 'LED光療法');
      medItems.push('ボトックス注射（目尻）', 'フラクショナルレーザー');
    }

    return [
      { key: 'home', label: 'ホームケア', cost: '月3,000～15,000円',
        timeline: '3～6ヶ月で效果を実感', items: [...new Set(homeItems)] },
      { key: 'pro', label: 'プロケア', cost: '1回5,000～30,000円',
        timeline: '1～3ヶ月で改善', items: [...new Set(proItems)] },
      { key: 'medical', label: '医療処置', cost: '1回30,000～200,000円',
        timeline: '即日～数週間で効果', items: [...new Set(medItems)] },
    ].filter(t => t.items.length > 0);
  }

  return { generate };
})();