document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll(".admin-section");
  const title = document.getElementById("admin-title");
  const labels = {
    dashboard: "Dashboard",
    users: "Users",
    rewards: "Rewards",
    qrcodes: "QR Codes",
    transactions: "Transactions",
    redemptions: "Redemptions",
    analytics: "Analytics",
  };

  document.querySelectorAll(".admin-nav a[data-section]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const id = link.dataset.section;
      document.querySelectorAll(".admin-nav a").forEach((a) => a.classList.remove("active"));
      link.classList.add("active");
      sections.forEach((s) => s.classList.remove("active"));
      document.getElementById(`sec-${id}`)?.classList.add("active");
      if (title) title.textContent = labels[id] || "Admin";
    });
  });

  document.querySelectorAll("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count);
    const duration = 1200;
    const t0 = performance.now();
    function frame(t) {
      const p = Math.min((t - t0) / duration, 1);
      const v = Math.floor(target * (1 - Math.pow(1 - p, 3)));
      el.textContent = new Intl.NumberFormat("en-IN").format(v);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
});
