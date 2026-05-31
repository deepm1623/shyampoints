import { guardAdminPage } from "./admin-auth.js";
import { adminApi } from "./admin-api.js";
import { ADMIN_API_BASE } from "./admin-config.js";
import { logoutUser } from "../../firebase.js";

guardAdminPage();

document.getElementById("admin-logout")?.addEventListener("click", async () => {
  await logoutUser();
  location.href = "admin-login.html";
});

function renderQrList(qrcodes) {
  const wrap = document.getElementById("qr-list-wrap");
  if (!qrcodes?.length) {
    wrap.innerHTML = "<p class=\"muted\">No QR codes yet</p>";
    return;
  }
  wrap.innerHTML = `<table class="admin-table"><thead><tr><th>Code</th><th>Product</th><th>Points</th><th>Used</th><th>Used By</th></tr></thead><tbody>${qrcodes
    .map(
      (q) =>
        `<tr><td>${q.code}</td><td>${q.product}</td><td>${q.points}</td><td>${q.used ? "Yes" : "No"}</td><td>${q.usedBy || "—"}</td></tr>`
    )
    .join("")}</tbody></table>`;
}

async function loadQrcodes() {
  try {
    const { qrcodes } = await adminApi.getQrcodes();
    renderQrList(qrcodes);
  } catch (err) {
    document.getElementById("qr-list-wrap").innerHTML = `<p class="admin-login-error">${err.message}</p>`;
  }
}

document.getElementById("qr-gen-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const product = document.getElementById("qr-product").value.trim();
  const points = Number(document.getElementById("qr-points").value);
  const quantity = Number(document.getElementById("qr-quantity").value);
  const resultEl = document.getElementById("qr-gen-result");

  try {
    resultEl.hidden = false;
    resultEl.innerHTML = "<p class=\"muted\">Generating…</p>";
    const data = await adminApi.generateQr({ product, points, quantity });
    const zipUrl = data.zipUrl ? `${ADMIN_API_BASE}${data.zipUrl}` : "";
    resultEl.innerHTML = `<p><strong>${data.count} codes generated</strong></p>
      <p class="muted">Sample: ${data.codes.slice(0, 5).join(", ")}${data.codes.length > 5 ? "…" : ""}</p>
      ${zipUrl ? `<a class="sp-btn sp-btn-soft sp-btn-sm" href="${zipUrl}" download>Download ZIP (520px PNG)</a>` : ""}`;
    loadQrcodes();
  } catch (err) {
    resultEl.innerHTML = `<p class="admin-login-error">${err.message}</p>`;
  }
});

loadQrcodes();
