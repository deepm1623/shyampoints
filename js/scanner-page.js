import { bootProtected, $, creditScanPoints, toast } from "./app-core.js";

let pendingPoints = 0;
let stream = null;

async function startCamera() {
  const video = $("#scan-video");
  const status = $("#scanner-status");
  if (!navigator.mediaDevices?.getUserMedia) {
    if (status) status.textContent = "Camera not supported. Use Simulate Scan.";
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
    });
    if (video) {
      video.srcObject = stream;
      await video.play();
    }
    if (status) status.textContent = "Align QR code within the frame.";
  } catch {
    if (status) status.textContent = "Camera permission denied. Use Simulate Scan.";
  }
}

function stopCamera() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}

bootProtected("scanner", () => {
  startCamera();
  window.addEventListener("pagehide", stopCamera);

  $("#simulate-scan")?.addEventListener("click", () => {
    pendingPoints = Math.floor(Math.random() * 80) + 1;
    $("#scan-points-number").textContent = pendingPoints;
    $("#scan-points-text").textContent = `You won ${pendingPoints} points!`;
    $("#scan-success-modal").classList.remove("hidden");
  });

  $("#toggle-flash")?.addEventListener("click", () => {
    toast("Flashlight requires device torch API (demo)", "error");
  });

  $("#scan-ok")?.addEventListener("click", async () => {
    if (pendingPoints) {
      await creditScanPoints(pendingPoints);
      pendingPoints = 0;
    }
    $("#scan-success-modal").classList.add("hidden");
    location.href = "dashboard.html";
  });

  $("#scan-error-ok")?.addEventListener("click", () => {
    $("#scan-error-modal").classList.add("hidden");
  });
});
