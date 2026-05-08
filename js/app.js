document.addEventListener("DOMContentLoaded", () => {

  // ── Navbar: hide on scroll down, show on scroll up
  const navbar = document.querySelector(".navbar");
  let lastScrollY = 0;
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const sy = window.scrollY;
        if (sy > lastScrollY && sy > 80) {
          navbar?.classList.add("navbar--hidden");
        } else {
          navbar?.classList.remove("navbar--hidden");
        }
        navbar?.classList.toggle("navbar--scrolled", sy > 20);
        lastScrollY = sy;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // ── Reveal on scroll
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });

  window.observeReveal = () => {
    document.querySelectorAll(".reveal:not(.visible)").forEach((el) => {
      revealObserver.observe(el);
    });
  };

  // ── Navbar search
  const navSearch  = document.getElementById("nav-search");
  const navInput   = document.getElementById("nav-search-input");
  const navBtn     = document.getElementById("nav-search-btn");
  const suggestBox = document.getElementById("search-suggestions");
  let suggestTimer = null;

  navInput?.addEventListener("input", () => {
    clearTimeout(suggestTimer);
    const q = navInput.value.trim();
    if (q.length < 2) { hideSuggestions(); return; }
    suggestTimer = setTimeout(() => fetchSuggestions(q), 350);
  });

  navInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      hideSuggestions();
      const q = navInput.value.trim();
      if (q) Router.navigate(`search?q=${encodeURIComponent(q)}`);
    }
    if (e.key === "Escape") hideSuggestions();
  });

  navBtn?.addEventListener("click", () => {
    const q = navInput.value.trim();
    if (q) Router.navigate(`search?q=${encodeURIComponent(q)}`);
  });

  document.addEventListener("click", (e) => {
    if (!navSearch?.contains(e.target)) hideSuggestions();
  });

  const fetchSuggestions = async (q) => {
    try {
      const raw   = await API.searchSuggest(q);
      const items = raw.suggestions || raw.results || (Array.isArray(raw) ? raw : []);
      if (!items.length) { hideSuggestions(); return; }

      suggestBox.innerHTML = items.slice(0, 8).map((s) => {
        const id     = s.id     || s.animeId || "";
        const title  = s.name   || s.title   || "";
        const poster = s.poster || s.image   || "";
        const type   = s.type   || "";
        return `
          <div class="suggest-item"
               onclick="Router.navigate('watch?id=${encodeURIComponent(id)}');hideSuggestions()">
            <img src="${poster}" alt="${title}" onerror="this.src='assets/placeholder.svg'">
            <div class="suggest-meta">
              <span class="suggest-title">${title}</span>
              <span class="suggest-sub">${type}</span>
            </div>
          </div>`;
      }).join("");

      suggestBox.classList.add("suggest-box--open");
    } catch { hideSuggestions(); }
  };

  window.hideSuggestions = () =>
    suggestBox?.classList.remove("suggest-box--open");

  // ── Mobile burger
  const burger   = document.getElementById("burger");
  const navLinks = document.getElementById("nav-links");
  burger?.addEventListener("click", () => {
    navLinks.classList.toggle("nav-links--open");
    burger.classList.toggle("burger--open");
  });
  document.querySelectorAll(".nav-link").forEach((l) =>
    l.addEventListener("click", () => {
      navLinks.classList.remove("nav-links--open");
      burger?.classList.remove("burger--open");
    })
  );

  // ── Ripple effect on buttons
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn");
    if (!btn) return;
    const rect   = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    const size   = Math.max(rect.width, rect.height);
    ripple.style.cssText = `
      position:absolute;border-radius:50%;
      width:${size}px;height:${size}px;
      left:${e.clientX - rect.left - size/2}px;
      top:${e.clientY  - rect.top  - size/2}px;
      background:rgba(255,255,255,0.18);
      transform:scale(0);animation:ripple 0.55s ease-out;
      pointer-events:none;
    `;
    if (!document.getElementById("ripple-style")) {
      const s = document.createElement("style");
      s.id = "ripple-style";
      s.textContent = "@keyframes ripple{to{transform:scale(2.5);opacity:0}}";
      document.head.appendChild(s);
    }
    btn.style.position = "relative";
    btn.style.overflow = "hidden";
    btn.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  });

  // ── Page transition
  const mainContent = document.getElementById("main-content");
  const origRender  = UI.render.bind(UI);
  UI.render = (html) => {
    mainContent?.classList.remove("page-enter");
    void mainContent?.offsetWidth;
    mainContent?.classList.add("page-enter");
    origRender(html);
    requestAnimationFrame(() => requestAnimationFrame(() => window.observeReveal()));
  };

  // ── Active nav
  const highlightNav = (path) => {
    document.querySelectorAll(".nav-link").forEach((l) =>
      l.classList.toggle("nav-link--active", l.dataset.route === path)
    );
  };

  // ── Routes
  Router.on("home",     (p) => { highlightNav("home");     HomePage.render(p);     });
  Router.on("anime",    (p) => { highlightNav("anime");    AnimePage.render(p);    });
  Router.on("watch",    (p) => { highlightNav("watch");    WatchPage.render(p);    });
  Router.on("search",   (p) => { highlightNav("search");   SearchPage.render(p);   });
  Router.on("category", (p) => { highlightNav("category"); CategoryPage.render(p); });
  Router.on("genre",    (p) => { highlightNav("category"); GenrePage.render(p);    });
  Router.on("schedule", (p) => { highlightNav("schedule"); SchedulePage.render(p); });
  Router.on("browse",   (p) => { highlightNav("browse");   FilterPage.render(p);   });

  Router.on("404", () =>
    UI.render(`<div class="error-state">
      <div class="error-icon">404</div>
      <h2>Page Not Found</h2>
      <p>The page you're looking for doesn't exist.</p>
      <button class="btn btn--primary" onclick="Router.navigate('home')">← Go Home</button>
    </div>`)
  );

  Router.dispatch();
});
