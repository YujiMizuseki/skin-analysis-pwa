/**
 * faceDetector.js
 * TensorFlow.js MediaPipe Face Mesh wrapper
 */
const FaceDetector = (() => {
  let detector = null;
  let isLoading = false;

  const LM = {
    FOREHEAD:        10,
    NOSE_TIP:         4,
    NOSE_BRIDGE:      1,
    CHIN:           152,
    LEFT_EAR:       234,
    RIGHT_EAR:      454,
    LEFT_EYE_OUTER:  33,
    LEFT_EYE_INNER: 133,
    RIGHT_EYE_OUTER:263,
    RIGHT_EYE_INNER:362,
    LEFT_EYE_TOP:   159,
    LEFT_EYE_BOT:   145,
    RIGHT_EYE_TOP:  386,
    RIGHT_EYE_BOT:  374,
    LEFT_NOSTRIL:    49,
    RIGHT_NOSTRIL:  279,
    LEFT_MOUTH:      61,
    RIGHT_MOUTH:    291,
    UPPER_LIP:        0,
    LOWER_LIP:       17,
    LEFT_CHEEK:     116,
    RIGHT_CHEEK:    345,
    LEFT_JAW:       172,
    RIGHT_JAW:      397,
    GLABELLA:       168,
    LEFT_CROW:       33,
    RIGHT_CROW:     263,
    LEFT_CHEEK_MID: 207,
    RIGHT_CHEEK_MID:427,
    LEFT_CHEEK_LOW: 192,
    RIGHT_CHEEK_LOW:416,
    LEFT_NLF_MID:   206,
    RIGHT_NLF_MID:  426,
  };

  async function load(onProgress) {
    if (detector) return detector;
    if (isLoading) {
      return new Promise(resolve => {
        const t = setInterval(() => {
          if (detector) { clearInterval(t); resolve(detector); }
        }, 300);
      });
    }
    isLoading = true;
    try {
      if (onProgress) onProgress(10, 'TensorFlow.js 初期化中...');
      await tf.ready();

      if (onProgress) onProgress(30, 'Face Mesh モデルをダウンロード中...');

      // Try WebGL first, fall back to WASM/CPU
      let loadOk = false;
      try {
        await tf.setBackend('webgl');
        await tf.ready();
        loadOk = true;
      } catch(e) {
        console.warn('WebGL not available, trying WASM/CPU');
      }

      detector = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {
          runtime: 'tfjs',
          refineLandmarks: false,
          maxFaces: 1,
        }
      );

      // Warm-up run to pre-compile shaders
      if (onProgress) onProgress(80, 'モデルを最適化中...');
      try {
        const warmupCanvas = document.createElement('canvas');
        warmupCanvas.width = 64; warmupCanvas.height = 64;
        await detector.estimateFaces(warmupCanvas);
      } catch(e) { /* warm-up failed - ok */ }

      if (onProgress) onProgress(100, 'モデル読み込み完了');
      isLoading = false;
      return detector;
    } catch (err) {
      isLoading = false;
      throw new Error('モデルの読み込みに失敗しました: ' + err.message);
    }
  }

  async function detectFace(source) {
    if (!detector) throw new Error('モデルが読み込まれていません');
    try {
      const faces = await detector.estimateFaces(source);
      if (!faces || faces.length === 0) return null;
      return faces[0].keypoints;
    } catch(e) {
      console.warn('detectFace error:', e.message);
      return null;
    }
  }

  function getFaceMetrics(kp) {
    const get = i => (kp[i]) || { x: 0, y: 0, z: 0 };
    const fh = get(LM.FOREHEAD);
    const ch = get(LM.CHIN);
    const faceHeight = Math.hypot(fh.x - ch.x, fh.y - ch.y);
    const le = get(LM.LEFT_EAR);
    const re = get(LM.RIGHT_EAR);
    const faceWidth = Math.hypot(le.x - re.x, le.y - re.y);
    const lEye = get(LM.LEFT_EYE_OUTER);
    const rEye = get(LM.RIGHT_EYE_OUTER);
    const ipd = Math.hypot(lEye.x - rEye.x, lEye.y - rEye.y);
    const cx = (fh.x + ch.x) / 2;
    const cy = (fh.y + ch.y) / 2;
    return { faceHeight, faceWidth, ipd, cx, cy, scale: faceHeight };
  }

  // isFaceGood: permissive check — any detected face passes
  function isFaceGood(kp) {
    if (!kp || kp.length < 10) return false;
    // Accept any face regardless of size or pose
    return true;
  }

  // isFaceIdeal: stricter check for quality guidance (non-blocking)
  function isFaceIdeal(kp) {
    if (!kp || kp.length < 200) return false;
    const metrics = getFaceMetrics(kp);
    if (metrics.faceHeight < 50) return false; // too small/far
    return true;
  }

  function getFaceHint(kp) {
    if (!kp || kp.length < 10) return null;
    const metrics = getFaceMetrics(kp);
    if (metrics.faceHeight < 50) return 'もう少し近づいてください';
    if (metrics.faceWidth > 0) {
      const nose = kp[LM.NOSE_TIP];
      const lEye = kp[LM.LEFT_EYE_OUTER];
      const rEye = kp[LM.RIGHT_EYE_OUTER];
      if (nose && lEye && rEye && metrics.faceWidth > 0) {
        const offset = Math.abs(nose.x - (lEye.x + rEye.x) / 2) / metrics.faceWidth;
        if (offset > 0.30) return '正面を向いてください';
      }
    }
    return null;
  }

  return { load, detectFace, getFaceMetrics, isFaceGood, isFaceIdeal, getFaceHint, LM };
})();
