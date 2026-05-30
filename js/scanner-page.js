import { Html5Qrcode } from "https://unpkg.com/html5-qrcode@2.3.8/esm/html5-qrcode.js";
import { bootProtected, $, emptyState } from "./app-core.js";
import { processQrScan, subscribeTransactions, formatTimestamp } from "./firestore-service.js";

let scanner = null;
let scanning = false;
let scanUser = null;
let txUnsub = null;

function showSuccess(points) {
  $("#scan-points-number").textContent = points;
  $("#scan-points-text").textContent = `You earned ${points} points!`;
  $("#scan-success-modal")?.classList.remove("hidden");
}

function showError(message) {
  const el = $("#scan-error-text");
  if (el) el.textContent = message;
  $("#scan-error-modal")?.classList.remove("hidden");
}

async function handleScan(decodedText) {
  if (!scanUser || scanning) return;
  scanning = true;

  try {
    await scanner?.pause(true);
  } catch {
    /* ignore */
  }

  try {
    const result = await processQrScan(scanUser.uid, decodedText);
    showSuccess(result.points);
  } catch (err) {
    const code = err?.code;
    if (code === "qr-invalid") showError("Invalid QR Code");
    else if (code === "qr-used") showError("QR already redeemed");
    else showError(err?.message || "Scan failed. Try again.");
  } finally {
    scanning = false;
  }
}

async function startScanner() {
  const status = $("#scanner-status");
  if (!$("#qr-reader")) return;

  if (!window.isSecureContext && location.hostname !== "localhost") {
    if (status) status.textContent = "Camera requires HTTPS or localhost.";
    return;
  }

  try {
    scanner = new Html5Qrcode("qr-reader");
    const cameras = await Html5Qrcode.getCameras();
    if (!cameras?.length) {
      if (status) status.textContent = "No camera found on this device.";
      return;
    }

    const back = cameras.find((c) => /back|rear|environment/i.test(c.label));
    const cameraId = back?.id || cameras[cameras.length - 1].id;

    await scanner.start(
      cameraId,
      { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
      (text) => handleScan(text),
      () => {}
    );

    if (status) status.textContent = "Align QR code within the frame.";
  } catch (err) {
    console.error(err);
    if (status) status.textContent = "Camera access denied or unavailable.";
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
}

function renderRecentScans(list) {
  const el = $("#recent-scans-list");
  if (!el) return;
  const scans = list.filter((t) => t.type === "scan");
  if (!scans.length) {
    el.innerHTML = emptyState("No scans yet");
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
  startScanner();
  window.addEventListener("pagehide", stopScanner);

  txUnsub = subscribeTransactions(
    user.uid,
    renderRecentScans,
    () => {},
    15
  );

  $("#scan-ok")?.addEventListener("click", () => {
    $("#scan-success-modal")?.classList.add("hidden");
    location.href = "dashboard.html";
  });

  $("#scan-error-ok")?.addEventListener("click", async () => {
    $("#scan-error-modal")?.classList.add("hidden");
    scanning = false;
    try {
      await scanner?.resume();
    } catch {
      /* ignore */
    }
  });
});

window.addEventListener("pagehide", () => txUnsub?.());
