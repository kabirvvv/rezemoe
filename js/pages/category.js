// ============================================================
// CATEGORY PAGE
// ============================================================
const CategoryPage = (() => {
  const LABELS = {
    "top-airing": "Top Airing",
    "most-popular": "Most Popular",
    "most-favorite": "Most Favorite",
    "completed": "Completed",
    "recently-updated": "Recently Updated",
    "recently-added": "Recently Added",
    "top-upcoming": "Top Upcoming",
    "subbed-anime": "Subbed Anime",
    "dubbed-anime": "Dubbed Anime",
    "movie": "Movies",
    "tv": "TV Series",
    "ova": "OVA",
    "ona": "ONA",
    "special": "Specials",
    "music": "Music",
  };

  const render = async ({ c, page = "1" }) => {
    if (!c) { Router.navigate("home"); return; }
    const label = LABELS[c] || c.replace(/[-/]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    const p = +page || 1;
    UI.setTitle(label);

    UI.render(`
      <div class="category-page container">
        <div class="page-header">
          <h1 class="page-title">${label}</h1>
        </div>
        <div id="cat-grid">${UI.skeletonCards(24)}</div>
        <div id="cat-pagination"></div>
      </div>`);

    try {
      const data = await API.getCategory(c, p);
      const items = data.data || [];
      const total = data.totalPages || 1;

      document.getElementById("cat-grid").innerHTML = items.length
        ? UI.grid(items, UI.animeCard)
        : `<div class="empty-state"><p>No anime found.</p></div>`;

      document.getElementById("cat-pagination").innerHTML =
        UI.pagination(p, total, `(pg)=>Router.navigate('category?c=${encodeURIComponent(c)}&page='+pg)`);
    } catch {
      document.getElementById("cat-grid").innerHTML =
        `<div class="error-text">Failed to load category.</div>`;
    }
  };

  return { render };
})();

window.CategoryPage = CategoryPage;
