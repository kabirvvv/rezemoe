// ============================================================
// APP — Shirayuki Scrapper API V2
// ============================================================
document.addEventListener("DOMContentLoaded", () => {

  // ── Navbar search with live suggestions ───────────────────
  const navSearch = document.getElementById("nav-search");
  const navInput  = document.getElementById("nav-search-input");
  const navBtn    = document.getElementById("nav-search-btn");
  const suggestBox= document.getElementById("search-suggestions");

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
      // shape: { suggestions: [{id, name, poster, type, ...}] }
      const items = raw.suggestions || raw.results || (Array.isArray(raw) ? raw : []);
      if (!items.length) { hideSuggestions(); return; }

      suggestBox.innerHTML = items.slice(0, 8).map((s) => {
        const id     = s.id || s.animeId || "";
        const title  = s.name || s.title || "";
        const poster = s.poster || s.image || "";
        const type   = s.type   || "";
        const year   = s.releaseDate || s.year || "";
        return `
          <div class="suggest-item"
               onclick="Router.navigate('watch?id=${encodeURIComponent(id)}');hideSuggestions()">
            <img src="${poster}" alt="${title}" onerror="this.src='assets/placeholder.svg'">
            <div class="suggest-meta">
              <span class="suggest-title">${title}</span>
              <span class="suggest-sub">${[type, year].filter(Boolean).join(" · ")}</span>
            </div>
          </div>`;
      }).join("");

      suggestBox.classList.add("suggest-box--open");
    } catch { hideSuggestions(); }
  };

  window.hideSuggestions = () =>
    suggestBox?.classList.remove("suggest-box--open");

  // ── Mobile burger ──────────────────────────────────────────
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

  // ── Active nav highlighting ────────────────────────────────
  const highlightNav = (path) => {
    document.querySelectorAll(".nav-link").forEach((l) =>
      l.classList.toggle("nav-link--active", l.dataset.route === path)
    );
  };

  // ── Routes ─────────────────────────────────────────────────
  Router.on("home",     (p) => { highlightNav("home");     HomePage.render(p);    });
  Router.on("anime",    (p) => { highlightNav("anime");    AnimePage.render(p);   });
  Router.on("watch",    (p) => { highlightNav("watch");    WatchPage.render(p);   });
  Router.on("search",   (p) => { highlightNav("search");   SearchPage.render(p);  });
  Router.on("category", (p) => { highlightNav("category"); CategoryPage.render(p);});
  Router.on("genre",    (p) => { highlightNav("category"); GenrePage.render(p);   });
  Router.on("schedule", (p) => { highlightNav("schedule"); SchedulePage.render(p);});
  Router.on("browse",   (p) => { highlightNav("browse");   FilterPage.render(p);  });

  Router.on("404", () =>
    UI.render(`<div class="error-state">
      <div class="error-icon">404</div>
      <h2>Page Not Found</h2>
      <button class="btn btn--primary" onclick="Router.navigate('home')">Go Home</button>
    </div>`)
  );

  Router.dispatch();
});
