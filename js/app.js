/**
 * app.js - Main Application Controller
 */
const App = (() => {
  let currentStep = 0;
  let captures = [];
  let modelReady = false;
  let fallbackMode = false;   // true once 8s timeout fires or face detected
  let captureInProgress = false;

  const STEPS = [
    { id: 'neutral', emoji: '😐', title: '正面・無表情',
      desc: 'カメラを顔の正面に向け、<br>無表情のまま静止してください' },
    { id: 'smile',   emoji: '😊', title: '正面・笑顔',
      desc: '正面を向いたまま、<br>自然な笑顔を作ってください' },
    { id: 'down',    emoji: '😶', title: '少し下向き',
      desc: 'あごをやや引いて下向きに。<br>重力によるたるみを確認します' },
  ];

  // ─── Screen management ───────────────────────────────────────
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + id);
    if (el) { el.classList.add('active'); el.scrollTop = 0; }
  }

  function showModal(text, sub) {
    document.getElementById('modal-text').textContent = text || 'AIモデルを読み込み中...';
    const subEl = document.querySelector('.modal-sub');
    if (subEl) subEl.textContent = sub || '初回は30秒ほどかかります';
    document.getElementById('modal-loading').classList.remove('hidden');
  }

  function hideModal() {
    document.getElementById('modal-loading').classList.add('hidden');
  }

  function showError(title, msg) {
    document.getElementById('error-title').textContent = title || 'エラー';
    document.getElementById('error-msg').textContent   = msg   || '不明なエラーが発生しました。';
    document.getElementById('modal-loading').classList.add('hidden');
    document.getElementById('modal-error').classList.remove('hidden');
  }

  // ─── Step UI ─────────────────────────────────────────────────
  function updateStepUI(step) {
    const s = STEPS[step];
    document.getElementById('pose-emoji').textContent   = s.emoji;
    document.getElementById('step-title').textContent   = s.title;
    document.getElementById('step-desc').innerHTML      = s.desc;
    document.getElementById('step-label').textContent   = `${step + 1} / 3`;

    for (let i = 0; i < 3; i++) {
      const node = document.getElementById(`node-${i}`);
      const line = document.getElementById(`line-${i}`);
      node.classList.remove('active', 'done');
      if (i < step) node.classList.add('done');
      else if (i === step) node.classList.add('active');
      if (line) { line.classList.remove('done'); if (i < step) line.classList.add('done'); }
    }

    const btn = document.getElementById('btn-capture');
    btn.disabled = true;
    document.getElementById('capture-hint').textContent = '顔を枠内に合わせてください';
  }

  // ─── Enable capture button ────────────────────────────────────
  function enableCapture(hint) {
    if (captureInProgress) return;
    const btn  = document.getElementById('btn-capture');
    const htEl = document.getElementById('capture-hint');
    btn.disabled = false;
    if (hint && htEl) htEl.textContent = hint;
  }

  function disableCapture(hint) {
    if (fallbackMode || captureInProgress) return;
    const btn  = document.getElementById('btn-capture');
    const htEl = document.getElementById('capture-hint');
    btn.disabled = true;
    if (hint && htEl) htEl.textContent = hint;
  }

  // ─── Live face detection callback ────────────────────────────
  function onLiveFace(kp) {
    if (kp && kp.fallback) {
      fallbackMode = true;
      enableCapture('⚠ 顔未検出でも撮影できます（精度低下）');
      return;
    }
    if (FaceDetector.isFaceGood(kp)) {
      fallbackMode = true;
      const posHint = FaceDetector.getFaceHint ? FaceDetector.getFaceHint(kp) : null;
      enableCapture(posHint ? `⚠ ${posHint} — 撮影可` : '✓ 準備完了！ボタンを押して撮影');
    } else {
      disableCapture('顔を枠内に合わせてください');
    }
  }

  // ─── Capture one photo ───────────────────────────────────────
  async function capturePhoto() {
    if (captureInProgress) return;
    captureInProgress = true;
    const btn = document.getElementById('btn-capture');
    btn.disabled = true;

    try {
      const canvas = await Camera.captureFrame();
      let kp = null;
      try { kp = await FaceDetector.detectFace(canvas); } catch(e) {}
      captures.push({ canvas, landmarks: kp || null });

      const thumbIdx = currentStep < 2 ? currentStep : 1;
      const slot = document.getElementById(`thumb-${thumbIdx}`);
      if (slot) {
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/jpeg', 0.7);
        slot.innerHTML = ''; slot.appendChild(img);
      }

      const vp = document.querySelector('.camera-viewport');
      if (vp) { vp.style.filter = 'brightness(2.5)'; setTimeout(() => { vp.style.filter = ''; }, 120); }

      currentStep++;
      captureInProgress = false;

      if (currentStep < 3) {
        fallbackMode = false;
        updateStepUI(currentStep);
        setTimeout(() => {
          if (!captureInProgress) { fallbackMode = true; enableCapture('撮影ボタンを押してください'); }
        }, 600);
      } else {
        Camera.stop();
        await runAnalysis();
      }
    } catch (err) {
      captureInProgress = false;
      showError('撮影エラー', err.message);
      btn.disabled = false;
    }
  }

  // ─── Analysis pipeline ───────────────────────────────────────
  async function runAnalysis() {
    showScreen('processing');

    const setLog = (id, state) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('active', 'done'); el.classList.add(state);
      const txt = el.textContent.replace(/^[⬜🔄✅]\s/, '');
      if (state === 'active') el.textContent = '🔄 ' + txt;
      if (state === 'done')   el.textContent = '✅ ' + txt;
    };
    const setProgress = pct => {
      document.getElementById('progress-fill').style.width = pct + '%';
      document.getElementById('progress-pct').textContent  = pct + '%';
    };

    try {
      setLog('log-model', 'done'); setProgress(12);

      setLog('log-detect', 'active');
      await sleep(300);
      const [c0, c1, c2] = captures;
      const neutralKP = c0?.landmarks || null;
      const smileKP   = c1?.landmarks || null;
      const downKP    = c2?.landmarks || null;
      setLog('log-detect', 'done'); setProgress(25);

      setLog('log-nasolabial', 'active');
      const nasolabial = NasolabialAnalyzer.analyze(neutralKP);
      await sleep(250);
      setLog('log-nasolabial', 'done'); setProgress(38);

      setLog('log-marionette', 'active');
      const marionette = MarionetteAnalyzer.analyze(neutralKP, downKP);
      await sleep(250);
      setLog('log-marionette', 'done'); setProgress(50);

      setLog('log-cheek', 'active');
      const cheek = CheekAnalyzer.analyze(neutralKP, smileKP, downKP);
      await sleep(250);
      setLog('log-cheek', 'done'); setProgress(63);

      setLog('log-wrinkle', 'active');
      const wrinkle = WrinkleAnalyzer.analyze(neutralKP, smileKP);
      await sleep(250);
      setLog('log-wrinkle', 'done'); setProgress(76);

      setLog('log-bone', 'active');
      const bone = BoneStructureAnalyzer.analyze(neutralKP, smileKP, downKP);
      await sleep(250);
      setLog('log-bone', 'done'); setProgress(88);

      setLog('log-score', 'active');
      const result = SkinAgeScorer.calculate(nasolabial, cheek, wrinkle, bone, marionette);
      await sleep(400);
      setLog('log-score', 'done'); setProgress(100);

      await sleep(500);
      showResults(result);

    } catch (err) {
      showError('解析エラー', '解析中にエラーが発生しました: ' + err.message);
    }
  }

  function showResults(result) {
    document.getElementById('results-body').innerHTML = ReportGenerator.generate(result);
    showScreen('results');
  }

  function shareResults() {
    if (navigator.share) {
      navigator.share({ title: '肌診断AI 診断結果', url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href)
        .then(() => alert('URLをコピーしました！'))
        .catch(() => alert('シェア機能はこのブラウザでは利用できません。'));
    }
  }

  function reset() {
    currentStep = 0; captures = [];
    fallbackMode = false; captureInProgress = false;
    Camera.stop();
    showScreen('welcome');
    document.getElementById('results-body').innerHTML = '';
    ['thumb-0','thumb-1'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '';
    });
  }

  async function init() {
    document.getElementById('btn-start').addEventListener('click', startFlow);
    document.getElementById('btn-back-camera').addEventListener('click', () => { Camera.stop(); showScreen('welcome'); });
    document.getElementById('btn-capture').addEventListener('click', capturePhoto);
    document.getElementById('btn-retry').addEventListener('click', reset);
    document.getElementById('btn-share').addEventListener('click', shareResults);
    document.getElementById('btn-error-ok').addEventListener('click', () => {
      document.getElementById('modal-error').classList.add('hidden');
    });
    setTimeout(() => {
      FaceDetector.load((pct, msg) => console.log(`[Model] ${pct}% ${msg}`))
        .then(() => { modelReady = true; console.log('[App] Model ready'); })
        .catch(e => console.warn('[App] Preload failed:', e.message));
    }, 800);
  }

  async function startFlow() {
    showModal('AIモデルを読み込み中...', '初回は30秒ほどかかります');
    try {
      if (!modelReady) {
        await FaceDetector.load(pct => {
          document.getElementById('modal-text').textContent =
            pct < 50 ? 'TensorFlow.js 初期化中...' :
            pct < 90 ? 'モデルをダウンロード中...' : 'もうすぐ完了...';
        });
        modelReady = true;
      }
      hideModal();
      currentStep = 0; captures = [];
      fallbackMode = false; captureInProgress = false;
      updateStepUI(0);
      showScreen('camera');
      await Camera.start(onLiveFace);
    } catch (err) {
      hideModal();
      showError('初期化エラー', err.message);
    }
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
