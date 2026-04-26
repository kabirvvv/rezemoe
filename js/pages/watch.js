// ============================================================
// WATCH / PLAYER PAGE
// ============================================================
const WatchPage = (() => {
  let currentEpId = null;
  let currentAnimeId = null;
  let allEpisodes = [];
  let hls = null;

  const render = async ({ id, ep }) => {
    if (!id) { UI.error("No anime specified."); return; }
    currentAnimeId = id;
    UI.setTitle("Loading…");

    UI.render(`
      <div class="watch-page" id="watch-page">
        <div class="player-area">
          <div class="player-wrap" id="player-wrap">
            <div class="player-loader"><div class="spinner"></div></div>
          </div>
          <div class="player-toolbar" id="player-toolbar">
            <div class="player-toolbar__left">
              <button class="tool-btn" id="prev-ep-btn" title="Previous Episode">
                <svg viewBox="0 0 24 24"><polyline points="15,18 9,12 15,6"/></svg>
              </button>
              <span class="ep-label" id="ep-label">Loading…</span>
              <button class="tool-btn" id="next-ep-btn" title="Next Episode">
                <svg viewBox="0 0 24 24"><polyline points="9,18 15,12 9,6"/></svg>
              </button>
            </div>
            <div class="player-toolbar__right">
              <div class="type-toggle" id="type-toggle">
                <button class="type-btn type-btn--active" data-type="sub">SUB</button>
                <button class="type-btn" data-type="dub">DUB</button>
                <button class="type-btn" data-type="raw">RAW</button>
              </div>
              <select class="server-select" id="server-select"><option>Loading servers…</option></select>
            </div>
          </div>
        </div>
        <div class="watch-sidebar" id="watch-sidebar">
          <div class="sidebar-anime-info" id="sidebar-info">
            <div class="skeleton-box" style="height:120px;border-radius:8px"></div>
          </div>
          <div class="sidebar-eps" id="sidebar-eps">
            <div class="sidebar-eps__header">
              <span>Episodes</span>
              <input class="ep-search ep-search--sm" id="sidebar-ep-search" type="text" placeholder="Search…">
            </div>
            <div class="ep-list" id="ep-list">
              ${Array(12).fill('<div class="ep-item ep-item--skel skeleton-box"></div>').join("")}
            </div>
          </div>
        </div>
      </div>
    `);

    // Load anime info for sidebar
    loadSidebarInfo(id);
    // Load episodes
    await loadEpisodeList(id, ep);
    // Load player
    const targetEp = ep || allEpisodes[0]?.data_id;
    if (targetEp) {
      loadPlayer(id, targetEp, CONFIG.DEFAULT_SERVER, CONFIG.DEFAULT_TYPE);
    }
  };

  const loadSidebarInfo = async (id) => {
    try {
      const data = await API.getAnimeInfo(id);
      const a = data.data;
      document.getElementById("sidebar-info").innerHTML = `
        <a class="sidebar-anime-card" href="#anime?id=${encodeURIComponent(id)}" onclick="event.preventDefault();Router.navigate('anime?id=${encodeURIComponent(id)}')">
          <img src="${a.poster}" alt="${a.title}" onerror="this.src='assets/placeholder.svg'">
          <div>
            <p class="sidebar-anime-title">${a.title}</p>
            <p class="sidebar-anime-type">${a.showType || ""}</p>
          </div>
        </a>`;
      UI.setTitle(a.title);
    } catch { /* silent */ }
  };

  const loadEpisodeList = async (id, activeEp) => {
    try {
      const data = await API.getEpisodes(id);
      allEpisodes = data.episodes || [];
      renderEpList(allEpisodes, activeEp ? +activeEp : null);

      document.getElementById("sidebar-ep-search").addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase();
        const filtered = allEpisodes.filter(
          (ep) =>
            String(ep.episode_no).includes(q) ||
            (ep.title || "").toLowerCase().includes(q)
        );
        renderEpList(filtered, currentEpId ? +currentEpId : null);
      });

      // prev/next buttons
      document.getElementById("prev-ep-btn").addEventListener("click", () => {
        const idx = allEpisodes.findIndex((e) => e.data_id == currentEpId);
        if (idx > 0) selectEp(allEpisodes[idx - 1]);
      });
      document.getElementById("next-ep-btn").addEventListener("click", () => {
        const idx = allEpisodes.findIndex((e) => e.data_id == currentEpId);
        if (idx >= 0 && idx < allEpisodes.length - 1) selectEp(allEpisodes[idx + 1]);
      });
    } catch { /* silent */ }
  };

  const renderEpList = (episodes, activeId) => {
    const list = document.getElementById("ep-list");
    if (!list) return;
    list.innerHTML = episodes.map((ep) => `
      <div class="ep-item ${ep.data_id == activeId ? "ep-item--active" : ""}" 
           onclick="WatchPage._selectEpById(${ep.data_id})"
           title="${ep.title || ep.jname || ""}">
        <span class="ep-item__num">${ep.episode_no}</span>
        <span class="ep-item__title">${ep.title || ep.jname || `Episode ${ep.episode_no}`}</span>
      </div>`).join("");

    // scroll active into view
    const active = list.querySelector(".ep-item--active");
    if (active) active.scrollIntoView({ block: "nearest" });
  };

  const selectEp = (ep) => {
    currentEpId = ep.data_id;
    const currentType = document.querySelector(".type-btn--active")?.dataset.type || CONFIG.DEFAULT_TYPE;
    const currentServer = document.getElementById("server-select")?.value || CONFIG.DEFAULT_SERVER;
    loadPlayer(currentAnimeId, ep.data_id, currentServer, currentType);
    renderEpList(allEpisodes, ep.data_id);
    window.history.replaceState(null, "", `#watch?id=${encodeURIComponent(currentAnimeId)}&ep=${ep.data_id}`);
  };

  const loadPlayer = async (animeId, epId, server, type) => {
    currentEpId = epId;
    const wrap = document.getElementById("player-wrap");
    const label = document.getElementById("ep-label");
    if (!wrap) return;

    wrap.innerHTML = `<div class="player-loader"><div class="spinner"></div></div>`;
    const ep = allEpisodes.find((e) => e.data_id == epId);
    if (label && ep) label.textContent = `EP ${ep.episode_no}${ep.title ? " — " + ep.title : ""}`;

    try {
      // Get servers first
      const serversData = await API.getServers(`${animeId}?ep=${epId}`);
      renderServerSelect(serversData, server, type);

      // Get stream
      let streamData;
      try {
        streamData = await API.getStream(`${animeId}?ep=${epId}`, epId, server, type);
      } catch {
        streamData = await API.getStreamFallback(`${animeId}?ep=${epId}`, epId, server, type);
      }

      const link = streamData?.streamingLink?.[0]?.link;
      if (!link?.file) {
        wrap.innerHTML = `<div class="player-err">No stream available for this server/type. Try another.</div>`;
        return;
      }

      const tracks = streamData?.streamingLink?.[0]?.tracks || [];
      initPlayer(wrap, link, tracks);
    } catch (e) {
      wrap.innerHTML = `<div class="player-err">
        <p>Stream unavailable.</p>
        <small>${e.message}</small>
      </div>`;
    }
  };

  const renderServerSelect = (servers, activeServer, activeType) => {
    const sel = document.getElementById("server-select");
    if (!sel) return;
    const filtered = (servers || []).filter((s) => {
      const currentType = document.querySelector(".type-btn--active")?.dataset.type || activeType;
      return s.type === currentType;
    });
    sel.innerHTML = filtered.length
      ? filtered.map((s) => `<option value="${s.server_name || s.serverName}" ${(s.server_name || s.serverName) === activeServer ? "selected" : ""}>${(s.server_name || s.serverName || "").toUpperCase()}</option>`).join("")
      : `<option value="${activeServer}">${activeServer.toUpperCase()}</option>`;

    sel.onchange = () => {
      const type = document.querySelector(".type-btn--active")?.dataset.type || CONFIG.DEFAULT_TYPE;
      loadPlayer(currentAnimeId, currentEpId, sel.value, type);
    };

    // type toggle
    document.querySelectorAll(".type-btn").forEach((btn) => {
      btn.classList.toggle("type-btn--active", btn.dataset.type === activeType);
      btn.onclick = () => {
        document.querySelectorAll(".type-btn").forEach((b) => b.classList.remove("type-btn--active"));
        btn.classList.add("type-btn--active");
        loadPlayer(currentAnimeId, currentEpId, CONFIG.DEFAULT_SERVER, btn.dataset.type);
      };
    });
  };

  const initPlayer = (wrap, link, tracks) => {
    // Destroy previous HLS instance
    if (hls) { hls.destroy(); hls = null; }

    wrap.innerHTML = `<video id="anime-video" class="video-player" controls playsinline></video>`;
    const video = document.getElementById("anime-video");

    const src = link.file;
    const isHLS = src.includes(".m3u8") || link.type === "hls";

    if (isHLS && window.Hls?.isSupported()) {
      hls = new Hls({ maxBufferLength: 30 });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", () => video.play().catch(() => {}));
    } else {
      video.src = src;
      video.play().catch(() => {});
    }

    // Subtitle tracks
    tracks.forEach((t) => {
      const track = document.createElement("track");
      track.kind = t.kind || "subtitles";
      track.label = t.label || "Sub";
      track.src = t.file;
      if (t.default) track.default = true;
      video.appendChild(track);
    });
  };

  // Public helper for inline onclick
  const _selectEpById = (id) => {
    const ep = allEpisodes.find((e) => e.data_id == id);
    if (ep) selectEp(ep);
  };

  return { render, _selectEpById };
})();

window.WatchPage = WatchPage;
