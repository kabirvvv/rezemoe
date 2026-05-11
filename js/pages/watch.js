// ============================================================
// WATCH / PLAYER PAGE — Shirayuki Scrapper API V2 (Mobile Optimized)
// ============================================================
const WatchPage = (() => {
  let currentAnimeId = null;
  let currentEpId    = null; 
  let currentEpNum   = null; 
  let allEpisodes    = [];
  let hls            = null;

  // ── Mobile Responsive Styles ───────────────────────────────
  // Injected directly to guarantee mobile formatting without needing external CSS changes
  const mobileStyles = `
    <style>
      /* Desktop defaults (Assuming a flex container for watch-page) */
      .watch-page { display: flex; flex-direction: row; gap: 20px; width: 100%; max-width: 1400px; margin: 0 auto; padding: 15px; box-sizing: border-box; }
      .player-area { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
      .player-wrap { width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 8px; overflow: hidden; position: relative; }
      .watch-sidebar { width: 320px; flex-shrink: 0; display: flex; flex-direction: column; gap: 15px; }
      .ep-list { max-height: 500px; overflow-y: auto; scroll-behavior: smooth; }
      
      /* 📱 Mobile Breakpoints */
      @media (max-width: 900px) {
        .watch-page { 
          flex-direction: column; 
          padding: 0; /* Remove padding to let video touch edges on mobile */
          gap: 15px; 
        }
        
        /* Make sidebar take full width below the player */
        .watch-sidebar { width: 100%; padding: 0 15px; box-sizing: border-box; }
        
        .player-wrap { border-radius: 0; } /* Flush with screen edges */
        
        /* Toolbar wrapping and touch-friendly sizing */
        .player-toolbar { 
          display: flex; 
          flex-direction: column; /* Stack controls on very small screens */
          gap: 12px; 
          padding: 10px 15px; 
        }
        .player-toolbar__left, .player-toolbar__right { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          width: 100%; 
          gap: 10px;
        }

        /* 👆 Touch Targets (Min 44x44px for Apple/Android guidelines) */
        .tool-btn, .type-btn, .server-select, .ep-search { 
          min-height: 44px; 
          font-size: 16px; /* 16px prevents iOS auto-zoom on inputs */
          padding: 8px 16px;
        }
        .tool-btn { min-width: 44px; display: flex; align-items: center; justify-content: center; }
        
        /* Episode list height adjustment and touch padding */
        .ep-list { max-height: 400px; }
        .ep-item { 
          padding: 14px 15px; /* Larger tap area */
          min-height: 48px; 
          display: flex; 
          align-items: center;
        }
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
                <svg viewBox="0 0 24 24" width="5" height="5" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,18 9,12 15,6"/></svg>
              </button>
              <span class="ep-label" id="ep-label" style="font-weight: 600; text-align: center; flex: 1;">Loading…</span>
              <button class="tool-btn" id="next-ep-btn" title="Next">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>
              </button>
            </div>
            <div class="player-toolbar__right">
              <div class="type-toggle" id="type-toggle" style="display:flex; gap:5px;">
                <button class="type-btn type-btn--active" data-type="sub">SUB</button>
                <button class="type-btn" data-type="dub">DUB</button>
              </div>
              <select class="server-select" id="server-select" style="flex:1; max-width: 150px;">
                <option value="server-1">Server 1</option>
                <option value="server-2">Server 2</option>
              </select>
            </div>
          </div>
        </div>

        <div class="watch-sidebar">
          <div class="sidebar-anime-info" id="sidebar-info">
            <div class="skeleton-box" style="height:96px;border-radius:8px"></div>
          </div>
          <div class="sidebar-eps" style="display:flex; flex-direction:column; gap:10px;">
            <div class="sidebar-eps__header" style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:bold; font-size: 1.1rem;">Episodes</span>
              <input class="ep-search ep-search--sm" id="sidebar-ep-search" type="text" placeholder="Search…">
            </div>
            <div class="ep-list" id="ep-list">
              ${Array(14).fill('<div class="ep-item ep-item--skel skeleton-box" style="margin-bottom:8px;"></div>').join("")}
            </div>
          </div>
        </div>
      </div>
    `);

    // Wire controls
    document.getElementById("prev-ep-btn").addEventListener("click", () => {
      const idx = allEpisodes.findIndex((e) => String(getEpId(e)) === String(currentEpId));
      if (idx > 0) selectEp(allEpisodes[idx - 1]);
    });
    document.getElementById("next-ep-btn").addEventListener("click", () => {
      const idx = allEpisodes.findIndex((e) => String(getEpId(e)) === String(currentEpId));
      if (idx >= 0 && idx < allEpisodes.length - 1) selectEp(allEpisodes[idx + 1]);
    });
    document.getElementById("server-select").addEventListener("change", reloadStream);
    document.querySelectorAll(".type-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        document.querySelectorAll(".type-btn").forEach((b) => b.classList.remove("type-btn--active"));
        btn.classList.add("type-btn--active");
        reloadStream();
      })
    );
    document.getElementById("sidebar-ep-search").addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      renderEpList(allEpisodes.filter((ep) =>
        String(ep.number || ep.episodeNo || "").includes(q) ||
        (ep.title || ep.name || "").toLowerCase().includes(q)
      ), currentEpId);
    });

    // ── MegaPlay postMessage listener (auto-next & progress tracking) ──
    window.addEventListener("message", function (event) {
      if (event.origin !== "https://megaplay.buzz") return;
      let data = event.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch (e) { return; }
      }
      if (data.channel === "megacloud") {
        if (data.event === "complete") {
          const idx = allEpisodes.findIndex((e) => String(getEpId(e)) === String(currentEpId));
          if (idx >= 0 && idx < allEpisodes.length - 1) selectEp(allEpisodes[idx + 1]);
        }
      }
      if (data.type === "watching-log") {
        // watch time available: data.currentTime, data.duration
      }
    });

    // Load sidebar anime info
    loadSidebarInfo(id);

    // Load episodes then start player
    await loadEpisodeList(id);
    const firstEp  = allEpisodes[0];
    const targetEp = ep
      ? allEpisodes.find(e => String(getEpNum(e)) === String(ep)) || firstEp
      : firstEp;
    if (targetEp) {
      currentEpId  = getEpId(targetEp);
      currentEpNum = getEpNum(targetEp);
      updateEpLabel();
      renderEpList(allEpisodes, currentEpId);
      loadPlayer();
    }
  };

  // ── Helpers ────────────────────────────────────────────────
  const getEpId = (ep) => ep.episodeId || ep.id || ep.number || ep.episodeNo;
  const getEpNum = (ep) => ep.number || ep.episodeNo || ep.episode || getEpId(ep);
  const getServerValue = () => document.getElementById("server-select")?.value || CONFIG.DEFAULT_SERVER;
  const getTypeValue = () => document.querySelector(".type-btn--active")?.dataset.type || CONFIG.DEFAULT_TYPE;
  const reloadStream = () => { if (currentEpId) loadPlayer(); };

  const updateEpLabel = () => {
    const ep = allEpisodes.find((e) => String(getEpId(e)) === String(currentEpId));
    const label = document.getElementById("ep-label");
    if (label && ep) label.textContent = `EP ${getEpNum(ep)}${ep.title ? " — " + ep.title : ""}`;
  };

  // ── Sidebar info ───────────────────────────────────────────
  const loadSidebarInfo = async (id) => {
    try {
      const raw = await API.getAnimeInfo(id);
      const info = raw.anime?.info || raw.info || raw.anime || raw;
      const title  = info.name || info.title || "";
      const poster = info.poster || info.image || "";
      const type   = info.stats?.type || info.type || "";
      document.getElementById("sidebar-info").innerHTML = `
        <a class="sidebar-anime-card" href="#anime?id=${encodeURIComponent(id)}"
           onclick="event.preventDefault();Router.navigate('anime?id=${encodeURIComponent(id)}')"
           style="display:flex; gap:15px; text-decoration:none; color:inherit; align-items:center;">
          <img src="${poster}" alt="${title}" onerror="this.src='assets/placeholder.svg'" style="width:60px; height:85px; object-fit:cover; border-radius:6px;">
          <div>
            <p class="sidebar-anime-title" style="margin:0; font-weight:bold; font-size:1.1rem; line-height:1.2;">${title}</p>
            <p class="sidebar-anime-type" style="margin:5px 0 0; opacity:0.7; font-size:0.9rem;">${type}</p>
          </div>
        </a>`;
      UI.setTitle(title);
    } catch { /* silent */ }
  };

  // ── Episode list ───────────────────────────────────────────
  const loadEpisodeList = async (id) => {
    try {
      const raw = await API.getEpisodes(id);
      allEpisodes = raw.episodes || (Array.isArray(raw) ? raw : []);
    } catch { allEpisodes = []; }
  };

  const renderEpList = (episodes, activeId) => {
    const list = document.getElementById("ep-list");
    if (!list) return;
    list.innerHTML = episodes.map((ep) => {
      const epId  = getEpId(ep);
      const epNum = getEpNum(ep);
      const title = ep.title || ep.name || "";
      const active = String(epId) === String(activeId);
      return `
        <div class="ep-item ${active ? "ep-item--active" : ""}"
             onclick="WatchPage._selectById('${epId}')"
             title="${title}"
             style="cursor:pointer; display:flex; gap:10px; border-radius:6px; margin-bottom:5px; transition:background 0.2s;">
          <span class="ep-item__num" style="min-width:30px; font-weight:bold;">${epNum}</span>
          <span class="ep-item__title" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${title || "Episode " + epNum}</span>
        </div>`;
    }).join("");

    // 📱 Mobile Optimization: Use smooth scrolling and center the active item
    const el = list.querySelector(".ep-item--active");
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100); // Slight delay ensures DOM is fully painted before scrolling
    }
  };

  const selectEp = (ep) => {
    currentEpId  = getEpId(ep);
    currentEpNum = getEpNum(ep);
    updateEpLabel();
    renderEpList(allEpisodes, currentEpId);
    window.history.replaceState(null, "", `#watch?id=${encodeURIComponent(currentAnimeId)}&ep=${currentEpNum}`);
    
    // 📱 Mobile Optimization: Scroll back to top of player on episode change
    if (window.innerWidth <= 900) {
      document.getElementById("player-wrap").scrollIntoView({ behavior: "smooth" });
    }
    
    loadPlayer();
  };

  // ── Anikoto episode cache (avoid re-fetching on every episode switch) ────
  let anikotoEpisodesCache = null;
  let anikotoCachedId = null;

  // ── Player ─────────────────────────────────────────────────
  const loadPlayer = async () => {
    const wrap = document.getElementById("player-wrap");
    if (!wrap || !currentEpNum) return;
    wrap.innerHTML = `<div class="player-loader" style="display:flex; height:100%; justify-content:center; align-items:center;"><div class="spinner">Loading...</div></div>`;

    const category = getTypeValue();

    try {
      // Fetch episode list from Anikoto to get the correct episode_embed_id
      // required by MegaPlay /stream/s-2/ endpoint (per MegaPlay docs)
      if (anikotoCachedId !== currentAnimeId) {
        const res = await fetch(`https://anikotoapi.site/series/${encodeURIComponent(currentAnimeId)}`);
        if (!res.ok) throw new Error(`Anikoto API returned ${res.status}`);
        const data = await res.json();
        anikotoEpisodesCache = data.episodes || data.data?.episodes || [];
        anikotoCachedId = currentAnimeId;
      }

      const ep = anikotoEpisodesCache.find(e =>
        String(e.number ?? e.episode_number ?? e.episodeNo) === String(currentEpNum)
      );

      const embedId = ep?.episode_embed_id;
      if (!embedId) throw new Error(`No embed ID found for episode ${currentEpNum}`);

      const embedUrl = `https://megaplay.buzz/stream/s-2/${embedId}/${category}`;
      initPlayer(wrap, embedUrl, []);
    } catch (e) {
      wrap.innerHTML = `<div class="player-err" style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%; text-align:center; padding:20px;">
        <p style="margin:0 0 10px;">Stream unavailable.</p>
        <small style="opacity:0.7;">${e.message}</small>
      </div>`;
    }
  };

  const initPlayer = (wrap, embedUrl, tracks) => {
    if (hls) { hls.destroy(); hls = null; }
    const isDirectMedia = /\.(m3u8|mp4|webm)(\?|$)/i.test(embedUrl);

    if (isDirectMedia && window.Hls?.isSupported()) {
      wrap.innerHTML = `<video id="anime-video" class="video-player" controls playsinline style="width:100%; height:100%; background:#000;"></video>`;
      const video = document.getElementById("anime-video");
      if (/\.m3u8/i.test(embedUrl)) {
        hls = new Hls({ maxBufferLength: 30 });
        hls.loadSource(embedUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      } else {
        video.src = embedUrl;
        video.play().catch(() => {});
      }
      tracks.forEach((t) => {
        if (!t.file && !t.src) return;
        const track = document.createElement("track");
        track.kind    = t.kind    || "subtitles";
        track.label   = t.label   || "Sub";
        track.src     = t.file    || t.src;
        track.srclang = t.lang    || "en";
        if (t.default) track.default = true;
        video.appendChild(track);
      });
    } else {
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
    }
  };
  
  const _selectById = (id) => {
    const ep = allEpisodes.find((e) => String(getEpId(e)) === String(id));
    if (ep) selectEp(ep);
  };

  return { render, _selectById };
})();

window.WatchPage = WatchPage;
