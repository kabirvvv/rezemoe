// ============================================================
// ANIME INFO PAGE
// ============================================================
const AnimePage = (() => {
  const render = async ({ id }) => {
    if (!id) { UI.error("No anime ID provided."); return; }
    UI.loading("Fetching anime details…");

    try {
      const data = await API.getAnimeInfo(id);
      const { data: anime, seasons = [] } = data;
      UI.setTitle(anime.title);

      const info = anime.animeInfo || {};
      const genres = (info.Genres || []).map
        ? info.Genres.map((g) => `<a class="genre-tag" href="#category?c=genre/${encodeURIComponent(g.name?.toLowerCase() || g)}" onclick="event.preventDefault();Router.navigate('category?c=genre/${encodeURIComponent(g.name?.toLowerCase() || g)}')">${g.name || g}</a>`).join("")
        : "";

      const infoRows = Object.entries({
        Type: anime.showType,
        Status: info.Status,
        Aired: info.Aired,
        Premiered: info.Premiered,
        Duration: info.Duration,
        Studios: info.Studios,
        Score: info["MAL Score"],
        Synonyms: info.Synonyms,
      })
        .filter(([, v]) => v)
        .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`)
        .join("");

      const seasonsHtml = seasons.length
        ? `<div class="seasons">
            <h3 class="sub-title">Seasons</h3>
            <div class="seasons-list">
              ${seasons.map((s) => `
                <a class="season-card ${s.id === id ? "season-card--active" : ""}" 
                   href="#anime?id=${encodeURIComponent(s.id)}"
                   onclick="event.preventDefault();Router.navigate('anime?id=${encodeURIComponent(s.id)}')">
                  <img src="${s.season_poster || anime.poster}" alt="${s.title}" loading="lazy" onerror="this.src='assets/placeholder.svg'">
                  <span>${s.season || s.title}</span>
                </a>`).join("")}
            </div>
          </div>` : "";

      UI.render(`
        <div class="anime-page">
          <div class="anime-hero" style="--bg:url('${anime.poster}')">
            <div class="anime-hero__blur"></div>
            <div class="anime-hero__content">
              <div class="anime-poster-wrap">
                <img class="anime-poster" src="${anime.poster}" alt="${anime.title}" onerror="this.src='assets/placeholder.svg'">
              </div>
              <div class="anime-meta">
                <div class="anime-meta__badges">
                  ${anime.showType ? `<span class="badge badge--type">${anime.showType}</span>` : ""}
                  ${info["MAL Score"] ? `<span class="badge badge--score">★ ${info["MAL Score"]}</span>` : ""}
                </div>
                <h1 class="anime-meta__title">${anime.title}</h1>
                ${anime.japanese_title ? `<p class="anime-meta__jtitle">${anime.japanese_title}</p>` : ""}
                <div class="anime-meta__genres">${genres}</div>
                <p class="anime-meta__overview">${info.Overview || ""}</p>
                <div class="anime-meta__actions">
                  <button class="btn btn--primary" id="watch-btn">
                    <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg> Watch Now
                  </button>
                  <button class="btn btn--ghost" id="ep-list-btn">
                    <svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                    Episodes
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
          </div>
        </div>
      `);

      // Load episodes inline
      const epSection = document.getElementById("episodes-section");
      document.getElementById("ep-list-btn").onclick = () => {
        epSection.scrollIntoView({ behavior: "smooth" });
      };
      document.getElementById("watch-btn").onclick = async () => {
        // get first episode
        try {
          const epData = await API.getEpisodes(id);
          const first = epData.episodes?.[0];
          if (first) {
            Router.navigate(`watch?id=${encodeURIComponent(id)}&ep=${first.data_id}`);
          } else {
            Router.navigate(`watch?id=${encodeURIComponent(id)}`);
          }
        } catch {
          Router.navigate(`watch?id=${encodeURIComponent(id)}`);
        }
      };

      // Async episode list
      loadEpisodes(id, epSection);
    } catch (e) {
      UI.error("Failed to load anime info.");
    }
  };

  const loadEpisodes = async (id, container) => {
    container.innerHTML = `<div class="spinner" style="margin:2rem auto"></div>`;
    try {
      const data = await API.getEpisodes(id);
      const episodes = data.episodes || [];
      container.innerHTML = `
        <div class="episodes-section">
          <div class="episodes-header">
            <h3 class="sub-title">Episodes <span class="ep-count">${data.totalEpisodes || episodes.length}</span></h3>
            <input class="ep-search" type="text" placeholder="Search episode…" id="ep-filter">
          </div>
          <div class="ep-grid" id="ep-grid">
            ${renderEpGrid(episodes, id)}
          </div>
        </div>`;
      document.getElementById("ep-filter").addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase();
        const filtered = episodes.filter(
          (ep) =>
            String(ep.episode_no).includes(q) ||
            (ep.title || "").toLowerCase().includes(q)
        );
        document.getElementById("ep-grid").innerHTML = renderEpGrid(filtered, id);
      });
    } catch {
      container.innerHTML = "";
    }
  };

  const renderEpGrid = (episodes, animeId) =>
    episodes.map((ep) => `
      <a class="ep-btn" href="#watch?id=${encodeURIComponent(animeId)}&ep=${ep.data_id}"
         onclick="event.preventDefault();Router.navigate('watch?id=${encodeURIComponent(animeId)}&ep=${ep.data_id}')"
         title="${ep.title || ep.jname || "Episode " + ep.episode_no}">
        ${ep.episode_no}
      </a>`).join("");

  return { render };
})();

window.AnimePage = AnimePage;
