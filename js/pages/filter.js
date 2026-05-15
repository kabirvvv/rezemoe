// ============================================================
// BROWSE / FILTER PAGE — AniList searchAdvanced
// ============================================================
const FilterPage = (() => {
  // Values match AniList enums (FORMAT_MAP / STATUS_MAP / SORT_MAP in api.js handle any aliases)
  const TYPES    = [["", "All Types"],    ["tv","TV"],["movie","Movie"],["ova","OVA"],["ona","ONA"],["special","Special"],["music","Music"]];
  const STATUSES = [["", "All Statuses"],["currently-airing","Airing"],["finished-airing","Finished"],["not-yet-aired","Upcoming"]];
  const SORTS    = [["", "Popularity"],   ["score","Score"],["recently_added","Recently Added"],["title_az","Title A–Z"]];
  const SEASONS  = [["", "All Seasons"],  ["spring","Spring"],["summer","Summer"],["fall","Fall"],["winter","Winter"]];
  const GENRES   = [
    "Action","Adventure","Comedy","Drama","Fantasy","Horror","Isekai","Mecha","Mystery",
    "Psychological","Romance","Sci-Fi","Slice of Life","Sports","Supernatural","Thriller",
  ];

  let currentPage = 1;

  const sel = (id, opts, cur) => `
    <select class="filter-select" id="${id}">
      ${opts.map(([v, l]) => `<option value="${v}" ${v === (cur || "") ? "selected" : ""}>${l}</option>`).join("")}
    </select>`;

  const render = async (params = {}) => {
    UI.setTitle("Browse Anime");
    currentPage = +params.page || 1;

    UI.render(`
      <div class="filter-page container">
        <div class="page-header"><h1 class="page-title">Browse Anime</h1></div>
        <div class="filter-panel">
          <div class="filter-row">
            <div class="filter-group"><label>Type</label>${sel("f-type", TYPES, params.type)}</div>
            <div class="filter-group"><label>Status</label>${sel("f-status", STATUSES, params.status)}</div>
            <div class="filter-group"><label>Season</label>${sel("f-season", SEASONS, params.season)}</div>
            <div class="filter-group"><label>Sort By</label>${sel("f-sort", SORTS, params.sort)}</div>
          </div>
          <div class="filter-row">
            <div class="filter-group filter-group--wide">
              <label>Genres</label>
              <div class="genre-chips" id="genre-chips">
                ${GENRES.map((g) => `
                  <button class="genre-chip ${(params.genres || "").split(",").includes(g.toLowerCase()) ? "genre-chip--active" : ""}"
                          data-genre="${g.toLowerCase()}">${g}</button>`).join("")}
              </div>
            </div>
          </div>
          <div class="filter-actions">
            <button class="btn btn--primary" id="apply-filter">Apply Filters</button>
            <button class="btn btn--ghost"   id="reset-filter">Reset</button>
          </div>
        </div>
        <div id="filter-results">${UI.skeletonCards(24)}</div>
        <div id="filter-pagination"></div>
      </div>`);

    document.querySelectorAll(".genre-chip").forEach(c =>
      c.addEventListener("click", () => c.classList.toggle("genre-chip--active"))
    );
    document.getElementById("apply-filter").onclick = () => { currentPage = 1; doSearch(); };
    document.getElementById("reset-filter").onclick = () => Router.navigate("browse");

    doSearch(params);
  };

  const buildParams = () => {
    const v = (id) => document.getElementById(id)?.value || undefined;
    const genres = [...document.querySelectorAll(".genre-chip--active")]
      .map(c => c.dataset.genre).join(",") || undefined;
    return { type: v("f-type"), status: v("f-status"), season: v("f-season"), sort: v("f-sort"), genres, page: currentPage };
  };

  const doSearch = async (initial) => {
    const res    = document.getElementById("filter-results");
    res.innerHTML = UI.skeletonCards(24);
    const params = initial && typeof initial === "object" && initial.page ? initial : buildParams();

    try {
      const raw   = await API.searchAdvanced(params);
      const items = raw.animes || raw.data || (Array.isArray(raw) ? raw : []);
      const total = raw.totalPages || 1;

      res.innerHTML = items.length
        ? UI.grid(items, UI.animeCard)
        : `<div class="empty-state"><p>No anime match these filters.</p></div>`;

      document.getElementById("filter-pagination").innerHTML =
        UI.pagination(currentPage, total, "(pg)=>FilterPage._goPage(pg)");
    } catch (e) {
      res.innerHTML = `<div class="error-text">Failed to load results: ${e.message}</div>`;
    }
  };

  const _goPage = (pg) => {
    currentPage = pg;
    doSearch();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return { render, _goPage };
})();

window.FilterPage = FilterPage;
                                     
