/* Blue Horse Sanctuary — interactions */
(function () {
  "use strict";

  const nav = document.querySelector(".nav");
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");

  /* sticky nav state */
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle("scrolled", window.scrollY > 24);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* mobile menu */
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      nav.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        links.classList.remove("open");
        nav.classList.remove("menu-open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  /* scroll reveal */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  /* animated stat counters */
  const counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window && counters.length) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const co = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          const target = parseFloat(el.dataset.count);
          const suffix = el.dataset.suffix || "";
          if (reduce) { el.textContent = target + suffix; co.unobserve(el); return; }
          const dur = 1400;
          const start = performance.now();
          const step = (now) => {
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased) + suffix;
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          co.unobserve(el);
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((el) => co.observe(el));
  }

  /* glossary tap-to-toggle (touch); hover/focus handled by CSS */
  document.querySelectorAll(".term").forEach((t) => {
    t.setAttribute("tabindex", "0");
    t.addEventListener("click", (ev) => {
      ev.stopPropagation();
      document.querySelectorAll(".term.show").forEach((o) => { if (o !== t) o.classList.remove("show"); });
      t.classList.toggle("show");
    });
  });
  document.addEventListener("click", () =>
    document.querySelectorAll(".term.show").forEach((t) => t.classList.remove("show"))
  );

  /* footer year */
  const y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();

  /* gallery lightbox */
  const gimgs = Array.prototype.slice.call(document.querySelectorAll(".gallery-grid img"));
  if (gimgs.length) {
    const lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("aria-hidden", "true");
    lb.innerHTML =
      '<button class="lb-close" aria-label="Close">&#10005;</button>' +
      '<button class="lb-prev" aria-label="Previous">&#8249;</button>' +
      '<img alt="">' +
      '<button class="lb-next" aria-label="Next">&#8250;</button>';
    document.body.appendChild(lb);
    const lbImg = lb.querySelector("img");
    let idx = 0;
    const show = (i) => { idx = (i + gimgs.length) % gimgs.length; lbImg.src = gimgs[idx].src; lbImg.alt = gimgs[idx].alt || ""; };
    const open = (i) => { show(i); lb.classList.add("open"); document.body.style.overflow = "hidden"; };
    const close = () => { lb.classList.remove("open"); document.body.style.overflow = ""; };
    gimgs.forEach((im, i) => { im.style.cursor = "zoom-in"; im.addEventListener("click", () => open(i)); });
    lb.querySelector(".lb-close").addEventListener("click", close);
    lb.querySelector(".lb-next").addEventListener("click", (e) => { e.stopPropagation(); show(idx + 1); });
    lb.querySelector(".lb-prev").addEventListener("click", (e) => { e.stopPropagation(); show(idx - 1); });
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") show(idx + 1);
      else if (e.key === "ArrowLeft") show(idx - 1);
    });
  }

  /* demo contact form -> opens prefilled email */
  const form = document.querySelector("form[data-mailto]");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const to = form.dataset.mailto;
      const name = (form.querySelector("[name=name]") || {}).value || "";
      const email = (form.querySelector("[name=email]") || {}).value || "";
      const phone = (form.querySelector("[name=phone]") || {}).value || "";
      const msg = (form.querySelector("[name=message]") || {}).value || "";
      const body = `Name: ${name}%0D%0AEmail: ${email}%0D%0APhone: ${phone}%0D%0A%0D%0A${encodeURIComponent(msg)}`;
      window.location.href = `mailto:${to}?subject=${encodeURIComponent("Website inquiry — Blue Horse Sanctuary")}&body=${body}`;
    });
  }
})();
