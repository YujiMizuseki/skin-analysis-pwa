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
    { id: 'neutral', emoji: '\ud83d\ude10', title: '\u6b63\u9762\u30fb\u7121\u8868\u60c5',
      desc: '\u30ab\u30e1\u30e9\u3092\u9854\u306e\u6b63\u9762\u306b\u5411\u3051\u3001<br>\u7121\u8868\u60c5\u306e\u307e\u307e\u9759\u6b62\u3057\u3066\u304f\u3060\u3055\u3044' },
    { id: 'smile',   emoji: '\ud83d\ude0a', title: '\u6b63\u9762\u30fb\u7b11\u9854',
      desc: '\u6b63\u9762\u3092\u5411\u3044\u305f\u307e\u307e\u3001<br>\u81ea\u7136\u306a\u7b11\u9854\u3092\u4f5c\u3063\u3066\u304f\u3060\u3055\u3044' },
    { id: 'bottom',  emoji: '\ud83d\udcf1', title: '\u771f\u4e0b\u304b\u3089\u64ae\u5f71',
      desc: '\u30b9\u30de\u30db\u3092\u984e\u306e\u4e0b\u306b\u7f6e\u3044\u3066<br>\u4e0a\u306b\u5411\u3051\u3066\u64ae\u5f71\u3057\u3066\u304f\u3060\u3055\u3044' },
  ];

  // ─── Screen management ───────────────────────────────────────────────────────
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + id);
    if (el) { el.classList.add('active'); el.scrollTop = 0; }
  }

  function showModal(text, sub) {
    document.getElementById('modal-text').textContent = text || 'AI\u30e2\u30c7\u30eb\u3092\u8aad\u307f\u8fbc\u307f\u4e2d...';
    const subEl = document.querySelector('.modal-sub');
    if (subEl) subEl.textContent = sub || '\u521d\u56de\u306f30\u79d2\u307b\u3069\u304b\u304b\u308a\u307e\u3059';
    document.getElementById('modal-loading').classList.remove('hidden');
  }

  function hideModal() {
    document.getElementById('modal-loading').classList.add('hidden');
  }

  function showError(title, msg) {
    document.getElementById('error-title').textContent = title || '\u30a8\u30e9\u30fc';
    document.getElementById('error-msg').textContent   = msg   || '\u4e0d\u660e\u306a\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f\u3002';
    document.getElementById('modal-loading').classList.add('hidden');
    document.getElementById('modal-error').classList.remove('hidden');
  }

  // ─── Step UI ─────────────────────────────────────────────────────────────────
  function updateStepUI(step) {
    const s = STEPS[step];
    document.getElementById('pose-emoji').textContent   = s.emoji;
    document.getElementById('step-title').textContent   = s.title;
    document.getElementById('step-desc').innerHTML      = s.desc;
    document.getElementById('step-label').textContent   = `${step + 1} / 3`;

    for (let i = 0; i < 3; i++) {
      const node = document.getElementById(`node-${i}`);
      const line = document.getElementById(`line-${i}`);
      if (!node) continue;
      node.classList.remove('active', 'done');
      if (i < step) node.classList.add('done');
      else if (i === step) node.classList.add('active');
      if (line) { line.classList.remove('done'); if (i < step) line.classList.add('done'); }
    }

    const btn = document.getElementById('btn-capture');
    btn.disabled = true;
    document.getElementById('capture-hint').textContent = '\u9854\u3092\u67a0\u5185\u306b\u5408\u308f\u305b\u3066\u304f\u3060\u3055\u3044';
  }

  // ─── Enable capture button ────────────────────────────────────────────────────
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

  // ─── Live face detection callback ────────────────────────────────────────────
  function onLiveFace(kp) {
    if (kp && kp.fallback) {
      fallbackMode = true;
      enableCapture('\u26a0 \u9854\u672a\u691c\u51fa\u3067\u3082\u64ae\u5f71\u3067\u304d\u307e\u3059\uff08\u7cbe\u5ea6\u4f4e\u4e0b\uff09');
      return;
    }
    if (FaceDetector.isFaceGood(kp)) {
      fallbackMode = true;
      const posHint = FaceDetector.getFaceHint ? FaceDetector.getFaceHint(kp) : null;
      enableCapture(posHint ? `\u26a0 ${posHint} \u2014 \u64ae\u5f71\u53ef` : '\u2713 \u6e96\u5099\u5b8c\u4e86\uff01\u30dc\u30bf\u30f3\u3092\u62bc\u3057\u3066\u64ae\u5f71');
    } else {
      disableCapture('\u9854\u3092\u67a0\u5185\u306b\u5408\u308f\u305b\u3066\u304f\u3060\u3055\u3044');
    }
  }

  // ─── Capture one photo ───────────────────────────────────────────────────────
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

      const thumbIdx = currentStep % 2;
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
          if (!captureInProgress) { fallbackMode = true; enableCapture('\u64ae\u5f71\u30dc\u30bf\u30f3\u3092\u62bc\u3057\u3066\u304f\u3060\u3055\u3044'); }
        }, 600);
      } else {
        Camera.stop();
        await runAnalysis();
      }
    } catch (err) {
      captureInProgress = false;
      showError('\u64ae\u5f71\u30a8\u30e9\u30fc', err.message);
      btn.disabled = false;
    }
  }

  // ─── Analysis pipeline ───────────────────────────────────────────────────────
  async function runAnalysis() {
    showScreen('processing');

    const setLog = (id, state) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('active', 'done'); el.classList.add(state);
      const txt = el.textContent.replace(/^[\u2b1c\ud83d\udd04\u2705]\s/, '');
      if (state === 'active') el.textContent = '\ud83d\udd04 ' + txt;
      if (state === 'done')   el.textContent = '\u2705 ' + txt;
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
      const neutralKP  = c0?.landmarks || null;
      const smileKP    = c1?.landmarks || null;
      const bottomKP   = c2?.landmarks || null;  // \u771f\u4e0b\u304b\u3089\u64ae\u5f71
      setLog('log-detect', 'done'); setProgress(22);

      setLog('log-nasolabial', 'active');
      const nasolabial = NasolabialAnalyzer.analyze(neutralKP);
      await sleep(250);
      setLog('log-nasolabial', 'done'); setProgress(35);

      setLog('log-marionette', 'active');
      const marionette = MarionetteAnalyzer.analyze(neutralKP, bottomKP);
      await sleep(250);
      setLog('log-marionette', 'done'); setProgress(47);

      setLog('log-cheek', 'active');
      const cheek = CheekAnalyzer.analyze(neutralKP, smileKP, bottomKP);
      await sleep(250);
      setLog('log-cheek', 'done'); setProgress(58);

      setLog('log-wrinkle', 'active');
      const wrinkle = WrinkleAnalyzer.analyze(neutralKP, smileKP);
      await sleep(250);
      setLog('log-wrinkle', 'done'); setProgress(68);

      setLog('log-bone', 'active');
      const bone = BoneStructureAnalyzer.analyze(neutralKP, smileKP, bottomKP);
      await sleep(250);
      setLog('log-bone', 'done'); setProgress(78);

      setLog('log-chin', 'active');
      const chin = ChinSagAnalyzer.analyze(neutralKP, bottomKP);
      await sleep(250);
      setLog('log-chin', 'done'); setProgress(88);

      setLog('log-score', 'active');
      const result = SkinAgeScorer.calculate(nasolabial, cheek, wrinkle, bone, marionette, chin);
      await sleep(400);
      setLog('log-score', 'done'); setProgress(100);

      await sleep(500);
      showResults(result);

    } catch (err) {
      showError('\u89e3\u6790\u30a8\u30e9\u30fc', '\u89e3\u6790\u4e2d\u306b\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f: ' + err.message);
    }
  }

  function showResults(result) {
    document.getElementById('results-body').innerHTML = ReportGenerator.generate(result);
    showScreen('results');
  }

  function shareResults() {
    if (navigator.share) {
      navigator.share({ title: '\u808c\u8a3a\u65adAI \u8a3a\u65ad\u7d50\u679c', url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href)
        .then(() => alert('URL\u3092\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f\uff01'))
        .catch(() => alert('\u30b7\u30a7\u30a2\u6a5f\u80fd\u306f\u3053\u306e\u30d6\u30e9\u30a6\u30b6\u3067\u306f\u5229\u7528\u3067\u304d\u307e\u305b\u3093\u3002'));
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
    showModal('AI\u30e2\u30c7\u30eb\u3092\u8aad\u307f\u8fbc\u307f\u4e2d...', '\u521d\u56de\u306f30\u79d2\u307b\u3069\u304b\u304b\u308a\u307e\u3059');
    try {
      if (!modelReady) {
        await FaceDetector.load(pct => {
          document.getElementById('modal-text').textContent =
            pct < 50 ? 'TensorFlow.js \u521d\u671f\u5316\u4e2d...' :
            pct < 90 ? '\u30e2\u30c7\u30eb\u3092\u30c0\u30a6\u30f3\u30ed\u30fc\u30c9\u4e2d...' : '\u3082\u3046\u3059\u3050\u5b8c\u4e86...';
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
      showError('\u521d\u671f\u5316\u30a8\u30e9\u30fc', err.message);
    }
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
