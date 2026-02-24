/**
 * faceDetector.js
 * TensorFlow.js MediaPipe Face Mesh wrapper
 */
const FaceDetector = (() => {
  let detector = null;
  let isLoading = false;

  // Key landmark indices (MediaPipe Face Mesh 468-point canonical model)
  // All from VIEWER's perspective
  const LM = {
    FOREHEAD:         10,
    NOSE_TIP:          4,
    NOSE_BRIDGE:       1,
    CHIN:            152,
    LEFT_EAR:        234,   // viewer's right ear on face
    RIGHT_EAR:       454,
    LEFT_EYE_OUTER:   33,
    LEFT_EYE_INNER:  133,
    RIGHT_EYE_OUTER: 263,
    RIGHT_EYE_INNER: 362,
    LEFT_EYE_TOP:    159,
    LEFT_EYE_BOT:    145,
    RIGHT_EYE_TOP:   386,
    RIGHT_EYE_BOT:   374,
    LEFT_NOSTRIL:     49,
    RIGHT_NOSTRIL:   279,
    LEFT_MOUTH:       61,
    RIGHT_MOUTH:     291,
    UPPER_LIP:         0,
    LOWER_LIP:        17,
    LEFT_CHEEK:      116,
    RIGHT_CHEEK:     345,
    LEFT_JAW:        172,
    RIGHT_JAW:       397,
    GLABELLA:        168,
    // Eye lateral corners for crow's feet
    LEFT_CROW:        33,
    RIGHT_CROW:      263,
    // Cheek area points
    LEFT_CHEEK_MID:  207,
    RIGHT_CHEEK_MID: 427,
    LEFT_CHEEK_LOW:  192,
    RIGHT_CHEEK_LOW: 416,
    // Nasolabial adjacent
    LEFT_NLF_MID:    206,
    RIGHT_NLF_MID:   426,
  };

  async function load(onProgress) {
    if (detector) return detector;
    if (isLoading) {
      return new Promise(resolve => {
        const checkLoaded = setInterval(() => {
          if (detector) { clearInterval(checkLoaded); resolve(detector); }
        }, 200);
      });
    }
    isLoading = true;
    try {
      if (onProgress) onProgress(10, 'TensorFlow.js 初期化中...');
      await tf.ready();
      if (onProgress) onProgress(30, 'Face Mesh モデルをダウンロード中...');
      detector = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {
          runtime: 'tfjs',
          refineLandmarks: false,
          maxFaces: 1,
        }
      );
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
    const faces = await detector.estimateFaces(source);
    if (!faces || faces.length === 0) return null;
    return faces[0].keypoints; // Array of {x, y, z, name}
  }

  function getFaceMetrics(kp) {
    const get = i => kp[i] || { x: 0, y: 0, z: 0 };
    // Face height: forehead to chin
    const fh = get(LM.FOREHEAD);
    const ch = get(LM.CHIN);
    const faceHeight = Math.hypot(fh.x - ch.x, fh.y - ch.y);
    // Face width: ear to ear
    const le = get(LM.LEFT_EAR);
    const re = get(LM.RIGHT_EAR);
    const faceWidth = Math.hypot(le.x - re.x, le.y - re.y);
    // Inter-pupillary distance
    const lEye = get(LM.LEFT_EYE_OUTER);
    const rEye = get(LM.RIGHT_EYE_OUTER);
    const ipd = Math.hypot(lEye.x - rEye.x, lEye.y - rEye.y);
    // Face center
    const cx = (fh.x + ch.x) / 2;
    const cy = (fh.y + ch.y) / 2;
    return { faceHeight, faceWidth, ipd, cx, cy, scale: faceHeight };
  }

  function isFaceGood(kp) {
    if (!kp || kp.length < 400) return false;
    const metrics = getFaceMetrics(kp);
    if (metrics.faceHeight < 80) return false; // too far
    // Check pose: nose should be between eyes horizontally
    const nose = kp[LM.NOSE_TIP];
    const lEye = kp[LM.LEFT_EYE_OUTER];
    const rEye = kp[LM.RIGHT_EYE_OUTER];
    if (!nose || !lEye || !rEye) return false;
    const eyeMidX = (lEye.x + rEye.x) / 2;
    const eyeMidY = (lEye.y + rEye.y) / 2;
    const noseOffset = Math.abs(nose.x - eyeMidX) / metrics.faceWidth;
    if (noseOffset > 0.25) return false; // too rotated
    return true;
  }

  return { load, detectFace, getFaceMetrics, isFaceGood, LM };
})();