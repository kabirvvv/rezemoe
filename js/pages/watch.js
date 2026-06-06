// ============================================================
// WATCH / PLAYER PAGE — reanime.to (AniList ID + episode number)
// ============================================================
const WatchPage = (() => {
  let currentAnimeId = null;
  let currentEpNum   = null;
  let allEpisodes    = [];
  let currentProvider = 'megaplay';   // 'reanime' | 'megaplay'
  let currentLang     = 'sub';       // 'sub' | 'dub'  (MegaPlay only)

  // ── Mobile Responsive Styles ───────────────────────────────
 const mobileStyles = `
    <style>
      .watch-page { display: flex; flex-direction: row; gap: 20px; width: 100%; max-width: 1400px; margin: 0 auto; padding: 15px; box-sizing: border-box; color: #fff; }
      .player-area { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 15px; }
      .player-wrap { width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 8px; overflow: hidden; position: relative; }
      
      /* ── Added Toolbar & Button Base Styles ── */
      .player-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 15px; padding: 10px 0; }
      .player-toolbar__left, .player-toolbar__right { display: flex; align-items: center; gap: 10px; }
      
      .tool-btn, .type-btn {
        background: #242428;
        color: #eee;
        border: 1px solid #3a3a40;
        padding: 6px 14px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        font-size: 13px;
        transition: all 0.2s ease;
      }
      
      .tool-btn:hover, .type-btn:hover {
        background: #323238;
        color: #fff;
        border-color: #52525a;
      }
      
      /* Active state style (e.g., accent color for selected provider/lang) */
      .type-btn--active {
        background: #ff5c5c; /* Change this to your site's accent color */
        color: #fff;
        border-color: transparent;
        font-weight: 600;
      }
      
      .watch-sidebar { width: 320px; flex-shrink: 0; display: flex; flex-direction: column; gap: 15px; }
      .ep-list { max-height: 500px; overflow-y: auto; scroll-behavior: smooth; }

      @media (max-width: 900px) {
        .watch-page { flex-direction: column; padding: 0; gap: 15px; }
        .watch-sidebar { width: 100%; padding: 0 15px; box-sizing: border-box; }
        .player-wrap { border-radius: 0; }
        .player-toolbar { display: flex; flex-direction: column; gap: 12px; padding: 10px 15px; }
        .player-toolbar__left, .player-toolbar__right { display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 10px; }
        .tool-btn, .type-btn { min-height: 44px; font-size: 16px; padding: 8px 16px; }
        .tool-btn { min-width: 44px; display: flex; align-items: center; justify-content: center; }
        .ep-list { max-height: 400px; }
        .ep-item { padding: 14px 15px; min-height: 48px; display: flex; align-items: center; }
      }
    </style>
  `;

  // ── Main render ────────────────────────────────────────────
  const render = async ({ id, ep }) => {
    if (!id) { UI.error("No anime specified."); return; }
    currentAnimeId  = id;
    currentProvider = 'megaplay';
    currentLang     = 'sub';

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

            <div class="player-toolbar__right" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="font-size:11px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; opacity:0.5;">Source</span>
              <button class="type-btn type-btn--active" id="btn-provider-reanime" onclick="WatchPage._setProvider('reanime')">Default</button>
              <button class="type-btn" id="btn-provider-megaplay" onclick="WatchPage._setProvider('megaplay')">MegaPlay</button>
              <span id="lang-controls" style="display:none; align-items:center; gap:6px; margin-left:4px;">
                <span style="font-size:11px; font-weight:700; opacity:0.3;">|</span>
                <button class="type-btn type-btn--active" id="btn-lang-sub" onclick="WatchPage._setLang('sub')">SUB</button>
                <button class="type-btn" id="btn-lang-dub" onclick="WatchPage._setLang('dub')">DUB</button>
              </span>
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

    updateProviderUI();

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
    }  catch { 
  document.getElementById("sidebar-info").innerHTML = `
    <div style="padding: 10px; color: #ff6b6b; text-align: center;">
      Failed to load info.
    </div>`;
}
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

  // ── Provider UI helpers ────────────────────────────────────
  const updateProviderUI = () => {
    const btnReanime  = document.getElementById("btn-provider-reanime");
    const btnMegaplay = document.getElementById("btn-provider-megaplay");
    const langCtrl    = document.getElementById("lang-controls");
    if (!btnReanime) return;

    if (currentProvider === 'megaplay') {
      btnReanime.classList.remove("type-btn--active");
      btnMegaplay.classList.add("type-btn--active");
      if (langCtrl) langCtrl.style.display = "flex";
    } else {
      btnMegaplay.classList.remove("type-btn--active");
      btnReanime.classList.add("type-btn--active");
      if (langCtrl) langCtrl.style.display = "none";
    }
    updateLangUI();
  };

  const updateLangUI = () => {
    const btnSub = document.getElementById("btn-lang-sub");
    const btnDub = document.getElementById("btn-lang-dub");
    if (!btnSub) return;
    if (currentLang === 'dub') {
      btnSub.classList.remove("type-btn--active");
      btnDub.classList.add("type-btn--active");
    } else {
      btnDub.classList.remove("type-btn--active");
      btnSub.classList.add("type-btn--active");
    }
  };

  // ── Player — provider-aware loader ────────────────────────
  const loadPlayer = async () => {
    const wrap = document.getElementById("player-wrap");
    if (!wrap || !currentEpNum) return;
    wrap.innerHTML = `<div class="player-loader" style="display:flex; height:100%; justify-content:center; align-items:center;"><div class="spinner">Loading...</div></div>`;

    try {
      let embedUrl = null;

      if (currentProvider === 'megaplay') {
        // ── MegaPlay: AniList id must be a plain integer — no encoding ──
        embedUrl = `https://megaplay.buzz/stream/ani/${parseInt(currentAnimeId)}/${currentEpNum}/${currentLang}`;
      } else {
        // ── Default: reanime API (JSON or ZIP) ──────────────────────
        const apiUrl = `https://reanime.to/api/flix/${encodeURIComponent(currentAnimeId)}/${currentEpNum}`;
        const res = await fetch(API.proxy(apiUrl));
        if (!res.ok) throw new Error(`API error ${res.status}`);

        const contentType = res.headers.get("content-type") || "";

        // ── ZIP path (new reanime behaviour) ──────────────────────────
        if (
          contentType.includes("application/zip") ||
          contentType.includes("application/octet-stream") ||
          contentType.includes("application/x-zip")
        ) {
          const buffer = await res.arrayBuffer();

          // Confirm ZIP magic bytes (PK\x03\x04) in case content-type is wrong
          const magic = new Uint8Array(buffer, 0, 4);
          if (magic[0] !== 0x50 || magic[1] !== 0x4B) throw new Error("Unexpected binary format from API");

          const zip = await JSZip.loadAsync(buffer);
          const extracted = {};

          await Promise.all(
            Object.entries(zip.files).map(async ([name, file]) => {
              if (file.dir) return;
              const text = await file.async("string");
              try { extracted[name] = JSON.parse(text); }
              catch { extracted[name] = text; }
            })
          );

          // Check common JSON file names first
          const streamData =
            extracted["stream.json"] ||
            extracted["data.json"]   ||
            extracted["info.json"]   ||
            null;

          embedUrl =
            streamData?.dataLink ||
            streamData?.link     ||
            streamData?.url      ||
            streamData?.embed    ||
            streamData?.src      ||
            null;

          // Fallback: scan all extracted files if named lookup failed
          if (!embedUrl) {
            for (const val of Object.values(extracted)) {
              if (typeof val === "object" && val !== null) {
                embedUrl = val.dataLink || val.link || val.url || val.embed || val.src || null;
                if (embedUrl) break;
              }
              // Plain-text file whose entire content is a URL
              if (typeof val === "string" && /^https?:\/\//.test(val.trim())) {
                embedUrl = val.trim();
                break;
              }
            }
          }

        // ── JSON path (legacy / fallback behaviour) ──────────────────
        } else {
          const data = await res.json();
          embedUrl = data.dataLink || data.link || data.url || data.embed;
        }

        if (!embedUrl) throw new Error("No stream URL found in API response");
      }

      // MegaPlay requires the Referer header to validate the embed domain.
      // reanime's proxied stream URLs need no-referrer for privacy/CORS.
      const refPolicy = currentProvider === 'megaplay' ? 'origin' : 'no-referrer';

      wrap.innerHTML = `
        <iframe
          id="anime-iframe"
          class="video-player"
          src="${embedUrl}"
          allowfullscreen
          allow="autoplay; fullscreen; picture-in-picture"
          referrerpolicy="${refPolicy}"
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

  const _setProvider = (provider) => {
    if (currentProvider === provider) return;
    currentProvider = provider;
    updateProviderUI();
    loadPlayer();
  };

  const _setLang = (lang) => {
    if (currentLang === lang) return;
    currentLang = lang;
    updateLangUI();
    loadPlayer();
  };

  return { render, _selectByNum, _setProvider, _setLang };
})();

window.WatchPage = WatchPage;
                                     
