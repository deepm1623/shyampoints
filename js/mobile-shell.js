/**
 * Mobile shell (≤768px only). Desktop nav unchanged via CSS.
 */
import { $ } from "./app-core.js";

const MOBILE_NAV = [
  { id: "dashboard", href: "dashboard.html", icon: "fa-house", label: "Home" },
  { id: "rewards", href: "rewards.html", icon: "fa-gift", label: "Rewards" },
  { id: "scanner", href: "scanner.html", icon: "fa-qrcode", label: "Scan", scan: true },
  { id: "history", href: "history.html", icon: "fa-clock-rotate-left", label: "History" },
  { id: "profile", href: "profile.html", icon: "fa-user", label: "Profile" },
];

export function initMobileNav(pageId) {
  let nav = document.getElementById("app-mobile-nav");
  if (!nav) {
    nav = document.createElement("nav");
    nav.id = "app-mobile-nav";
    nav.className = "m-bottom-nav";
    nav.setAttribute("aria-label", "Mobile navigation");
    document.body.appendChild(nav);
  }

  if (nav.dataset.builtMobile === "1") {
    nav.querySelectorAll("[data-nav]").forEach((link) => {
      link.classList.toggle("active", link.dataset.nav === pageId);
    });
    return;
  }

  nav.dataset.builtMobile = "1";
  nav.innerHTML = MOBILE_NAV.map((n) => {
    if (n.scan) {
      return `<a href="${n.href}" class="m-nav-scan${n.id === pageId ? " active" : ""}" data-nav="${n.id}" aria-label="QR Scan">
        <span class="m-nav-scan-ring"><i class="fa-solid ${n.icon}" aria-hidden="true"></i></span>
        <span class="m-nav-scan-label">${n.label}</span>
      </a>`;
    }
    return `<a href="${n.href}" class="m-nav-link${n.id === pageId ? " active" : ""}" data-nav="${n.id}">
      <i class="fa-solid ${n.icon}" aria-hidden="true"></i>
      <span>${n.label}</span>
    </a>`;
  }).join("");
}

export function isMobileViewport() {
  return window.matchMedia("(max-width: 768px)").matches;
}
