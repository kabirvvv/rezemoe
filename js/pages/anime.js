// ============================================================
// ANIME INFO PAGE — Shirayuki Scrapper API V2
// ============================================================
const AnimePage = (() => {

  const render = async ({ id }) => {
    if (!id) { UI.error("No anime ID provided."); return; }
    UI.loading("Fetching anime details…");

    try {
      const raw = await API.getAnimeInfo(id);
      // Shirayuki wraps in { anime: { info, moreInfo }, seasons, relatedAnimes, recommendedAnimes }
      const anime    = raw.anime?.info    || raw.info    || raw.anime || raw;
      const moreInfo = raw.anime?.moreInfo || raw.moreInfo || {};
      const seasons  = raw.seasons        || [];
      const related  = raw.relatedAnimes  || raw.related  || [];
      const recommended = raw.recommendedAnimes || [];

      const title   = anime.name   || anime.title  || "Unknown";
      const poster  = anime.poster || anime.image  || "";
      const desc    = anime.description || moreInfo.overview || "";
      const stats   = anime.stats   || {};
      const type    = stats.type    || moreInfo.type    || "";
      const score   = stats.rating  || moreInfo.score   || "";

      UI.setTitle(title);

      // Genres
      const genres = (moreInfo.genres || []).map((g) =>
        `<a class="genre-tag" href="#genre?g=${encodeURIComponent(g.toLowerCase())}"
            onclick="event.preventDefault();Router.navigate('genre?g=${encodeURIComponent(g.toLowerCase())}')">${g}</a>`
      ).join("");

      // Info table
      const infoRows = Object.entries({
        Type:      type,
        Status:    moreInfo.status,
        Aired:     moreInfo.aired,
        Premiered: moreInfo.premiered,
        Duration:  moreInfo.duration,
        Studios:   moreInfo.studios,
        Score:     score,
        Synonyms:  moreInfo.synonyms,
        Japanese:  moreInfo.japanese,
      }).filter(([, v]) => v)
        .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`)
        .join("");

      // Seasons
      const seasonsHtml = seasons.length ? `
        <div class="seasons">
          <h3 class="sub-title">Seasons</h3>
          <div class="seasons-list">
            ${seasons.map((s) => `
              <a class="season-card ${s.id === id ? "season-card--active" : ""}"
                 href="#anime?id=${encodeURIComponent(s.id)}"
                 onclick="event.preventDefault();Router.navigate('anime?id=${encodeURIComponent(s.id)}')">
                <img src="${s.poster || poster}" alt="${s.title || s.name}" loading="lazy"
                     onerror="this.src='assets/placeholder.svg'">
                <span>${s.title || s.name || s.season}</span>
              </a>`).join("")}
          </div>
        </div>` : "";

      // Sub/Dub episode counts
      const epSub = stats.episodes?.sub ?? "";
      const epDub = stats.episodes?.dub ?? "";

      UI.render(`
        <div class="anime-page">
          <div class="anime-hero" style="--bg:url('${poster}')">
            <div class="anime-hero__blur"></div>
            <div class="anime-hero__content">
              <div class="anime-poster-wrap">
                <img class="anime-poster" src="${poster}" alt="${title}"
                     onerror="this.src='assets/placeholder.svg'">
              </div>
              <div class="anime-meta">
                <div class="anime-meta__badges">
                  ${type  ? `<span class="badge badge--type">${type}</span>`         : ""}
                  ${score ? `<span class="badge badge--score">★ ${score}</span>`     : ""}
                  ${epSub ? `<span class="badge badge--sub">SUB ${epSub} EP</span>`  : ""}
                  ${epDub ? `<span class="badge badge--dub">DUB ${epDub} EP</span>`  : ""}
                </div>
                <h1 class="anime-meta__title">${title}</h1>
                ${moreInfo.japanese ? `<p class="anime-meta__jtitle">${moreInfo.japanese}</p>` : ""}
                <div class="anime-meta__genres">${genres}</div>
                <p class="anime-meta__overview">${desc}</p>
                <div class="anime-meta__actions">
                  <button class="btn btn--primary" id="watch-btn">
                    <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg> Watch Now
                  </button>
                  <button class="btn btn--ghost" id="ep-list-btn">
                    <svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/>
                    <line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
                    <line x1="3" y1="18" x2="3.01" y2="18"/></svg> Episodes
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="anime-body container">
            <div class="anime-body__main">
              ${seasonsHtml}
              <div class="anime-details">
                <h3 class="sub-title">Details</h3>
                <table class="info-table">${infoRows}</table>
              </div>
              <div id="episodes-section"></div>
            </div>
            ${recommended.length ? `
              <div class="anime-body__side">
                <h3 class="sub-title">Recommended</h3>
                <div class="anime-grid anime-grid--compact">
                  ${recommended.slice(0,8).map(UI.animeCard).join("")}
                </div>
              </div>` : ""}
          </div>
        </div>
      `);

      document.getElementById("ep-list-btn").onclick = () =>
        document.getElementById("episodes-section").scrollIntoView({ behavior: "smooth" });

      document.getElementById("watch-btn").onclick = async () => {
        try {
          const epData = await API.getEpisodes(id);
          const eps = epData.episodes || epData || [];
          const first = eps[0];
          if (first) Router.navigate(`watch?id=${encodeURIComponent(id)}&ep=${first.episodeId || first.id || first.number}`);
          else Router.navigate(`watch?id=${encodeURIComponent(id)}`);
        } catch {
          Router.navigate(`watch?id=${encodeURIComponent(id)}`);
        }
      };

      loadEpisodes(id, document.getElementById("episodes-section"));
    } catch (e) {
      UI.error(`Failed to load anime.<br><small>${e.message}</small>`);
    }
  };

  const loadEpisodes = async (id, container) => {
    container.innerHTML = `<div class="spinner" style="margin:2rem auto"></div>`;
    try {
      const raw = await API.getEpisodes(id);
      const episodes = raw.episodes || (Array.isArray(raw) ? raw : []);

      container.innerHTML = `
        <div class="episodes-section">
          <div class="episodes-header">
            <h3 class="sub-title">Episodes <span class="ep-count">${episodes.length}</span></h3>
            <input class="ep-search" type="text" placeholder="Search episode…" id="ep-filter">
          </div>
          <div class="ep-grid" id="ep-grid">
            ${renderGrid(episodes, id)}
          </div>
        </div>`;

      document.getElementById("ep-filter").addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase();
        document.getElementById("ep-grid").innerHTML =
          renderGrid(episodes.filter((ep) =>
            String(ep.number || ep.episodeNo || "").includes(q) ||
            (ep.title || ep.name || "").toLowerCase().includes(q)
          ), id);
      });
    } catch { container.innerHTML = ""; }
  };

  const renderGrid = (episodes, animeId) =>
    episodes.map((ep) => {
      const epId  = ep.episodeId || ep.id || ep.number || ep.episodeNo;
      const epNum = ep.number    || ep.episodeNo || ep.episode || epId;
      const title = ep.title || ep.name || "";
      return `
        <a class="ep-btn" href="#watch?id=${encodeURIComponent(animeId)}&ep=${epId}"
           onclick="event.preventDefault();Router.navigate('watch?id=${encodeURIComponent(animeId)}&ep=${epId}')"
           title="${title}">
          ${epNum}
        </a>`;
    }).join("");

  return { render };
})();

window.AnimePage = AnimePage;
                    
