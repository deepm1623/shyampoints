import { Html5Qrcode } from "https://unpkg.com/html5-qrcode@2.3.8/esm/html5-qrcode.js";
import { bootProtected, $, emptyState, toast } from "./app-core.js";
import { subscribeTransactions, formatTimestamp } from "./firestore-service.js";
import { scanQrViaApi, ApiError } from "./api-client.js";
import { API_BASE } from "./api-config.js";

let scanner = null;
let scanning = false;
let scanUser = null;
let txUnsub = null;
let cameras = [];
let currentCameraIndex = 0;
let torchOn = false;
let torchSupported = false;
let pageReady = false;

function setStatus(text) {
  const el = $("#scanner-status");
  if (el) el.textContent = text;
}

function setLoading(on) {
  $("#scanner-loading")?.classList.toggle("hidden", !on);
}

function setLastScanned(code) {
  const el = $("#last-scanned-code");
  if (el) el.textContent = code || "—";
}

function showCameraError(message) {
  const el = $("#scanner-camera-error");
  if (el) {
    el.removeAttribute("hidden");
    const p = el.querySelector("p");
    if (p) p.textContent = message;
  }
  $("#scanner-frame")?.classList.add("scanner-unavailable");
}

function hideCameraError() {
  const el = $("#scanner-camera-error");
  if (el) el.setAttribute("hidden", "");
  $("#scanner-frame")?.classList.remove("scanner-unavailable");
}

function flashSuccess() {
  $("#scanner-frame")?.classList.add("scan-success-flash");
  setTimeout(() => $("#scanner-frame")?.classList.remove("scan-success-flash"), 1200);
}

function showSuccess(points, qrId) {
  $("#scan-points-number").textContent = points;
  $("#scan-points-text").textContent = `You earned ${points} points!`;
  if (qrId) setLastScanned(qrId);
  flashSuccess();
  toast(`+${points} points earned!`, "success");
  $("#scan-success-modal")?.classList.remove("hidden");
}

function showError(message) {
  toast(message, "error");
  const el = $("#scan-error-text");
  if (el) el.textContent = message;
  $("#scan-error-modal")?.classList.remove("hidden");
}

function updateTorchButton() {
  const btn = $("#torch-btn");
  if (!btn) return;
  btn.disabled = !torchSupported || !scanner;
  btn.classList.toggle("active", torchOn);
  btn.setAttribute("aria-pressed", torchOn ? "true" : "false");
}

function updateSwitchButton() {
  const btn = $("#switch-camera-btn");
  if (!btn) return;
  btn.disabled = cameras.length < 2 || !scanner;
}

async function applyTorch(on) {
  if (!scanner || !torchSupported) {
    toast("Torch not supported on this device", "error");
    return;
  }
  try {
    await scanner.applyVideoConstraints({ advanced: [{ torch: on }] });
    torchOn = on;
    updateTorchButton();
  } catch (err) {
    console.warn("Torch error:", err);
    toast("Torch not available on this device", "error");
  }
}

async function resumeScanning() {
  scanning = false;
  setStatus("Align QR code within the frame.");
  try {
    await scanner?.resume();
  } catch {
    await restartScanner();
  }
}

async function handleScan(decodedText) {
  if (!scanUser || scanning) return;
  const code = String(decodedText || "").trim();
  if (!code) return;

  scanning = true;
  setLastScanned(code);
  setStatus("Verifying QR code…");
  setLoading(true);

  try {
    await scanner?.pause(true);
  } catch {
    /* ignore */
  }

  try {
    const result = await scanQrViaApi(code);
    showSuccess(result.points, result.qrId || code);
    setStatus("Scan successful!");
  } catch (err) {
    let msg = err?.message || "Scan failed. Try again.";
    if (err instanceof ApiError || err?.code) {
      if (err.code === "qr-invalid") msg = "Invalid QR Code";
      else if (err.code === "qr-used") msg = "QR already redeemed";
      else if (err.code === "unauthenticated") msg = "Please sign in again";
      else if (err.code === "api-error" && err.status === 0) msg = "Cannot reach server. Check your connection.";
      else if (err.code === "rate-limit") msg = "Too many scans. Wait a moment.";
      else if (err.code === "user-suspended") msg = "Account suspended. Contact support.";
    }
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      msg = `Server unavailable (${API_BASE}). Start the backend API.`;
    }
    showError(msg);
    setStatus("Align QR code within the frame.");
    await resumeScanning();
  } finally {
    scanning = false;
    setLoading(false);
  }
}

async function startWithCamera(cameraId) {
  hideCameraError();
  scanner = new Html5Qrcode("qr-reader");
  await scanner.start(
    cameraId,
    { fps: 12, qrbox: (w, h) => ({ width: Math.min(260, w * 0.72), height: Math.min(260, h * 0.72) }) },
    (text) => handleScan(text),
    () => {}
  );

  try {
    const caps = scanner.getRunningTrackCapabilities?.() || {};
    torchSupported = Boolean(caps.torch);
  } catch {
    torchSupported = false;
  }

  torchOn = false;
  updateTorchButton();
  updateSwitchButton();
  setStatus("Align QR code within the frame.");
}

async function restartScanner() {
  await stopScanner();
  await startScanner();
}

async function startScanner() {
  if (!$("#qr-reader")) return;

  if (!window.isSecureContext && location.hostname !== "localhost") {
    setStatus("Camera requires HTTPS or localhost.");
    showCameraError("Camera access requires a secure connection (HTTPS).");
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("Camera is not supported in this browser.");
    showCameraError("Your browser does not support camera access.");
    return;
  }

  setLoading(true);
  hideCameraError();
  setStatus("Requesting camera access…");

  try {
    cameras = await Html5Qrcode.getCameras();
    if (!cameras?.length) {
      setStatus("No camera found on this device.");
      showCameraError("No camera was detected on this device.");
      return;
    }

    const backIdx = cameras.findIndex((c) => /back|rear|environment/i.test(c.label || ""));
    currentCameraIndex = backIdx >= 0 ? backIdx : cameras.length - 1;

    await startWithCamera(cameras[currentCameraIndex].id);
  } catch (err) {
    console.error(err);
    let msg = "Camera unavailable. Please try again.";
    if (err?.name === "NotAllowedError") {
      msg = "Camera permission denied. Allow access in browser settings.";
    } else if (err?.name === "NotFoundError") {
      msg = "No camera found on this device.";
    }
    setStatus(msg);
    showCameraError(msg);
  } finally {
    setLoading(false);
  }
}

async function switchCamera() {
  if (cameras.length < 2) return;
  setLoading(true);
  torchOn = false;

  try {
    await stopScanner();
    currentCameraIndex = (currentCameraIndex + 1) % cameras.length;
    await startWithCamera(cameras[currentCameraIndex].id);
    setStatus(`Using ${cameras[currentCameraIndex].label || "alternate camera"}`);
  } catch (err) {
    console.error(err);
    setStatus("Could not switch camera.");
    toast("Could not switch camera", "error");
    await restartScanner();
  } finally {
    setLoading(false);
  }
}

async function stopScanner() {
  try {
    if (scanner?.isScanning) await scanner.stop();
    scanner?.clear();
  } catch {
    /* ignore */
  }
  scanner = null;
  torchSupported = false;
  torchOn = false;
  updateTorchButton();
  updateSwitchButton();
}

function renderRecentScans(list) {
  const el = $("#recent-scans-list");
  if (!el) return;
  const scans = list.filter((t) => t.type === "scan");
  if (!scans.length) {
    el.innerHTML = emptyState("No QR scans yet");
    return;
  }
  el.innerHTML = scans
    .slice(0, 5)
    .map((tx) => {
      const { relative } = formatTimestamp(tx.createdAt);
      return `<article class="list-item">
        <div class="logo-pill">📱</div>
        <div class="item-meta"><h5>${tx.description || "QR Scan"}</h5><p>${relative}</p></div>
        <strong class="item-score">+${Number(tx.points) || 0}</strong>
      </article>`;
    })
    .join("");
}

bootProtected("scanner", (user) => {
  scanUser = user;
  if (pageReady) return;
  pageReady = true;

  startScanner();
  window.addEventListener("pagehide", stopScanner);

  txUnsub = subscribeTransactions(user.uid, renderRecentScans, () => {}, 15);

  $("#torch-btn")?.addEventListener("click", () => applyTorch(!torchOn));
  $("#switch-camera-btn")?.addEventListener("click", switchCamera);
  $("#restart-scan-btn")?.addEventListener("click", restartScanner);
  $("#restart-scan-btn-toolbar")?.addEventListener("click", restartScanner);

  $("#scan-ok")?.addEventListener("click", () => {
    $("#scan-success-modal")?.classList.add("hidden");
    location.href = "dashboard.html";
  });

  $("#scan-error-ok")?.addEventListener("click", async () => {
    $("#scan-error-modal")?.classList.add("hidden");
    await resumeScanning();
  });
});

window.addEventListener("pagehide", () => txUnsub?.());
