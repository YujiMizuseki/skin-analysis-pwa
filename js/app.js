/**
 * app.js - Main Application Controller
 */
const App = (() => {
  // State
  let currentStep = 0;
  let captures = []; // {canvas, landmarks}
  let modelReady = false;

  const STEPS = [
    { id: 'neutral', emoji: '😐', title: '正面・無表情',
      desc: 'カメラを顔の正面に向け、<br>無表情のまま静止してください' },
    { id: 'smile', emoji: '😊', title: '正面・笑顔',
      desc: '正面を向いたまま、<br>自然な笑顔を作ってください' },
    { id: 'down', emoji: '😶', title: '少し下向き',
      desc: 'あごをやや引いて下向きに。<br>重力によるたるみを確認します' },
  ];

  // Screen management
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + id);
    if (el) {
      el.classList.add('active');
      el.scrollTop = 0;
    }
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
    document.getElementById('error-msg').textContent = msg || '不明なエラーが発生しました。';
    document.getElementById('modal-loading').classList.add('hidden');
    document.getElementById('modal-error').classList.remove('hidden');
  }

  // Step UI updates
  function updateStepUI(step) {
    const s = STEPS[step];
    document.getElementById('pose-emoji').textContent = s.emoji;
    document.getElementById('step-title').textContent = s.title;
    document.getElementById('step-desc').innerHTML = s.desc;
    document.getElementById('step-label').textContent = `${step + 1} / 3`;

    // Update step nodes
    for (let i = 0; i < 3; i++) {
      const node = document.getElementById(`node-${i}`);
      const line = document.getElementById(`line-${i}`);
      node.classList.remove('active', 'done');
      if (i < step) node.classList.add('done');
      else if (i === step) node.classList.add('active');
      if (line) {
        line.classList.remove('done');
        if (i < step) line.classList.add('done');
      }
    }

    // Reset capture button
    const btn = document.getElementById('btn-capture');
    btn.disabled = true;
    document.getElementById('capture-hint').textContent = '顔を枠内に合わせてください';
  }

  // Face detection callback during live preview
  function onLiveFace(kp) {
    const btn = document.getElementById('btn-capture');
    const hint = document.getElementById('capture-hint');
    if (FaceDetector.isFaceGood(kp)) {
      btn.disabled = false;
      hint.textContent = '✓ 準備完了！ボタンを押して撮影';
    } else {
      btn.disabled = true;
      if (!kp || kp.length < 100) {
        hint.textContent = '顔を枠内に合わせてください';
      } else {
        hint.textContent = '正面を向いてください';
      }
    }
  }

  // Capture one photo
  async function capturePhoto() {
    const btn = document.getElementById('btn-capture');
    btn.disabled = true;

    try {
      const canvas = await Camera.captureFrame();
      const kp = await FaceDetector.detectFace(canvas);

      if (!kp || kp.length < 100) {
        showError('顔を検出できませんでした', '明るい場所で、正面を向いて再度お試しください。');
        btn.disabled = false;
        return;
      }

      // Store capture
      captures.push({ canvas, landmarks: kp });

      // Show thumbnail
      const thumbSlot = document.getElementById(`thumb-${Math.min(currentStep, 1)}`);
      if (thumbSlot) {
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/jpeg', 0.7);
        thumbSlot.innerHTML = '';
        thumbSlot.appendChild(img);
      }

      // Flash effect
      const viewport = document.querySelector('.camera-viewport');
      if (viewport) {
        viewport.style.filter = 'brightness(2)';
        setTimeout(() => { viewport.style.filter = ''; }, 150);
      }

      currentStep++;

      if (currentStep < 3) {
        // Next step
        updateStepUI(currentStep);
        btn.disabled = true;
      } else {
        // All 3 captured – proceed to analysis
        Camera.stop();
        await runAnalysis();
      }
    } catch (err) {
      showError('撮影エラー', err.message);
      btn.disabled = false;
    }
  }

  // Analysis pipeline
  async function runAnalysis() {
    showScreen('processing');

    const setLog = (id, state) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('active', 'done');
      el.classList.add(state);
      if (state === 'active') el.textContent = '🔄 ' + el.textContent.slice(2);
      if (state === 'done')   el.textContent = '✅ ' + el.textContent.slice(2);
    };

    const setProgress = pct => {
      document.getElementById('progress-fill').style.width = pct + '%';
      document.getElementById('progress-pct').textContent = pct + '%';
    };

    try {
      setLog('log-model', 'done');
      setProgress(15);

      setLog('log-detect', 'active');
      await sleep(300);
      setProgress(25);

      const [neutralKP, smileKP, downKP] = captures.map(c => c.landmarks);
      setLog('log-detect', 'done');
      setProgress(35);

      setLog('log-nasolabial', 'active');
      const nasolabial = NasolabialAnalyzer.analyze(neutralKP);
      await sleep(400);
      setLog('log-nasolabial', 'done');
      setProgress(50);

      setLog('log-cheek', 'active');
      const cheek = CheekAnalyzer.analyze(neutralKP, smileKP, downKP);
      await sleep(400);
      setLog('log-cheek', 'done');
      setProgress(63);

      setLog('log-wrinkle', 'active');
      const wrinkle = WrinkleAnalyzer.analyze(neutralKP, smileKP);
      await sleep(400);
      setLog('log-wrinkle', 'done');
      setProgress(76);

      setLog('log-bone', 'active');
      const bone = BoneStructureAnalyzer.analyze(neutralKP, smileKP, downKP);
      await sleep(400);
      setLog('log-bone', 'done');
      setProgress(88);

      setLog('log-score', 'active');
      const result = SkinAgeScorer.calculate(nasolabial, cheek, wrinkle, bone);
      await sleep(500);
      setLog('log-score', 'done');
      setProgress(100);

      await sleep(600);
      showResults(result);

    } catch (err) {
      showError('解析エラー', '解析中にエラーが発生しました: ' + err.message);
    }
  }

  function showResults(result) {
    const html = ReportGenerator.generate(result);
    document.getElementById('results-body').innerHTML = html;
    showScreen('results');
  }

  // Share results
  function shareResults() {
    const body = document.getElementById('results-body');
    const text = body ? body.innerText.substring(0, 300) + '...' : '';
    if (navigator.share) {
      navigator.share({
        title: '肌診断AI 診断結果',
        text: `肌診断AIで診断しました！\n${text}`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href)
        .then(() => alert('URLをコピーしました！'))
        .catch(() => alert('シェア機能はこのブラウザでは利用できません。'));
    }
  }

  // Reset app
  function reset() {
    currentStep = 0;
    captures = [];
    Camera.stop();
    showScreen('welcome');
    document.getElementById('results-body').innerHTML = '';
    ['thumb-0', 'thumb-1'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '';
    });
  }

  // Init
  async function init() {
    // Bind events
    document.getElementById('btn-start').addEventListener('click', startFlow);
    document.getElementById('btn-back-camera').addEventListener('click', () => { Camera.stop(); showScreen('welcome'); });
    document.getElementById('btn-capture').addEventListener('click', capturePhoto);
    document.getElementById('btn-retry').addEventListener('click', reset);
    document.getElementById('btn-share').addEventListener('click', shareResults);
    document.getElementById('btn-error-ok').addEventListener('click', () => {
      document.getElementById('modal-error').classList.add('hidden');
    });

    // Preload model in background
    setTimeout(() => {
      FaceDetector.load((pct, msg) => {
        console.log(`Model loading: ${pct}% - ${msg}`);
      }).then(() => {
        modelReady = true;
        console.log('Face detection model ready');
      }).catch(err => console.warn('Preload failed:', err.message));
    }, 1000);
  }

  async function startFlow() {
    showModal('AIモデルを読み込み中...', '初回は30秒ほどかかります');
    try {
      if (!modelReady) {
        await FaceDetector.load((pct, msg) => {
          document.getElementById('modal-text').textContent = msg;
        });
        modelReady = true;
      }
      hideModal();
      currentStep = 0;
      captures = [];
      updateStepUI(0);
      showScreen('camera');
      await Camera.start(onLiveFace);
    } catch (err) {
      hideModal();
      showError('初期化エラー', err.message);
    }
  }

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());