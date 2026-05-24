// ============================================================
// WATCH / PLAYER PAGE — AniList ID + episode number
// ============================================================
const WatchPage = (() => {
  let currentAnimeId  = null;
  let currentEpNum    = null;
  let allEpisodes     = [];
  let currentProvider = 'reanime';  // 'reanime' | 'megaplay'
  let currentLang     = 'sub';      // 'sub' | 'dub'

  // ── Main render ────────────────────────────────────────────
  const render = async ({ id, ep }) => {
    if (!id) { UI.error('No anime specified.'); return; }
    currentAnimeId  = id;
    currentProvider = 'reanime';
    currentLang     = 'sub';

    UI.setTitle('Loading…');
    UI.render(`
      <div class="watch-page" id="watch-page">

        <!-- LEFT: player column -->
        <div class="player-area">

          <!-- Video -->
          <div class="player-wrap" id="player-wrap">
            <div class="player-loader"><div class="spinner"></div></div>
          </div>

          <!-- Info strip under player -->
          <div class="player-infobar" id="player-infobar">
            <div class="player-infobar__title" id="infobar-title">Loading…</div>
            <span class="player-infobar__ep" id="infobar-ep"></span>
          </div>

          <!-- Toolbar -->
          <div class="player-toolbar" id="player-toolbar">

            <!-- Left: prev / ep label / next -->
            <div class="player-toolbar__left">
              <button class="tool-btn" id="prev-ep-btn" title="Previous episode">
                <svg viewBox="0 0 24 24"><polyline points="15,18 9,12 15,6"/></svg>
              </button>
              <span class="ep-label" id="ep-label">Loading…</span>
              <button class="tool-btn" id="next-ep-btn" title="Next episode">
                <svg viewBox="0 0 24 24"><polyline points="9,18 15,12 9,6"/></svg>
              </button>
            </div>

            <!-- Right: provider + sub/dub -->
            <div class="player-toolbar__right">
              <span class="toolbar-label">Source</span>
              <div class="type-toggle">
                <button class="type-btn type-btn--active" id="btn-provider-reanime"
                        onclick="WatchPage._setProvider('reanime')">Default</button>
                <button class="type-btn" id="btn-provider-megaplay"
                        onclick="WatchPage._setProvider('megaplay')">MegaPlay</button>
              </div>
              <div class="type-toggle" id="lang-toggle" style="display:none;">
                <button class="type-btn type-btn--active" id="btn-lang-sub"
                        onclick="WatchPage._setLang('sub')">SUB</button>
                <button class="type-btn" id="btn-lang-dub"
                        onclick="WatchPage._setLang('dub')">DUB</button>
              </div>
            </div>

          </div>
        </div>

        <!-- RIGHT: sidebar -->
        <div class="watch-sidebar">

          <!-- Anime card -->
          <div class="sidebar-anime-info" id="sidebar-info">
            <div class="skeleton-box" style="height:90px;border-radius:var(--radius);"></div>
          </div>

          <!-- Episode list -->
          <div class="sidebar-eps">
            <div class="sidebar-eps__header">
              <span>Episodes</span>
              <input class="ep-search ep-search--sm" id="sidebar-ep-search"
                     type="text" placeholder="Search…" autocomplete="off">
            </div>
            <div class="ep-list" id="ep-list">
              ${Array(12).fill('<div class="ep-item ep-item--skel skeleton-box"></div>').join('')}
            </div>
          </div>

        </div>
      </div>
    `);

    // Wire prev / next
    document.getElementById('prev-ep-btn').addEventListener('click', () => {
      const idx = allEpisodes.findIndex(e => e.number === currentEpNum);
      if (idx > 0) selectEp(allEpisodes[idx - 1]);
    });
    document.getElementById('next-ep-btn').addEventListener('click', () => {
      const idx = allEpisodes.findIndex(e => e.number === currentEpNum);
      if (idx >= 0 && idx < allEpisodes.length - 1) selectEp(allEpisodes[idx + 1]);
    });

    // Episode search filter
    document.getElementById('sidebar-ep-search').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      renderEpList(allEpisodes.filter(ep =>
        String(ep.number).includes(q) || (ep.title || '').toLowerCase().includes(q)
      ), currentEpNum);
    });

    // Load sidebar info + episode list
    loadSidebarInfo(id);
    await loadEpisodeList(id);

    const targetNum = ep ? parseInt(ep) : 1;
    const targetEp  = allEpisodes.find(e => e.number === targetNum) || allEpisodes[0];
    if (targetEp) {
      currentEpNum = targetEp.number;
      updateEpLabel();
      renderEpList(allEpisodes, currentEpNum);
      updateProviderUI();
      loadPlayer();
    }
  };

  // ── Sidebar info ───────────────────────────────────────────
  const loadSidebarInfo = async (id) => {
    try {
      const raw  = await API.getAnimeInfo(id);
      const info = raw.anime?.info || raw.info || raw;
      const title  = info.name  || info.title || '';
      const poster = info.poster || info.image || '';
      const type   = info.stats?.type || info.type || '';
      const score  = info.stats?.rating || info.score || '';
      const eps    = info.stats?.episodes?.sub || info.episodes || '';

      document.getElementById('sidebar-info').innerHTML = `
        <a class="sidebar-anime-card"
           href="#anime?id=${encodeURIComponent(id)}"
           onclick="event.preventDefault();Router.navigate('anime?id=${encodeURIComponent(id)}')">
          <img src="${poster}" alt="${title}" onerror="this.src='assets/placeholder.svg'">
          <div class="sidebar-anime-meta">
            <p class="sidebar-anime-title">${title}</p>
            <div class="sidebar-anime-tags">
              ${type  ? `<span class="badge badge--type">${type}</span>`  : ''}
              ${score ? `<span class="badge badge--score">⭐ ${score}</span>` : ''}
              ${eps   ? `<span class="badge badge--eps">${eps} eps</span>` : ''}
            </div>
          </div>
        </a>`;

      UI.setTitle(title);

      // Also update infobar title
      const infobarTitle = document.getElementById('infobar-title');
      if (infobarTitle) infobarTitle.textContent = title;
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
    const list = document.getElementById('ep-list');
    if (!list) return;
    list.innerHTML = episodes.map(ep => {
      const active = ep.number === activeNum;
      return `
        <div class="ep-item ${active ? 'ep-item--active' : ''}"
             onclick="WatchPage._selectByNum(${ep.number})">
          <span class="ep-item__num">${ep.number}</span>
          <span class="ep-item__title">${ep.title || 'Episode ' + ep.number}</span>
        </div>`;
    }).join('');

    const el = list.querySelector('.ep-item--active');
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
  };

  // ── Episode selection ──────────────────────────────────────
  const selectEp = (ep) => {
    currentEpNum = ep.number;
    updateEpLabel();
    renderEpList(allEpisodes, currentEpNum);
    window.history.replaceState(null, '', `#watch?id=${encodeURIComponent(currentAnimeId)}&ep=${currentEpNum}`);
    if (window.innerWidth <= 1100) {
      document.getElementById('player-wrap')?.scrollIntoView({ behavior: 'smooth' });
    }
    loadPlayer();
  };

  // ── Label helpers ──────────────────────────────────────────
  const updateEpLabel = () => {
    const label = document.getElementById('ep-label');
    if (label) label.textContent = `EP ${currentEpNum}`;
    const infoEp = document.getElementById('infobar-ep');
    if (infoEp) infoEp.textContent = `Episode ${currentEpNum}`;
  };

  // ── Provider / lang UI ─────────────────────────────────────
  const updateProviderUI = () => {
    const btnR   = document.getElementById('btn-provider-reanime');
    const btnM   = document.getElementById('btn-provider-megaplay');
    const langTg = document.getElementById('lang-toggle');
    if (!btnR) return;
    if (currentProvider === 'megaplay') {
      btnR.classList.remove('type-btn--active');
      btnM.classList.add('type-btn--active');
      if (langTg) langTg.style.display = 'flex';
    } else {
      btnM.classList.remove('type-btn--active');
      btnR.classList.add('type-btn--active');
      if (langTg) langTg.style.display = 'none';
    }
    updateLangUI();
  };

  const updateLangUI = () => {
    const btnS = document.getElementById('btn-lang-sub');
    const btnD = document.getElementById('btn-lang-dub');
    if (!btnS) return;
    if (currentLang === 'dub') {
      btnS.classList.remove('type-btn--active');
      btnD.classList.add('type-btn--active');
    } else {
      btnD.classList.remove('type-btn--active');
      btnS.classList.add('type-btn--active');
    }
  };

  // ── Player loader ──────────────────────────────────────────
  const loadPlayer = async () => {
    const wrap = document.getElementById('player-wrap');
    if (!wrap || !currentEpNum) return;
    wrap.innerHTML = `<div class="player-loader"><div class="spinner"></div></div>`;

    try {
      let embedUrl  = null;
      const refPolicy = currentProvider === 'megaplay' ? 'origin' : 'no-referrer';

      if (currentProvider === 'megaplay') {
        embedUrl = `https://megaplay.buzz/stream/ani/${parseInt(currentAnimeId)}/${currentEpNum}/${currentLang}`;

      } else {
        // reanime — JSON or ZIP
        const apiUrl = `https://reanime.to/api/flix/${encodeURIComponent(currentAnimeId)}/${currentEpNum}`;
        const res    = await fetch(API.proxy(apiUrl));
        if (!res.ok) throw new Error(`API error ${res.status}`);

        const ct = res.headers.get('content-type') || '';

        if (ct.includes('application/zip') || ct.includes('application/octet-stream') || ct.includes('application/x-zip')) {
          const buffer = await res.arrayBuffer();
          const magic  = new Uint8Array(buffer, 0, 4);
          if (magic[0] !== 0x50 || magic[1] !== 0x4B) throw new Error('Unexpected binary format from API');

          const zip       = await JSZip.loadAsync(buffer);
          const extracted = {};
          await Promise.all(Object.entries(zip.files).map(async ([name, file]) => {
            if (file.dir) return;
            const text = await file.async('string');
            try { extracted[name] = JSON.parse(text); } catch { extracted[name] = text; }
          }));

          const streamData = extracted['stream.json'] || extracted['data.json'] || extracted['info.json'] || null;
          embedUrl = streamData?.dataLink || streamData?.link || streamData?.url || streamData?.embed || streamData?.src || null;

          if (!embedUrl) {
            for (const val of Object.values(extracted)) {
              if (typeof val === 'object' && val !== null) {
                embedUrl = val.dataLink || val.link || val.url || val.embed || val.src || null;
                if (embedUrl) break;
              }
              if (typeof val === 'string' && /^https?:\/\//.test(val.trim())) { embedUrl = val.trim(); break; }
            }
          }
        } else {
          const data = await res.json();
          embedUrl = data.dataLink || data.link || data.url || data.embed;
        }

        if (!embedUrl) throw new Error('No stream URL found in API response');
      }

      wrap.innerHTML = `
        <iframe
          id="anime-iframe"
          class="video-player"
          src="${embedUrl}"
          allowfullscreen
          allow="autoplay; fullscreen; picture-in-picture"
          referrerpolicy="${refPolicy}"
          frameborder="0"
          style="width:100%;height:100%;border:none;display:block;">
        </iframe>`;

    } catch (err) {
      wrap.innerHTML = `
        <div class="player-err">
          <span style="font-size:2rem;">⚠️</span>
          <p>Failed to load player</p>
          <small>${err.message}</small>
        </div>`;
    }
  };

  // ── Public API ─────────────────────────────────────────────
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
