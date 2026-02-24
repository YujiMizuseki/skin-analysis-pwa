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
        皮膚科・美容皮膚科へのご相談をお勧めします。
      </p>
    `;
  }

  // ─── Skin age card ───────────────────────────────────────────
  function skinAgeCard(score, ageRange, grade) {
    return `
      <div class="result-card skin-age-card">
        <p class="skin-age-label">肌の見た目年齢</p>
        <div class="skin-age-value">${ageRange.min}〜${ageRange.max}</div>
        <div class="skin-age-unit">歳相当</div>
        <div style="margin-top:12px;display:flex;align-items:center;gap:8px;justify-content:center;">
          <span style="font-size:0.85rem;padding:4px 12px;border-radius:20px;
            background:${grade.color}22;color:${grade.color};font-weight:700;border:1px solid ${grade.color}44;">
            グレード ${grade.label}
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
          <span>要改善</span>
          <span>若々しい肌スコア: ${score}点</span>
          <span>最高</span>
        </div>
      </div>
    `;
  }

  // ─── Factor card ────────────────────────────────────────────
  function factorCard(boneFactor, skinFactor) {
    return `
      <div class="result-card factor-card">
        <p class="factor-title">📊 老化要因の内訳</p>
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

      // Rating badge
      const rating =
        f.score >= 80 ? { text: '優秀', bg: '#2ecc7122', border: '#2ecc7155' } :
        f.score >= 65 ? { text: '良好', bg: '#27ae6022', border: '#27ae6055' } :
        f.score >= 48 ? { text: '注意', bg: '#f39c1222', border: '#f39c1255' } :
                        { text: '要ケア', bg: '#e74c3c22', border: '#e74c3c55' };

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
        <p class="section-title" style="margin:0">📍 部位別スコア</p>
        <span style="font-size:0.72rem;color:var(--text3);">
          100点 ＝ 最も若々しい ↑
        </span>
      </div>
      <div class="features-grid">${cards}</div>
    `;
  }

  // ─── Improvement section ────────────────────────────────────
  function improvementsSection(features) {
    const worstFeatures = features.filter(f => f.score < 75);
    if (worstFeatures.length === 0) {
      return `
        <div class="result-card" style="text-align:center;padding:24px">
          <div style="font-size:2rem;margin-bottom:8px">🏆</div>
          <p style="font-weight:700;margin-bottom:4px">素晴らしいスコアです！</p>
          <p style="font-size:0.85rem;color:var(--text2)">現在の肌状況を維持するためのケアを続けましょう。</p>
        </div>
      `;
    }

    // Sort worst first for recommendations
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
        <p class="timeline-text">⌚ ${tier.timeline}</p>
      </div>
    `).join('');

    return `
      <p class="section-title">💡 改善アドバイス</p>
      ${html}
    `;
  }

  function buildTiers(features) {
    const has = key => features.some(f => f.key === key);

    const homeItems  = ['SPF50+ 日焼け止め（毎日）', '高保湿クリーム（朝・夜）'];
    const proItems   = [];
    const medItems   = [];

    if (has('nasolabial')) {
      homeItems.push('フェイシャルマッサージ（ほうれい線）', 'レチノール含有クリーム');
      proItems.push('EMSフェイシャル', 'ラジオ波リフト');
      medItems.push('ヒアルロン酸注入（フィラー）', 'スレッドリフト');
    }
    if (has('cheekSag') || has('elasticity')) {
      homeItems.push('コラーゲン・エラスチン補給サプリ', 'フェイスエクササイズ');
      proItems.push('HIFU（ウルセラ等）', 'ポレーション導入');
      medItems.push('サーマクール', 'リフトアップ施術');
    }
    if (has('crowFeet') || has('smileWrinkle')) {
      homeItems.push('アイクリーム（レチノール・ペプチド）', '摩擦レスケア');
      proItems.push('マイクロニードリング', 'LED光療法');
      medItems.push('ボトックス注射（目尻・額）', 'フラクショナルレーザー');
    }
    if (has('underEye')) {
      homeItems.push('アイクリーム（カフェイン・ビタミンC）', '十分な睡眠');
      proItems.push('目の下ポレーション', 'イオン導入ビタミンC');
      medItems.push('PRP（多血小板血漿）注射', 'レーザートーニング');
    }
    if (has('jawLine')) {
      homeItems.push('小顔マッサージ（輪郭ケア）', 'ガムを使った咀嚼トレーニング');
      proItems.push('超音波リフト', 'HIFU顎ライン');
      medItems.push('ボトックス（エラ）', 'たるみ切開リフト');
    }
    if (has('cheekbone')) {
      proItems.push('頬骨ハイライトメイク指導');
      medItems.push('ヒアルロン酸（頬骨形成）', '脂肪注入');
    }

    return [
      { key: 'home',    label: 'ホームケア', cost: '月3,000〜15,000円',
        timeline: '3〜6ヶ月で効果を実感', items: [...new Set(homeItems)] },
      { key: 'pro',     label: 'プロケア',   cost: '1回5,000〜30,000円',
        timeline: '1〜3ヶ月で改善',     items: [...new Set(proItems)] },
      { key: 'medical', label: '医療処置',   cost: '1回30,000〜200,000円',
        timeline: '即日〜数週間で効果', items: [...new Set(medItems)] },
    ].filter(t => t.items.length > 0);
  }

  return { generate };
})();
