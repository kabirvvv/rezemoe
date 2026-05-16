// ============================================================
// WATCH / PLAYER PAGE — reanime.to (AniList ID + episode number)
// ============================================================
const WatchPage = (() => {
  let currentAnimeId = null;
  let currentEpNum   = null;
  let allEpisodes    = [];

  // ── Mobile Responsive Styles ───────────────────────────────
  const mobileStyles = `
    <style>
      .watch-page { display: flex; flex-direction: row; gap: 20px; width: 100%; max-width: 1400px; margin: 0 auto; padding: 15px; box-sizing: border-box; }
      .player-area { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
      .player-wrap { width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 8px; overflow: hidden; position: relative; }
      .watch-sidebar { width: 320px; flex-shrink: 0; display: flex; flex-direction: column; gap: 15px; }
      .ep-list { max-height: 500px; overflow-y: auto; scroll-behavior: smooth; }

      @media (max-width: 900px) {
        .watch-page { flex-direction: column; padding: 0; gap: 15px; }
        .watch-sidebar { width: 100%; padding: 0 15px; box-sizing: border-box; }
        .player-wrap { border-radius: 0; }
        .player-toolbar { display: flex; flex-direction: column; gap: 12px; padding: 10px 15px; }
        .player-toolbar__left, .player-toolbar__right { display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 10px; }
        .tool-btn, .type-btn, .ep-search { min-height: 44px; font-size: 16px; padding: 8px 16px; }
        .tool-btn { min-width: 44px; display: flex; align-items: center; justify-content: center; }
        .ep-list { max-height: 400px; }
        .ep-item { padding: 14px 15px; min-height: 48px; display: flex; align-items: center; }
      }
    </style>
  `;

  // ── Main render ────────────────────────────────────────────
  const render = async ({ id, ep }) => {
    if (!id) { UI.error("No anime specified."); return; }
    currentAnimeId = id;

    UI.setTitle("Loading…");
    UI.render(`
      ${mobileStyles}
      <div class="watch-page" id="watch-page">
        <div class="player-area">
          <div class="player-wrap" id="player-wrap">
            <div class="player-loader"><div class="spinner"></div></div>
          </div>
          <div class="player-toolbar" id="player-toolbar">
            <div class="player-toolbar__left">
              <button class="tool-btn" id="prev-ep-btn" title="Previous">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,18 9,12 15,6"/></svg>
              </button>
              <span class="ep-label" id="ep-label" style="font-weight:600; text-align:center; flex:1;">Loading…</span>
              <button class="tool-btn" id="next-ep-btn" title="Next">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>
              </button>
            </div>

          </div>
        </div>

        <div class="watch-sidebar">
          <div class="sidebar-anime-info" id="sidebar-info">
            <div class="skeleton-box" style="height:96px;border-radius:8px"></div>
          </div>
          <div class="sidebar-eps" style="display:flex; flex-direction:column; gap:10px;">
            <div class="sidebar-eps__header" style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:bold; font-size:1.1rem;">Episodes</span>
              <input class="ep-search ep-search--sm" id="sidebar-ep-search" type="text" placeholder="Search…">
            </div>
            <div class="ep-list" id="ep-list">
              ${Array(14).fill('<div class="ep-item ep-item--skel skeleton-box" style="margin-bottom:8px;"></div>').join("")}
            </div>
          </div>
        </div>
      </div>
    `);

    // Wire prev / next
    document.getElementById("prev-ep-btn").addEventListener("click", () => {
      const idx = allEpisodes.findIndex(e => e.number === currentEpNum);
      if (idx > 0) selectEp(allEpisodes[idx - 1]);
    });
    document.getElementById("next-ep-btn").addEventListener("click", () => {
      const idx = allEpisodes.findIndex(e => e.number === currentEpNum);
      if (idx >= 0 && idx < allEpisodes.length - 1) selectEp(allEpisodes[idx + 1]);
    });

    // Episode search filter
    document.getElementById("sidebar-ep-search").addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      renderEpList(allEpisodes.filter(ep =>
        String(ep.number).includes(q) || (ep.title || "").toLowerCase().includes(q)
      ), currentEpNum);
    });

    // Load sidebar and episode list in parallel
    loadSidebarInfo(id);
    await loadEpisodeList(id);

    const targetNum = ep ? parseInt(ep) : 1;
    const targetEp  = allEpisodes.find(e => e.number === targetNum) || allEpisodes[0];
    if (targetEp) {
      currentEpNum = targetEp.number;
      updateEpLabel();
      renderEpList(allEpisodes, currentEpNum);
      loadPlayer();
    }
  };

  // ── Helpers ────────────────────────────────────────────────
const updateEpLabel = () => {
    const label = document.getElementById("ep-label");
    if (label) label.textContent = `EP ${currentEpNum}`;
  };

  // ── Sidebar info ───────────────────────────────────────────
  const loadSidebarInfo = async (id) => {
    try {
      const raw  = await API.getAnimeInfo(id);
      const info = raw.anime?.info || raw.info || raw;
      const title  = info.name  || info.title || "";
      const poster = info.poster || info.image || "";
      const type   = info.stats?.type || info.type || "";
      document.getElementById("sidebar-info").innerHTML = `
        <a class="sidebar-anime-card"
           href="#anime?id=${encodeURIComponent(id)}"
           onclick="event.preventDefault();Router.navigate('anime?id=${encodeURIComponent(id)}')"
           style="display:flex; gap:15px; text-decoration:none; color:inherit; align-items:center;">
          <img src="${poster}" alt="${title}" onerror="this.src='assets/placeholder.svg'"
               style="width:60px; height:85px; object-fit:cover; border-radius:6px;">
          <div>
            <p class="sidebar-anime-title" style="margin:0; font-weight:bold; font-size:1.1rem; line-height:1.2;">${title}</p>
            <p class="sidebar-anime-type"  style="margin:5px 0 0; opacity:0.7; font-size:0.9rem;">${type}</p>
          </div>
        </a>`;
      UI.setTitle(title);
    } catch { /* silent */ }
  };

  // ── Episode list ───────────────────────────────────────────
  const loadEpisodeList = async (id) => {
    try {
      const raw   = await API.getEpisodes(id);
      allEpisodes = raw.episodes || (Array.isArray(raw) ? raw : []);
    } catch { allEpisodes = []; }
  };

  const renderEpList = (episodes, activeNum) => {
    const list = document.getElementById("ep-list");
    if (!list) return;
    list.innerHTML = episodes.map(ep => {
      const active = ep.number === activeNum;
      return `
        <div class="ep-item ${active ? "ep-item--active" : ""}"
             onclick="WatchPage._selectByNum(${ep.number})"
             style="cursor:pointer; display:flex; gap:10px; border-radius:6px; margin-bottom:5px; transition:background 0.2s;">
          <span class="ep-item__num"   style="min-width:30px; font-weight:bold;">${ep.number}</span>
          <span class="ep-item__title" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${ep.title || "Episode " + ep.number}</span>
        </div>`;
    }).join("");

    const el = list.querySelector(".ep-item--active");
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  };

  const selectEp = (ep) => {
    currentEpNum = ep.number;
    updateEpLabel();
    renderEpList(allEpisodes, currentEpNum);
    window.history.replaceState(null, "", `#watch?id=${encodeURIComponent(currentAnimeId)}&ep=${currentEpNum}`);
    if (window.innerWidth <= 900) {
      document.getElementById("player-wrap")?.scrollIntoView({ behavior: "smooth" });
    }
    loadPlayer();
  };

  // ── Player — fetch reanime API, parse dataLink, inject into iframe ──
  const loadPlayer = async () => {
    const wrap = document.getElementById("player-wrap");
    if (!wrap || !currentEpNum) return;
    wrap.innerHTML = `<div class="player-loader" style="display:flex; height:100%; justify-content:center; align-items:center;"><div class="spinner">Loading...</div></div>`;

    try {
      const apiUrl = `https://reanime.to/api/flix/${encodeURIComponent(currentAnimeId)}/${currentEpNum}`;
      const res = await fetch(API.proxy(apiUrl));
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();

      // Extract the embed URL — dataLink is the primary field
      const embedUrl = data.dataLink || data.link || data.url || data.embed;
      if (!embedUrl) throw new Error("No dataLink found in API response");

      wrap.innerHTML = `
        <iframe
          id="anime-iframe"
          class="video-player"
          src="${embedUrl}"
          allowfullscreen
          allow="autoplay; fullscreen; picture-in-picture"
          referrerpolicy="no-referrer"
          frameborder="0"
          style="width:100%; height:100%; border:none; display:block;">
        </iframe>`;
    } catch (err) {
      wrap.innerHTML = `
        <div style="display:flex; height:100%; justify-content:center; align-items:center;
                    color:#fff; flex-direction:column; gap:10px; padding:20px; text-align:center;">
          <span style="font-size:1.5rem;">⚠️</span>
          <span style="font-weight:600;">Failed to load player</span>
          <span style="opacity:0.6; font-size:0.85rem;">${err.message}</span>
        </div>`;
    }
  };

  const _selectByNum = (num) => {
    const ep = allEpisodes.find(e => e.number === num);
    if (ep) selectEp(ep);
  };

  return { render, _selectByNum };
})();

window.WatchPage = WatchPage;
