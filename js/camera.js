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
  let detectCooldown = 0;

  const videoEl = () => document.getElementById('video');
  const canvasEl = () => document.getElementById('overlay-canvas');
  const feedbackEl = () => document.getElementById('face-feedback');
  const feedbackTxt = () => document.getElementById('feedback-text');

  async function start(onDetect) {
    onFaceDetected = onDetect;
    const video = videoEl();
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      video.srcObject = stream;
      await new Promise(resolve => video.addEventListener('loadedmetadata', resolve, { once: true }));
      await video.play();
      isRunning = true;
      startDetectionLoop();
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
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    const video = videoEl();
    if (video) video.srcObject = null;
  }

  function startDetectionLoop() {
    const loop = async () => {
      if (!isRunning) return;
      const video = videoEl();
      if (video.readyState === 4) {
        try {
          detectCooldown++;
          if (detectCooldown % 3 === 0) { // detect every 3 frames
            const kp = await FaceDetector.detectFace(video);
            lastKP = kp;
            updateOverlay(kp, video);
            if (onFaceDetected) onFaceDetected(kp);
          } else if (lastKP) {
            drawOverlay(lastKP, video);
          }
        } catch (e) {
          // detection error - continue
        }
      }
      animFrame = requestAnimationFrame(loop);
    };
    loop();
  }

  function updateOverlay(kp, video) {
    const fb = feedbackEl();
    const ft = feedbackTxt();
    if (!kp || kp.length < 100) {
      fb.className = 'face-feedback detecting';
      ft.textContent = '顔を検出中...';
    } else if (!FaceDetector.isFaceGood(kp)) {
      fb.className = 'face-feedback detecting';
      ft.textContent = '正面を向いてください';
    } else {
      fb.className = 'face-feedback good';
      ft.textContent = '✓ 顔を検出しました';
    }
    drawOverlay(kp, video);
  }

  function drawOverlay(kp, video) {
    const canvas = canvasEl();
    if (!canvas || !kp) return;
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!kp || kp.length < 100) return;

    const good = FaceDetector.isFaceGood(kp);
    const color = good ? 'rgba(46,204,113,0.8)' : 'rgba(255,193,7,0.8)';

    // Draw face mesh (subset of landmarks)
    ctx.fillStyle = color;
    const step = 4; // draw every 4th point for performance
    for (let i = 0; i < kp.length; i += step) {
      const p = kp[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Highlight key landmarks
    ctx.fillStyle = good ? 'rgba(46,204,113,1)' : 'rgba(255,193,7,1)';
    const keyPts = [4, 10, 152, 33, 263, 61, 291, 49, 279];
    for (const i of keyPts) {
      if (kp[i]) {
        ctx.beginPath();
        ctx.arc(kp[i].x, kp[i].y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  async function captureFrame() {
    const video = videoEl();
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    return canvas;
  }

  return { start, stop, captureFrame };
})();