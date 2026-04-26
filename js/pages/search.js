// ============================================================
// SEARCH PAGE
// ============================================================
const SearchPage = (() => {
  let currentPage = 1;
  let currentQuery = "";

  const render = async ({ q = "", page = "1" }) => {
    currentQuery = q;
    currentPage = +page || 1;
    UI.setTitle(q ? `Search: ${q}` : "Search");

    if (!q) {
      UI.render(`
        <div class="search-page container">
          <div class="search-hero">
            <h1 class="search-hero__title">Find Your Anime</h1>
            <div class="search-hero__bar">
              <input class="hero-search-input" id="hero-search" type="text" placeholder="Search titles, genres…" autofocus>
              <button class="btn btn--primary" id="hero-search-btn">Search</button>
            </div>
          </div>
          <div id="search-results"></div>
        </div>`);
      bindHeroSearch();
      return;
    }

    UI.render(`
      <div class="search-page container">
        <div class="search-bar-wrap">
          <div class="inline-search">
            <input class="inline-search__input" id="search-input" type="text" value="${q}" placeholder="Search…">
            <button class="btn btn--primary" id="search-btn">Search</button>
          </div>
        </div>
        <div id="search-results">${UI.skeletonCards()}</div>
      </div>`);

    bindInlineSearch();
    await doSearch(q);
  };

  const doSearch = async (q) => {
    const results = document.getElementById("search-results");
    results.innerHTML = UI.skeletonCards();
    try {
      const data = await API.search(q);
      const items = Array.isArray(data) ? data : data.data || [];
      if (!items.length) {
        results.innerHTML = `<div class="empty-state">
          <p class="empty-icon">🔍</p>
          <h3>No results for "<em>${q}</em>"</h3>
          <p>Try a different keyword.</p>
        </div>`;
        return;
      }
      results.innerHTML = `
        <p class="results-count">${items.length} result${items.length !== 1 ? "s" : ""} for "<em>${q}</em>"</p>
        ${UI.grid(items, UI.animeCard)}`;
    } catch {
      results.innerHTML = `<p class="error-text">Search failed. Please try again.</p>`;
    }
  };

  const bindHeroSearch = () => {
    const input = document.getElementById("hero-search");
    const btn = document.getElementById("hero-search-btn");
    const go = () => {
      const v = input.value.trim();
      if (v) Router.navigate(`search?q=${encodeURIComponent(v)}`);
    };
    btn.onclick = go;
    input.onkeydown = (e) => e.key === "Enter" && go();
  };

  const bindInlineSearch = () => {
    const input = document.getElementById("search-input");
    const btn = document.getElementById("search-btn");
    const go = () => {
      const v = input.value.trim();
      if (v) Router.navigate(`search?q=${encodeURIComponent(v)}`);
    };
    btn.onclick = go;
    input.onkeydown = (e) => e.key === "Enter" && go();
  };

  return { render };
})();

window.SearchPage = SearchPage;
