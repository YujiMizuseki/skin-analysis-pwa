/**
 * camera.js
 * Camera stream and face detection overlay
 */
const Camera = (() => {
  let stream = null;
  let animFrame = null;
  let onFaceDetected = null;
  let isRunning = false;
  let lastKP = null;
  let frameCount = 0;
  let firstDetectTime = null;
  let timeoutTimer = null;

  const videoEl  = () => document.getElementById('video');
  const canvasEl = () => document.getElementById('overlay-canvas');
  const feedbackEl  = () => document.getElementById('face-feedback');
  const feedbackTxt = () => document.getElementById('feedback-text');

  async function start(onDetect) {
    onFaceDetected = onDetect;
    firstDetectTime = null;
    lastKP = null;
    frameCount = 0;

    const video = videoEl();
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      video.srcObject = stream;
      await new Promise(resolve => video.addEventListener('loadedmetadata', resolve, { once: true }));
      await video.play();
      isRunning = true;
      startDetectionLoop();

      // Fallback: enable capture button after 8 seconds even if no face detected
      timeoutTimer = setTimeout(() => {
        if (isRunning) {
          const fb = feedbackEl();
          const ft = feedbackTxt();
          if (fb) fb.className = 'face-feedback good';
          if (ft) ft.textContent = '⚠ 手動で撮影できます';
          // Notify app that we can proceed (with null kp = will use fallback analysis)
          if (onFaceDetected) onFaceDetected({ fallback: true });
        }
      }, 8000);

      return true;
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        throw new Error('カメラへのアクセスが拒否されました。設定からカメラを許可してください。');
      } else if (err.name === 'NotFoundError') {
        throw new Error('カメラが見つかりません。');
      }
      throw new Error('カメラの起動に失敗しました: ' + err.message);
    }
  }

  function stop() {
    isRunning = false;
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = null; }
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    const video = videoEl();
    if (video) video.srcObject = null;
  }

  function startDetectionLoop() {
    let isDetecting = false;

    const loop = async () => {
      if (!isRunning) return;
      const video = videoEl();

      if (video.readyState >= 2 && !isDetecting) {
        frameCount++;
        // Run detection every 2 frames for responsiveness
        if (frameCount % 2 === 0) {
          isDetecting = true;
          try {
            // Detect on a canvas snapshot for better compatibility
            const snap = document.createElement('canvas');
            snap.width  = video.videoWidth  || 320;
            snap.height = video.videoHeight || 240;
            const sCtx = snap.getContext('2d');
            sCtx.drawImage(video, 0, 0, snap.width, snap.height);

            const kp = await FaceDetector.detectFace(snap);
            lastKP = kp;

            if (kp && kp.length > 0 && !firstDetectTime) {
              firstDetectTime = Date.now();
              // Cancel the fallback timer once real detection succeeds
              if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = null; }
            }

            updateOverlay(kp, video);
            if (onFaceDetected) onFaceDetected(kp);
          } catch (e) {
            console.warn('Detection frame error:', e.message);
          } finally {
            isDetecting = false;
          }
        } else if (lastKP) {
          drawOverlay(lastKP, video);
        }
      }

      animFrame = requestAnimationFrame(loop);
    };
    loop();
  }

  function updateOverlay(kp, video) {
    const fb  = feedbackEl();
    const ft  = feedbackTxt();
    if (!fb || !ft) return;

    if (!kp || kp.length < 5) {
      const elapsed = firstDetectTime ? 0 : (frameCount > 30 ? frameCount / 30 : 0);
      fb.className = 'face-feedback detecting';
      ft.textContent = '顔を検出中...';
    } else {
      const hint = FaceDetector.getFaceHint ? FaceDetector.getFaceHint(kp) : null;
      if (hint) {
        fb.className = 'face-feedback detecting';
        ft.textContent = hint;
      } else {
        fb.className = 'face-feedback good';
        ft.textContent = '✓ 顔を検出しました';
      }
    }
    drawOverlay(kp, video);
  }

  function drawOverlay(kp, video) {
    const canvas = canvasEl();
    if (!canvas) return;
    const w = video.videoWidth  || canvas.offsetWidth;
    const h = video.videoHeight || canvas.offsetHeight;
    if (canvas.width !== w)  canvas.width  = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    if (!kp || kp.length < 5) return;

    const good  = FaceDetector.isFaceGood(kp);
    const color = good ? 'rgba(46,204,113,0.75)' : 'rgba(255,193,7,0.75)';

    ctx.fillStyle = color;
    for (let i = 0; i < kp.length; i += 3) {
      const p = kp[i];
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Key landmarks larger
    ctx.fillStyle = good ? 'rgba(46,204,113,1)' : 'rgba(255,193,7,1)';
    for (const i of [4, 10, 152, 33, 263, 61, 291]) {
      if (kp[i]) {
        ctx.beginPath();
        ctx.arc(kp[i].x, kp[i].y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  async function captureFrame() {
    const video = videoEl();
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    return canvas;
  }

  return { start, stop, captureFrame };
})();
