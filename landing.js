(function () {
  const reveals = document.querySelectorAll(".sp-reveal");
  if (reveals.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  }

  document.querySelectorAll("[data-counter]").forEach((el) => {
    const target = Number(el.dataset.counter);
    const suffix = el.textContent.includes("+") ? "+" : "";
    const duration = 1400;
    const t0 = performance.now();
    function frame(t) {
      const p = Math.min((t - t0) / duration, 1);
      const v = Math.floor(target * (1 - Math.pow(1 - p, 3)));
      const formatted =
        target >= 1000000
          ? (v / 1000000).toFixed(v >= 1000000 ? 0 : 1) + "M"
          : new Intl.NumberFormat("en-IN").format(v);
      el.textContent = formatted + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          requestAnimationFrame(frame);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
  });

  const toggle = document.getElementById("nav-toggle");
  const links = document.getElementById("landing-nav-links");
  toggle?.addEventListener("click", () => {
    const open = links?.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
})();
