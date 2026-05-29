/**
 * Sliding auth UI — presentation only (no Firebase / auth logic).
 */
(function () {
  const SLIDE_MS = 700;
  const EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

  function getEls() {
    return {
      wrapper: document.getElementById("auth-wrapper"),
      container: document.getElementById("auth-container"),
      brandLogin: document.querySelector(".brand-copy--login"),
      brandSignup: document.querySelector(".brand-copy--signup"),
      featureList: document.querySelector(".feature-list"),
    };
  }

  function setAriaHidden(loginVisible) {
    const { brandLogin, brandSignup } = getEls();
    if (brandLogin) {
      brandLogin.setAttribute("aria-hidden", loginVisible ? "false" : "true");
    }
    if (brandSignup) {
      brandSignup.setAttribute("aria-hidden", loginVisible ? "true" : "false");
    }
  }

  function triggerFloating(container) {
    if (!container) return;
    container.classList.add("is-floating");
    window.setTimeout(() => {
      container.classList.remove("is-floating");
    }, SLIDE_MS);
  }

  function replayFeatureStagger() {
    const { featureList } = getEls();
    if (!featureList) return;
    featureList.classList.remove("is-staggering");
    void featureList.offsetWidth;
    featureList.classList.add("is-staggering");
    window.setTimeout(() => {
      featureList.classList.remove("is-staggering");
    }, 900);
  }

  /** Sync signup-mode + legacy .active (used by auth.js) */
  window.setAuthSignupMode = function (isSignup) {
    const { wrapper, container } = getEls();
    if (!wrapper || !container) return;

    requestAnimationFrame(() => {
      wrapper.classList.toggle("active", isSignup);
      wrapper.classList.toggle("signup-mode", isSignup);
      container.classList.toggle("signup-mode", isSignup);
      setAriaHidden(!isSignup);
      triggerFloating(container);
      replayFeatureStagger();
    });
  };

  document.addEventListener("DOMContentLoaded", function () {
    const { wrapper, container, featureList } = getEls();
    if (!wrapper || !container) return;

    const isSignup =
      wrapper.classList.contains("signup-mode") ||
      wrapper.classList.contains("active") ||
      new URLSearchParams(location.search).get("mode") === "signup";

    if (isSignup) {
      wrapper.classList.add("active", "signup-mode");
      container.classList.add("signup-mode");
    }

    setAriaHidden(!isSignup);

    if (featureList) {
      window.setTimeout(() => {
        featureList.classList.add("is-staggering");
        window.setTimeout(() => featureList.classList.remove("is-staggering"), 900);
      }, 400);
    }

    document.querySelectorAll(".toggle-password").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const input = document.getElementById(btn.getAttribute("data-target"));
        if (!input) return;
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
        const icon = btn.querySelector("i");
        if (icon) icon.className = show ? "bx bx-hide" : "bx bx-show";
      });
    });
  });

  window.AuthSlide = { duration: SLIDE_MS, easing: EASING };
})();
