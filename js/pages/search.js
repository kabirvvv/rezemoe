// ============================================================
// SEARCH PAGE — Shirayuki Scrapper API V2
// ============================================================
const SearchPage = (() => {
  const render = async ({ q = "", page = "1" }) => {
    UI.setTitle(q ? `Search: ${q}` : "Search");

    if (!q) {
      UI.render(`
        <div class="search-page container">
          <div class="search-hero">
            <h1 class="search-hero__title">Find Your Anime</h1>
            <div class="search-hero__bar">
              <input class="hero-search-input" id="hero-search" type="text"
                     placeholder="Search titles, genres…" autofocus>
              <button class="btn btn--primary" id="hero-search-btn">Search</button>
            </div>
          </div>
        </div>`);
      const inp = document.getElementById("hero-search");
      const btn = document.getElementById("hero-search-btn");
      const go  = () => { const v = inp.value.trim(); if (v) Router.navigate(`search?q=${encodeURIComponent(v)}`); };
      btn.onclick = go;
      inp.onkeydown = (e) => e.key === "Enter" && go();
      return;
    }

    const p = +page || 1;
    UI.render(`
      <div class="search-page container">
        <div class="search-bar-wrap">
          <div class="inline-search">
            <input class="inline-search__input" id="search-input" type="text" value="${q}" placeholder="Search…">
            <button class="btn btn--primary" id="search-btn">Search</button>
          </div>
        </div>
        <div id="search-results">${UI.skeletonCards()}</div>
        <div id="search-pagination"></div>
      </div>`);

    const inp = document.getElementById("search-input");
    const btn = document.getElementById("search-btn");
    const go  = () => { const v = inp.value.trim(); if (v) Router.navigate(`search?q=${encodeURIComponent(v)}`); };
    btn.onclick = go;
    inp.onkeydown = (e) => e.key === "Enter" && go();

    try {
      const raw   = await API.search(q, p);
      // shape: { animes: [...], totalPages, currentPage, hasNextPage }
      const items = raw.animes || raw.results || (Array.isArray(raw) ? raw : []);
      const total = raw.totalPages || 1;
      const res   = document.getElementById("search-results");

      res.innerHTML = items.length
        ? `<p class="results-count">${items.length} result${items.length !== 1 ? "s" : ""} for "<em>${q}</em>"</p>
           ${UI.grid(items, UI.animeCard)}`
        : `<div class="empty-state">
             <p class="empty-icon">🔍</p>
             <h3>No results for "<em>${q}</em>"</h3>
             <p>Try a different keyword.</p>
           </div>`;

      document.getElementById("search-pagination").innerHTML =
        UI.pagination(p, total, `(pg)=>Router.navigate('search?q=${encodeURIComponent(q)}&page='+pg)`);
    } catch (e) {
      document.getElementById("search-results").innerHTML =
        `<p class="error-text">Search failed: ${e.message}</p>`;
    }
  };

  return { render };
})();

window.SearchPage = SearchPage;
