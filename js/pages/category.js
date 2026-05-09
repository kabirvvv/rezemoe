// ============================================================
// CATEGORY + GENRE PAGE — Shirayuki Scrapper API V2
// ============================================================
const CategoryPage = (() => {
  const LABELS = {
    "top-airing":       "Top Airing",
    "most-popular":     "Most Popular",
    "most-favorite":    "Most Favorite",
    "completed":        "Completed",
    "recently-updated": "Recently Updated",
    "recently-added":   "Recently Added",
    "top-upcoming":     "Top Upcoming",
    "subbed-anime":     "Subbed Anime",
    "dubbed-anime":     "Dubbed Anime",
    "movie":            "Movies",
    "tv":               "TV Series",
    "ova":              "OVA",
    "ona":              "ONA",
    "special":          "Specials",
    "music":            "Music",
  };
  const SLUG_MAP = {
  "top-airing":    "tv",
  "most-popular":  "tv",
  "most-favorite": "tv",
  "recently-added":"tv",
  "top-upcoming":  "tv",
  "subbed-anime":  "tv",
  "dubbed-anime":  "tv",
};

  const render = async ({ c, page = "1" }) => {
    if (!c) { Router.navigate("home"); return; }
    const label = LABELS[c] || c.replace(/[-_]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    const p = +page || 1;
    UI.setTitle(label);

    UI.render(`
      <div class="category-page container">
        <div class="page-header"><h1 class="page-title">${label}</h1></div>
        <div id="cat-grid">${UI.skeletonCards(24)}</div>
        <div id="cat-pagination"></div>
      </div>`);

    try {
      const raw   = await API.getCategory(c, p);
      const items = raw.animes || raw.data || (Array.isArray(raw) ? raw : []);
      const total = raw.totalPages || 1;

      document.getElementById("cat-grid").innerHTML = items.length
        ? UI.grid(items, UI.animeCard)
        : `<div class="empty-state"><p>No anime found.</p></div>`;

      document.getElementById("cat-pagination").innerHTML =
        UI.pagination(p, total, `(pg)=>Router.navigate('category?c=${encodeURIComponent(c)}&page='+pg)`);
    } catch (e) {
      document.getElementById("cat-grid").innerHTML =
        `<div class="error-text">Failed to load category: ${e.message}</div>`;
    }
  };

  return { render };
})();

window.CategoryPage = CategoryPage;

// ── Genre page (separate route) ────────────────────────────
const GenrePage = (() => {
  const render = async ({ g, page = "1" }) => {
    if (!g) { Router.navigate("home"); return; }
    const label = g.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    const p = +page || 1;
    UI.setTitle(`Genre: ${label}`);

    UI.render(`
      <div class="category-page container">
        <div class="page-header">
          <span class="page-breadcrumb"><a class="breadcrumb-link" href="#browse"
            onclick="event.preventDefault();Router.navigate('browse')">Browse</a> › Genres</span>
          <h1 class="page-title">${label}</h1>
        </div>
        <div id="genre-grid">${UI.skeletonCards(24)}</div>
        <div id="genre-pagination"></div>
      </div>`);

    try {
      const raw   = await API.getGenre(g, p);
      const items = raw.animes || raw.data || (Array.isArray(raw) ? raw : []);
      const total = raw.totalPages || 1;

      document.getElementById("genre-grid").innerHTML = items.length
        ? UI.grid(items, UI.animeCard)
        : `<div class="empty-state"><p>No anime found for this genre.</p></div>`;

      document.getElementById("genre-pagination").innerHTML =
        UI.pagination(p, total, `(pg)=>Router.navigate('genre?g=${encodeURIComponent(g)}&page='+pg)`);
    } catch (e) {
      document.getElementById("genre-grid").innerHTML =
        `<div class="error-text">Failed to load genre: ${e.message}</div>`;
    }
  };

  return { render };
})();

window.GenrePage = GenrePage;
