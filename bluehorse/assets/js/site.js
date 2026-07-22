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

  /* shared modal helper */
  function getModal() {
    let m = document.querySelector(".modal-backdrop");
    if (!m) {
      m = document.createElement("div");
      m.className = "modal-backdrop";
      document.body.appendChild(m);
      m.addEventListener("click", (e) => { if (e.target === m) m.classList.remove("open"); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") m.classList.remove("open"); });
    }
    return m;
  }
  function openModal(html) {
    const m = getModal();
    m.innerHTML = '<div class="modal">' + html + '</div>';
    m.classList.add("open");
    const c = m.querySelector("[data-close]");
    if (c) c.addEventListener("click", () => m.classList.remove("open"));
  }
  const money = (n) => "$" + Math.round(n);

  /* ---- shop cart (demo, persists in localStorage) ---- */
  const addBtns = document.querySelectorAll("[data-add-to-cart]");
  if (addBtns.length) {
    const KEY = "bhs_cart";
    let cart = {};
    try { cart = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { cart = {}; }

    const fab = document.createElement("button");
    fab.className = "cart-fab"; fab.setAttribute("aria-label", "Open cart");
    fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.5 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21.5 7H6"/></svg><span class="badge" data-n="0"></span>';
    document.body.appendChild(fab);
    const backdrop = document.createElement("div"); backdrop.className = "drawer-backdrop"; document.body.appendChild(backdrop);
    const drawer = document.createElement("aside"); drawer.className = "drawer";
    drawer.innerHTML = '<div class="drawer-head"><h3>Your cart</h3><button class="drawer-close" aria-label="Close">&#10005;</button></div><div class="drawer-body"></div><div class="drawer-foot"><div class="tot"><span>Total</span><span class="tot-val">$0</span></div><button class="btn btn-primary checkout-btn">Check out</button></div>';
    document.body.appendChild(drawer);
    const body = drawer.querySelector(".drawer-body");
    const badge = fab.querySelector(".badge");
    const totVal = drawer.querySelector(".tot-val");

    const save = () => localStorage.setItem(KEY, JSON.stringify(cart));
    const count = () => Object.values(cart).reduce((a, i) => a + i.q, 0);
    const total = () => Object.values(cart).reduce((a, i) => a + i.q * i.p, 0);
    const render = () => {
      const items = Object.values(cart);
      badge.textContent = count(); badge.setAttribute("data-n", count());
      totVal.textContent = money(total());
      if (!items.length) { body.innerHTML = '<p class="cart-empty">Your cart is empty.</p>'; return; }
      body.innerHTML = items.map((i) =>
        '<div class="cart-line" data-id="' + i.id + '"><img src="' + i.img + '" alt="">' +
        '<div><div class="nm">' + i.name + '</div><div class="pr">' + money(i.p) + '</div>' +
        '<div class="qty"><button data-dec aria-label="Less">&minus;</button><span>' + i.q + '</span><button data-inc aria-label="More">+</button></div></div>' +
        '<button class="rm" data-rm>Remove</button></div>'
      ).join("");
      body.querySelectorAll(".cart-line").forEach((line) => {
        const id = line.getAttribute("data-id");
        line.querySelector("[data-inc]").addEventListener("click", () => { cart[id].q++; save(); render(); });
        line.querySelector("[data-dec]").addEventListener("click", () => { cart[id].q--; if (cart[id].q <= 0) delete cart[id]; save(); render(); });
        line.querySelector("[data-rm]").addEventListener("click", () => { delete cart[id]; save(); render(); });
      });
    };
    const openDrawer = () => { backdrop.classList.add("open"); drawer.classList.add("open"); };
    const closeDrawer = () => { backdrop.classList.remove("open"); drawer.classList.remove("open"); };
    fab.addEventListener("click", openDrawer);
    backdrop.addEventListener("click", closeDrawer);
    drawer.querySelector(".drawer-close").addEventListener("click", closeDrawer);

    addBtns.forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.id;
      if (cart[id]) cart[id].q++;
      else cart[id] = { id: id, name: b.dataset.name, p: parseFloat(b.dataset.price), img: b.dataset.img, q: 1 };
      save(); render(); openDrawer();
      const orig = b.textContent; b.textContent = "Added ✓";
      setTimeout(() => { b.textContent = orig; }, 1100);
    }));

    drawer.querySelector(".checkout-btn").addEventListener("click", () => {
      if (!count()) return;
      closeDrawer();
      openModal(
        '<div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg></div>' +
        '<h3>Ready to check out</h3>' +
        '<p>Your cart total is <span class="amt">' + money(total()) + '</span>. On the live site, secure checkout happens right here, with no fees, through the sanctuary&rsquo;s free store.</p>' +
        '<span class="demo-tag">Demo preview &middot; payment not yet connected</span><br>' +
        '<button class="btn btn-primary" data-close style="margin-top:1.3rem">Got it</button>'
      );
    });
    render();
  }

  /* ---- donate (demo) ---- */
  const donateWrap = document.querySelector("[data-donate]");
  if (donateWrap) {
    let amount = 25, freq = "once";
    const opts = donateWrap.querySelectorAll(".amount-opt");
    const custom = donateWrap.querySelector(".donate-custom input");
    const btn = donateWrap.querySelector(".donate-go");
    const setAmt = (v) => { amount = v || 0; if (btn) btn.textContent = "Donate " + money(amount) + (freq === "monthly" ? "/mo" : ""); };
    opts.forEach((o) => o.addEventListener("click", () => {
      opts.forEach((x) => x.classList.remove("sel")); o.classList.add("sel");
      if (custom) custom.value = ""; setAmt(parseInt(o.dataset.amt, 10));
    }));
    if (custom) custom.addEventListener("input", () => {
      opts.forEach((x) => x.classList.remove("sel"));
      setAmt(parseInt(custom.value || 0, 10) || 0);
    });
    donateWrap.querySelectorAll(".freq-toggle button").forEach((f) => f.addEventListener("click", () => {
      donateWrap.querySelectorAll(".freq-toggle button").forEach((x) => x.classList.remove("on"));
      f.classList.add("on"); freq = f.dataset.freq; setAmt(amount);
    }));
    if (btn) btn.addEventListener("click", () => {
      if (!amount) return;
      openModal(
        '<div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/></svg></div>' +
        '<h3>Thank you</h3>' +
        '<p>Your <span class="amt">' + money(amount) + (freq === "monthly" ? "/month" : "") + '</span> gift would go straight to hay, hooves, and vet care. On the live site, giving completes right here, with no fees.</p>' +
        '<span class="demo-tag">Demo preview &middot; payment not yet connected</span><br>' +
        '<button class="btn btn-primary" data-close style="margin-top:1.3rem">Close</button>'
      );
    });
    setAmt(25);
  }

  /* ---- contact form (demo inline success) ---- */
  const form = document.querySelector("form[data-demo-form]");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const s = document.querySelector(".form-success");
      form.style.display = "none";
      if (s) s.classList.add("show");
    });
  }
})();
