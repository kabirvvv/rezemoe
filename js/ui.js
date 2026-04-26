// ============================================================
// UI UTILITIES — shared components & helpers
// Adapted for Shirayuki Scrapper API V2 response shapes
// ============================================================
const UI = (() => {

  // ── Normalise an anime object from any endpoint ────────────
  // Shirayuki uses slightly different field names across endpoints
  const norm = (a) => ({
    id:     a.id || a.animeId || "",
    title:  a.title || a.name || a.english || "Unknown",
    poster: a.poster || a.image || a.img || "",
    type:   a.type || a.showType || a.animeType || "",
    sub:    a.sub ?? a.tvInfo?.sub ?? "",
    dub:    a.dub ?? a.tvInfo?.dub ?? "",
    eps:    a.episodes?.sub ?? a.tvInfo?.eps ?? a.totalEpisodes ?? "",
  });

  // ── Anime card ─────────────────────────────────────────────
  const animeCard = (raw) => {
    const a = norm(raw);
    if (!a.id) return "";
    return `
      <a class="card" href="#watch?id=${encodeURIComponent(a.id)}"
         onclick="event.preventDefault();Router.navigate('watch?id=${encodeURIComponent(a.id)}')">
        <div class="card__poster-wrap">
          <img class="card__poster" src="${a.poster}" alt="${a.title}" loading="lazy"
               onerror="this.src='assets/placeholder.svg'">
          <div class="card__overlay">
            <span class="card__play-btn">
              <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
            </span>
          </div>
          <div class="card__badges">
            ${a.sub  ? `<span class="badge badge--sub">SUB ${a.sub}</span>`  : ""}
            ${a.dub  ? `<span class="badge badge--dub">DUB ${a.dub}</span>`  : ""}
            ${a.eps  ? `<span class="badge badge--eps">${a.eps} EP</span>`   : ""}
          </div>
          ${a.type ? `<span class="card__type">${a.type}</span>` : ""}
        </div>
        <div class="card__info">
          <p class="card__title">${a.title}</p>
        </div>
      </a>`;
  };

  const skeletonCard = () => `
    <div class="card card--skeleton">
      <div class="card__poster-wrap skeleton-box"></div>
      <div class="card__info">
        <div class="skeleton-line skeleton-line--80"></div>
        <div class="skeleton-line skeleton-line--50"></div>
      </div>
    </div>`;

  const skeletonCards = (n = 12) => Array(n).fill(0).map(skeletonCard).join("");

  const sectionHeader = (title, link = "") => `
    <div class="section-header">
      <h2 class="section-title"><span class="section-accent"></span>${title}</h2>
      ${link ? `<a class="section-more" href="#${link}"
                   onclick="event.preventDefault();Router.navigate('${link}')">
                  View All
                  <svg viewBox="0 0 24 24"><polyline points="9,18 15,12 9,6"/></svg>
                </a>` : ""}
    </div>`;

  const grid = (items, renderFn) =>
    `<div class="anime-grid">${items.map(renderFn).join("")}</div>`;

  const pagination = (current, total, onPage) => {
    if (total <= 1) return "";
    const range = [];
    for (let i = Math.max(2, current - 2); i <= Math.min(total - 1, current + 2); i++)
      range.push(i);
    if (current - 2 > 2)     range.unshift("…");
    if (current + 2 < total - 1) range.push("…");
    range.unshift(1);
    if (total > 1) range.push(total);

    return `<div class="pagination">
      ${current > 1
        ? `<button class="page-btn" onclick="${onPage}(${current - 1})">
             <svg viewBox="0 0 24 24"><polyline points="15,18 9,12 15,6"/></svg>
           </button>` : ""}
      ${range.map((p) =>
        p === "…"
          ? `<span class="page-ellipsis">…</span>`
          : `<button class="page-btn ${p === current ? "page-btn--active" : ""}"
                     onclick="${onPage}(${p})">${p}</button>`
      ).join("")}
      ${current < total
        ? `<button class="page-btn" onclick="${onPage}(${current + 1})">
             <svg viewBox="0 0 24 24"><polyline points="9,18 15,12 9,6"/></svg>
           </button>` : ""}
    </div>`;
  };

  const toast = (msg, type = "info") => {
    const t = document.createElement("div");
    t.className = `toast toast--${type}`;
    t.textContent = msg;
    document.getElementById("toast-container").appendChild(t);
    requestAnimationFrame(() => t.classList.add("toast--show"));
    setTimeout(() => {
      t.classList.remove("toast--show");
      t.addEventListener("transitionend", () => t.remove());
    }, 3000);
  };

  const setTitle = (t) =>
    (document.title = t ? `${t} — ${CONFIG.SITE_NAME}` : CONFIG.SITE_NAME);

  const render = (html) => {
    const main = document.getElementById("main-content");
    main.innerHTML = html;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loading = (msg = "Loading…") =>
    render(`<div class="loading-state"><div class="spinner"></div><p class="loading-msg">${msg}</p></div>`);

  const error = (msg = "Something went wrong.") =>
    render(`<div class="error-state">
      <div class="error-icon">✕</div><h2>Oops!</h2><p>${msg}</p>
      <button class="btn btn--primary" onclick="history.back()">Go Back</button>
    </div>`);

  return { animeCard, skeletonCards, sectionHeader, grid, pagination, toast, setTitle, render, loading, error, norm };
})();

window.UI = UI;
