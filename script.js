// ================= BASIC =================
let currentSize = 20;
let videoStream = null;
let gestureEnabled = false;
let cameraStarted = false;
let mode = "none";

// ================= ZOOM =================
function zoomIn() {
  currentSize += 2;
  applyZoom();
}

function zoomOut() {
  currentSize -= 2;
  applyZoom();
}

function applyZoom() {
  const el =
    document.getElementById("ashtakamText") ||
    document.getElementById("naamText");

  if (el) {
    el.style.fontSize = currentSize + "px";
  }
}

// ================= TOGGLE =================
function toggleGesture(el) {
  gestureEnabled = el.checked;

  if (gestureEnabled) {
    startCamera();
  } else {
    stopCamera();
  }

  updateBadge();
}

// ================= MODE =================
function changeMode(selected) {
  mode = selected;

  // reset tracking
  lastY = null;
  lastTime = 0;
  lastScrollTime = 0;
  lastHandY = null;
  lastHandTime = 0;
  lastHandScroll = 0;

  updateBadge();
}

// ================= VIDEO =================
const videoElement = document.createElement("video");
videoElement.style.display = "none";
document.body.appendChild(videoElement);

// ================= FACEMESH =================
const faceMesh = new FaceMesh({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7,
});

// ================= HEAD GESTURE =================
let lastY = null;
let lastTime = 0;
let lastScrollTime = 0;

faceMesh.onResults((results) => {
  if (!gestureEnabled || mode !== "head") return;

  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
    lastY = null;
    return;
  }

  const y = results.multiFaceLandmarks[0][1].y;
  let now = Date.now();

  if (lastY !== null) {
    let diff = y - lastY;
    let velocity = diff / (now - lastTime);

    if (Math.abs(velocity) > 0.00025 && now - lastScrollTime > 1000) {
      //sensitivity head adjustment
      const SCROLL_STEP = 600;

      window.scrollBy({
        top: velocity > 0 ? SCROLL_STEP : -SCROLL_STEP,
        behavior: "smooth",
      });

      lastScrollTime = now;
      return;
    }
  }

  lastY = y;
  lastTime = now;
});

// ================= HAND GESTURE =================
// ================= HAND =================
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7,
});

let lastHandY = null;
let lastHandTime = 0;
let lastHandScroll = 0;

hands.onResults((results) => {
  if (!gestureEnabled || mode !== "hand") return;

  const movementEl = document.getElementById("gestureMovement");

  // ❌ No hand
  if (!results.multiHandLandmarks?.length) {
    lastHandY = null;
    if (movementEl) movementEl.innerText = "No Hand";
    return;
  }

  const y = results.multiHandLandmarks[0][8].y;
  let now = Date.now();

  if (lastHandY !== null && lastHandTime !== 0) {
    // prevent fake spikes
    if (now - lastHandTime < 16) {
      lastHandY = y;
      lastHandTime = now;
      return;
    }

    let diff = y - lastHandY;
    let velocity = diff / (now - lastHandTime);

    const MIN_DISTANCE = 0.02;
    const HAND_THRESHOLD = 0.0015;
    const HAND_COOLDOWN = 500;
    const SCROLL_STEP = 700;

    if (
      Math.abs(diff) > MIN_DISTANCE &&
      Math.abs(velocity) > HAND_THRESHOLD &&
      now - lastHandScroll > HAND_COOLDOWN
    ) {
      const direction = velocity > 0 ? "DOWN" : "UP";

      if (movementEl) movementEl.innerText = direction;

      window.scrollBy({
        top: direction === "DOWN" ? SCROLL_STEP : -SCROLL_STEP,
        behavior: "smooth",
      });

      lastHandScroll = now;
    } else {
      if (movementEl) movementEl.innerText = "STABLE";
    }
  }

  lastHandY = y;
  lastHandTime = now;
});

// ================= CAMERA =================
const camera = new Camera(videoElement, {
  onFrame: async () => {
    if (!gestureEnabled) return;

    if (mode === "head") {
      await faceMesh.send({ image: videoElement });
    }

    if (mode === "hand") {
      if (videoElement.readyState === 4) {
        await hands.send({ image: videoElement });
      }
    }
  },
  width: 640,
  height: 480,
});

// ================= CAMERA CONTROL =================
async function startCamera() {
  if (!cameraStarted) {
    await camera.start();
    videoStream = videoElement.srcObject;
    cameraStarted = true;
  }
}

function stopCamera() {
  if (videoStream) {
    videoStream.getTracks().forEach((track) => track.stop());
    videoStream = null;
  }

  videoElement.srcObject = null;
  cameraStarted = false;
}

// ================= CAMERA CONTROL =================

window.onload = () => {
  const dropdown = document.querySelector(".gesture-mode");

  if (dropdown) {
    mode = dropdown.value;
  }

  updateBadge(); // 🔥 VERY IMPORTANT
};

function updateBadge() {
  const badge = document.getElementById("gestureBadge");
  const text = document.getElementById("badgeText");

  if (!badge || !text) return;

  if (!gestureEnabled) {
    badge.classList.remove("active");
    text.innerText = "CAM OFF| NONE";
    return;
  }

  badge.classList.add("active");

  const currentMode = mode.toUpperCase();

  text.innerText =
    mode === "none" ? "CAM ON   | NONE" : "CAM ON   | " + currentMode;
}
