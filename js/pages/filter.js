// ============================================================
// FILTER / BROWSE PAGE
// ============================================================
const FilterPage = (() => {
  const TYPES = [["", "All Types"], ["1", "Movie"], ["2", "TV"], ["3", "OVA"], ["4", "ONA"], ["5", "Special"], ["6", "Music"]];
  const STATUSES = [["", "All Statuses"], ["1", "Finished"], ["2", "Airing"], ["3", "Upcoming"]];
  const RATINGS = [["", "All Ratings"], ["1", "G"], ["2", "PG"], ["3", "PG-13"], ["4", "R"], ["5", "R+"], ["6", "Rx"]];
  const SORTS = [["", "Default"], ["score", "Score"], ["recently_added", "Recent"]];
  const SEASONS = [["", "All Seasons"], ["spring", "Spring"], ["summer", "Summer"], ["fall", "Fall"], ["winter", "Winter"]];
  const LANGUAGES = [["", "All"], ["sub", "Subbed"], ["dub", "Dubbed"]];
  const GENRES = ["Action","Adventure","Comedy","Drama","Fantasy","Horror","Isekai","Mecha","Mystery","Psychological","Romance","Sci-Fi","Slice of Life","Sports","Supernatural","Thriller"];

  let currentPage = 1;
  let currentFilters = {};

  const sel = (id, opts, cur) => `
    <select class="filter-select" id="${id}">
      ${opts.map(([v, l]) => `<option value="${v}" ${v === cur ? "selected" : ""}>${l}</option>`).join("")}
    </select>`;

  const render = async (params = {}) => {
    UI.setTitle("Browse Anime");
    currentPage = +params.page || 1;
    currentFilters = params;

    UI.render(`
      <div class="filter-page container">
        <div class="page-header">
          <h1 class="page-title">Browse Anime</h1>
        </div>
        <div class="filter-panel" id="filter-panel">
          <div class="filter-row">
            <div class="filter-group">
              <label>Type</label>
              ${sel("f-type", TYPES, params.type || "")}
            </div>
            <div class="filter-group">
              <label>Status</label>
              ${sel("f-status", STATUSES, params.status || "")}
            </div>
            <div class="filter-group">
              <label>Rating</label>
              ${sel("f-rated", RATINGS, params.rated || "")}
            </div>
            <div class="filter-group">
              <label>Season</label>
              ${sel("f-season", SEASONS, params.season || "")}
            </div>
            <div class="filter-group">
              <label>Language</label>
              ${sel("f-language", LANGUAGES, params.language || "")}
            </div>
            <div class="filter-group">
              <label>Sort</label>
              ${sel("f-sort", SORTS, params.sort || "")}
            </div>
          </div>
          <div class="filter-row">
            <div class="filter-group filter-group--wide">
              <label>Genres</label>
              <div class="genre-chips" id="genre-chips">
                ${GENRES.map((g) => `<button class="genre-chip ${(params.genres || "").split(",").includes(g.toLowerCase()) ? "genre-chip--active" : ""}" data-genre="${g.toLowerCase()}">${g}</button>`).join("")}
              </div>
            </div>
          </div>
          <div class="filter-actions">
            <button class="btn btn--primary" id="apply-filter">Apply Filters</button>
            <button class="btn btn--ghost" id="reset-filter">Reset</button>
          </div>
        </div>
        <div id="filter-results">${UI.skeletonCards(24)}</div>
        <div id="filter-pagination"></div>
      </div>`);

    document.querySelectorAll(".genre-chip").forEach((chip) => {
      chip.addEventListener("click", () => chip.classList.toggle("genre-chip--active"));
    });

    document.getElementById("apply-filter").onclick = applyFilter;
    document.getElementById("reset-filter").onclick = () => {
      Router.navigate("browse");
    };

    await loadResults(buildParams());
  };

  const buildParams = () => {
    const p = {};
    const get = (id) => document.getElementById(id)?.value;
    if (get("f-type")) p.type = get("f-type");
    if (get("f-status")) p.status = get("f-status");
    if (get("f-rated")) p.rated = get("f-rated");
    if (get("f-season")) p.season = get("f-season");
    if (get("f-language")) p.language = get("f-language");
    if (get("f-sort")) p.sort = get("f-sort");
    const genres = [...document.querySelectorAll(".genre-chip--active")].map((c) => c.dataset.genre).join(",");
    if (genres) p.genres = genres;
    p.page = currentPage;
    return p;
  };

  const applyFilter = () => {
    currentPage = 1;
    const p = buildParams();
    currentFilters = p;
    loadResults(p);
  };

  const loadResults = async (params) => {
    const res = document.getElementById("filter-results");
    res.innerHTML = UI.skeletonCards(24);
    try {
      const data = await API.getFilter(params);
      const items = data.data || [];
      const total = data.totalPages || 1;
      res.innerHTML = items.length
        ? UI.grid(items, UI.animeCard)
        : `<div class="empty-state"><p>No anime match these filters.</p></div>`;
      document.getElementById("filter-pagination").innerHTML = UI.pagination(
        currentPage, total, `(pg)=>{FilterPage._goPage(pg)}`
      );
    } catch {
      res.innerHTML = `<div class="error-text">Failed to load results.</div>`;
    }
  };

  const _goPage = (pg) => {
    currentPage = pg;
    loadResults({ ...buildParams(), page: pg });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return { render, _goPage };
})();

window.FilterPage = FilterPage;
