// ============================================================
// WATCH PAGE — redesigned with Episodes / Similar / Description
// Drop-in replacement for your existing watch.js
// ============================================================
const WatchPage = (() => {
  let currentAnimeId  = null;
  let currentEpNum    = null;
  let allEpisodes     = [];
  let currentProvider = 'reanime';   // 'reanime' | 'megaplay'
  let currentLang     = 'sub';       // 'sub' | 'dub'
  let animeInfo       = {};          // cached info for description panel

  // ── Inject CSS once ────────────────────────────────────────
  const injectStyles = () => {
    if (document.getElementById('watch-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'watch-page-styles';
    style.textContent = `
/* ── Watch page layout ──────────────────────────────────── */
.watch-page {
  max-width:1480px; margin:0 auto;
  padding:calc(var(--nav-h) + 18px) 24px 64px;
  animation:fadeInUp 0.4s ease both;
}
.player-area { width:100%; }

/* Player */
.player-wrap {
  position:relative; width:100%; aspect-ratio:16/9;
  background:#000; border-radius:var(--radius-lg); overflow:hidden;
  border:1px solid var(--border-2);
  box-shadow:0 0 0 1px var(--border), var(--shadow-lg);
}
.player-wrap iframe, .video-player {
  width:100%; height:100%; border:none; display:block;
}
.player-loader {
  position:absolute; inset:0; display:flex;
  align-items:center; justify-content:center; background:var(--bg-2);
}
.player-err {
  position:absolute; inset:0; display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:10px;
  color:var(--text-2); text-align:center; padding:24px;
}
.player-err p { font-size:14px; font-weight:600; }
.player-err small { font-size:12px; color:var(--text-3); }

/* Infobar */
.player-infobar {
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 6px 8px; gap:12px;
}
.player-infobar__title {
  font-family:var(--font-display); font-size:20px; letter-spacing:1px;
  line-height:1;
  background:linear-gradient(90deg,var(--text),rgba(168,85,247,0.8));
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
}
.player-infobar__ep {
  font-size:12px; font-weight:600; color:var(--text-3);
  letter-spacing:1px; text-transform:uppercase;
  background:var(--surface-2); border:1px solid var(--border-2);
  padding:4px 10px; border-radius:20px; white-space:nowrap;
}

/* Toolbar */
.player-toolbar {
  display:flex; align-items:center; justify-content:space-between;
  gap:12px; padding:6px 6px 14px; flex-wrap:wrap;
}
.player-toolbar__left,
.player-toolbar__right { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }

.tool-btn {
  width:36px; height:36px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  background:var(--surface-2); border:1px solid var(--border-2);
  color:var(--text-2); transition:all var(--transition); flex-shrink:0;
}
.tool-btn:hover {
  background:var(--accent); border-color:var(--accent);
  color:#fff; box-shadow:0 0 14px var(--accent-glow);
}
.tool-btn svg { width:16px; height:16px; stroke:currentColor; fill:none; stroke-width:2.5; }

.ep-label {
  font-family:var(--font-display); font-size:17px; letter-spacing:1.5px;
  color:var(--text); min-width:56px; text-align:center;
}
.toolbar-label {
  font-size:11px; font-weight:600; color:var(--text-3);
  text-transform:uppercase; letter-spacing:0.8px;
}
.type-toggle {
  display:flex; background:var(--surface-2);
  border:1px solid var(--border-2); border-radius:8px; overflow:hidden;
}
.type-btn {
  padding:6px 14px; font-size:12px; font-weight:600;
  color:var(--text-3); letter-spacing:0.5px; text-transform:uppercase;
  transition:all var(--transition);
}
.type-btn--active {
  background:linear-gradient(135deg,var(--accent-dark),var(--accent));
  color:#fff; box-shadow:0 0 14px var(--accent-glow);
}
.type-btn:not(.type-btn--active):hover { color:var(--text); background:var(--surface-3); }

/* ── Section tabs ───────────────────────────────────────── */
.section-tabs {
  display:flex; gap:0; border-bottom:1px solid var(--border-2);
  position:sticky; top:var(--nav-h); z-index:10;
  background:var(--bg); padding-top:4px;
}
.section-tab {
  position:relative; display:flex; align-items:center; gap:8px;
  padding:14px 24px 12px; font-size:13px; font-weight:600;
  letter-spacing:0.6px; text-transform:uppercase;
  color:var(--text-3); cursor:pointer; transition:color var(--transition);
  background:none; border:none; font-family:var(--font-body);
  white-space:nowrap;
}
.section-tab::after {
  content:''; position:absolute; bottom:-1px; left:0; right:0; height:2px;
  background:linear-gradient(90deg,var(--accent),var(--gold));
  border-radius:2px 2px 0 0;
  transform:scaleX(0); transition:transform 0.25s cubic-bezier(0.4,0,0.2,1);
}
.section-tab:hover { color:var(--text-2); }
.section-tab.active { color:var(--accent); }
.section-tab.active::after { transform:scaleX(1); }
.section-tab svg { width:15px; height:15px; stroke:currentColor; fill:none; stroke-width:2; opacity:0.7; }
.section-tab.active svg { opacity:1; }
.tab-count {
  background:var(--surface-3); border:1px solid var(--border-2);
  color:var(--text-2); font-size:10px; font-weight:700;
  padding:1px 6px; border-radius:10px; transition:all var(--transition);
}
.section-tab.active .tab-count {
  background:var(--accent-dim); border-color:rgba(168,85,247,0.35); color:var(--accent);
}

/* ── Section panels ─────────────────────────────────────── */
.section-panel { display:none; animation:slideIn 0.28s ease both; }
.section-panel.active { display:block; }
@keyframes slideIn { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }

/* ── Episodes panel ─────────────────────────────────────── */
.eps-panel { padding:20px 0; }
.eps-controls {
  display:flex; align-items:center; justify-content:space-between;
  gap:12px; margin-bottom:16px; flex-wrap:wrap;
}
.eps-search-wrap {
  position:relative; display:flex; align-items:center;
  background:var(--surface); border:1px solid var(--border-2);
  border-radius:var(--radius); overflow:hidden; width:220px;
  transition:border-color var(--transition),box-shadow var(--transition);
}
.eps-search-wrap:focus-within { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-dim); }
.eps-search-wrap svg {
  position:absolute; left:12px; width:14px; height:14px;
  stroke:var(--text-3); fill:none; stroke-width:2; pointer-events:none;
}
.ep-search-input {
  width:100%; background:none; border:none; outline:none;
  padding:9px 12px 9px 36px; color:var(--text); font-size:13px;
  font-family:var(--font-body);
}
.ep-search-input::placeholder { color:var(--text-3); }
.eps-range-select {
  background:var(--surface); border:1px solid var(--border-2);
  color:var(--text-2); font-size:12px; font-weight:600;
  padding:8px 30px 8px 12px; border-radius:var(--radius); outline:none; cursor:pointer;
  appearance:none; -webkit-appearance:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234e4870' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat:no-repeat; background-position:right 10px center;
  transition:border-color var(--transition); font-family:var(--font-body);
}
.eps-range-select:focus { border-color:var(--accent); }
.ep-grid {
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(76px,1fr));
  gap:8px;
}
.ep-chip {
  position:relative; display:flex; flex-direction:column;
  align-items:center; justify-content:center; padding:10px 6px 9px;
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius); cursor:pointer;
  transition:all var(--transition); overflow:hidden; min-height:58px;
}
.ep-chip::before {
  content:''; position:absolute; inset:0;
  background:linear-gradient(135deg,var(--accent-dim),transparent);
  opacity:0; transition:opacity var(--transition);
}
.ep-chip:hover { border-color:var(--border-2); transform:translateY(-2px); }
.ep-chip:hover::before { opacity:1; }
.ep-chip.active {
  border-color:var(--accent);
  background:linear-gradient(135deg,rgba(124,58,237,0.25),rgba(168,85,247,0.12));
  box-shadow:0 0 0 1px rgba(168,85,247,0.3), var(--shadow-purple);
}
.ep-chip.active::before { opacity:0; }
.ep-chip__num {
  font-family:var(--font-display); font-size:22px; line-height:1;
  color:var(--text-3); transition:color var(--transition);
}
.ep-chip:hover .ep-chip__num { color:var(--text); }
.ep-chip.active .ep-chip__num { color:var(--accent); }
.ep-chip__label {
  font-size:9px; font-weight:600; letter-spacing:0.5px; color:var(--text-3);
  text-transform:uppercase; margin-top:3px; transition:color var(--transition);
  max-width:64px; overflow:hidden; text-overflow:ellipsis;
  white-space:nowrap; text-align:center; line-height:1.2;
}
.ep-chip.active .ep-chip__label { color:var(--text-2); }
.ep-chip .watched-pip {
  position:absolute; top:5px; right:5px;
  width:6px; height:6px; border-radius:50%;
  background:var(--accent); box-shadow:0 0 5px var(--accent-glow);
}
.ep-chip--skel {
  background:linear-gradient(90deg,var(--surface) 0%,var(--surface-2) 40%,var(--surface-3) 60%,var(--surface) 100%);
  background-size:800px 100%; animation:shimmer 1.8s infinite linear;
  border:none; pointer-events:none;
}

/* ── Similar panel ──────────────────────────────────────── */
.similar-panel { padding:20px 0; }
.similar-grid {
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(130px,1fr));
  gap:14px;
}
.sim-card {
  display:flex; flex-direction:column; border-radius:var(--radius-lg);
  overflow:hidden; background:var(--surface); border:1px solid var(--border);
  cursor:pointer; position:relative;
  transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.3s ease,border-color 0.25s ease;
}
.sim-card:hover {
  transform:translateY(-6px) scale(1.02);
  box-shadow:0 16px 40px rgba(0,0,0,0.7),0 0 0 1px var(--border-2);
  border-color:var(--border-2);
}
.sim-card__poster-wrap {
  position:relative; aspect-ratio:2/3; overflow:hidden; background:var(--surface-2);
}
.sim-card__poster {
  width:100%; height:100%; object-fit:cover;
  transition:transform 0.5s cubic-bezier(0.4,0,0.2,1);
}
.sim-card:hover .sim-card__poster { transform:scale(1.08); }
.sim-card__overlay {
  position:absolute; inset:0;
  background:linear-gradient(to top,rgba(7,6,15,0.85) 0%,rgba(7,6,15,0.2) 50%,transparent 100%);
  display:flex; align-items:center; justify-content:center;
  opacity:0; transition:opacity 0.3s ease;
}
.sim-card:hover .sim-card__overlay { opacity:1; }
.sim-card__play {
  width:48px; height:48px;
  background:linear-gradient(135deg,var(--accent-dark),var(--accent));
  border-radius:50%; display:flex; align-items:center; justify-content:center;
  box-shadow:0 0 28px var(--accent-glow);
  transform:scale(0.75); transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
}
.sim-card:hover .sim-card__play { transform:scale(1); animation:pulseGlow 2s infinite; }
.sim-card__play svg { width:18px; height:18px; fill:#fff; margin-left:3px; }
.sim-card__badges {
  position:absolute; bottom:6px; left:6px; display:flex; gap:4px; flex-wrap:wrap;
}
.sim-card__info { padding:10px 10px 12px; }
.sim-card__title {
  font-size:12px; font-weight:500; line-height:1.45; color:var(--text);
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
  overflow:hidden; transition:color var(--transition);
}
.sim-card:hover .sim-card__title { color:var(--accent); }
.sim-card__meta { font-size:10px; color:var(--text-3); margin-top:4px; }

/* ── Description panel ──────────────────────────────────── */
.desc-panel { padding:24px 0; }
.desc-layout {
  display:grid; grid-template-columns:200px 1fr;
  gap:36px; align-items:flex-start;
}
.desc-poster {
  width:100%; border-radius:var(--radius-lg);
  box-shadow:0 16px 48px rgba(0,0,0,0.8),0 0 0 1px var(--border-2);
  transition:transform var(--transition),box-shadow var(--transition);
}
.desc-poster:hover {
  transform:scale(1.02);
  box-shadow:0 20px 60px rgba(0,0,0,0.9),0 0 0 1px var(--accent);
}
.desc-poster-actions { display:flex; flex-direction:column; gap:8px; margin-top:12px; }
.btn-sm {
  display:inline-flex; align-items:center; justify-content:center; gap:7px;
  padding:9px 14px; border-radius:var(--radius); font-size:12px; font-weight:600;
  transition:all var(--transition); width:100%; font-family:var(--font-body); border:none; cursor:pointer;
}
.btn-sm svg { width:14px; height:14px; stroke:currentColor; fill:none; stroke-width:2; flex-shrink:0; }
.btn-primary-sm {
  background:linear-gradient(135deg,var(--accent-dark),var(--accent));
  color:#fff; box-shadow:0 4px 16px var(--accent-glow);
}
.btn-primary-sm:hover { transform:translateY(-2px); box-shadow:0 8px 24px var(--accent-glow); }
.btn-ghost-sm {
  background:rgba(255,255,255,0.05); color:var(--text-2); border:1px solid var(--border-2);
}
.btn-ghost-sm:hover { background:rgba(255,255,255,0.10); color:var(--text); transform:translateY(-1px); }
.desc-content { display:flex; flex-direction:column; gap:20px; }
.desc-title-block { display:flex; flex-direction:column; gap:6px; }
.desc-main-title {
  font-family:var(--font-display); font-size:clamp(22px,3vw,36px);
  letter-spacing:1px; line-height:1.05;
  background:linear-gradient(135deg,#fff 0%,#ddd6fe 100%);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
}
.desc-alt-title { font-size:13px; color:var(--text-3); font-style:italic; }
.desc-badges { display:flex; gap:8px; flex-wrap:wrap; margin-top:4px; }
.desc-stats {
  display:flex; gap:0; flex-wrap:wrap;
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius-lg); overflow:hidden;
}
.stat-item {
  flex:1; min-width:80px; display:flex; flex-direction:column; align-items:center;
  padding:14px 12px; position:relative; transition:background var(--transition);
}
.stat-item:not(:last-child)::after {
  content:''; position:absolute; right:0; top:20%; bottom:20%;
  width:1px; background:var(--border-2);
}
.stat-item:hover { background:var(--surface-2); }
.stat-item__label {
  font-size:10px; font-weight:700; letter-spacing:0.8px;
  text-transform:uppercase; color:var(--text-3); margin-bottom:4px;
}
.stat-item__value {
  font-family:var(--font-display); font-size:20px; letter-spacing:0.5px;
  color:var(--text); line-height:1;
}
.stat-item__value--gold  { color:var(--gold); }
.stat-item__value--accent { color:var(--accent); }
.desc-section-label {
  font-family:var(--font-display); font-size:14px; letter-spacing:2px;
  color:var(--text-3); text-transform:uppercase; margin-bottom:10px;
  display:flex; align-items:center; gap:10px;
}
.desc-section-label::after {
  content:''; flex:1; height:1px; background:var(--border-2); border-radius:1px;
}
.desc-overview {
  font-size:14px; color:var(--text-2); line-height:1.85;
  position:relative; overflow:hidden; max-height:96px;
  transition:max-height 0.4s ease;
}
.desc-overview.expanded { max-height:1000px; }
.desc-overview::after {
  content:''; position:absolute; bottom:0; left:0; right:0; height:40px;
  background:linear-gradient(to top,var(--bg),transparent);
  pointer-events:none; transition:opacity 0.3s;
}
.desc-overview.expanded::after { opacity:0; }
.desc-read-more {
  margin-top:8px; font-size:12px; font-weight:600; color:var(--accent);
  letter-spacing:0.5px; display:flex; align-items:center; gap:4px;
  transition:color var(--transition); background:none; border:none;
  padding:0; cursor:pointer; font-family:var(--font-body);
}
.desc-read-more svg {
  width:13px; height:13px; stroke:currentColor; fill:none; stroke-width:2.5;
  transition:transform 0.25s ease;
}
.desc-read-more.expanded svg { transform:rotate(180deg); }
.desc-read-more:hover { color:var(--gold); }
.desc-info-grid {
  display:grid; grid-template-columns:1fr 1fr; gap:0;
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius-lg); overflow:hidden;
}
.info-row {
  display:flex; flex-direction:column; padding:12px 16px;
  border-bottom:1px solid var(--border); transition:background var(--transition);
}
.info-row:nth-child(odd)  { border-right:1px solid var(--border); }
.info-row:nth-last-child(-n+2) { border-bottom:none; }
.info-row:hover { background:var(--surface-2); }
.info-row__key {
  font-size:10px; font-weight:700; letter-spacing:0.8px;
  text-transform:uppercase; color:var(--text-3); margin-bottom:3px;
}
.info-row__val { font-size:13px; color:var(--text); font-weight:500; }
.desc-genres { display:flex; flex-wrap:wrap; gap:8px; }

/* ── Responsive ─────────────────────────────────────────── */
@media(max-width:900px){
  .desc-layout { grid-template-columns:1fr; }
  .desc-poster-wrap { display:none; }
  .desc-info-grid { grid-template-columns:1fr; }
  .info-row:nth-child(odd) { border-right:none; }
  .info-row:nth-last-child(-n+2) { border-bottom:1px solid var(--border); }
  .info-row:last-child { border-bottom:none; }
}
@media(max-width:600px){
  .watch-page { padding-left:14px; padding-right:14px; }
  .section-tab { padding:12px 14px 10px; font-size:11px; }
  .similar-grid { grid-template-columns:repeat(auto-fill,minmax(110px,1fr)); }
  .ep-grid { grid-template-columns:repeat(auto-fill,minmax(62px,1fr)); }
  .stat-item { min-width:60px; padding:10px 6px; }
}`;
    document.head.appendChild(style);
  };

  // ── Main render ────────────────────────────────────────────
  const render = async ({ id, ep }) => {
    if (!id) { UI.error('No anime specified.'); return; }
    currentAnimeId  = id;
    currentProvider = 'reanime';
    currentLang     = 'sub';
    allEpisodes     = [];
    animeInfo       = {};

    injectStyles();
    UI.setTitle('Loading…');

    UI.render(`
      <div class="watch-page" id="watch-page">

        <!-- ── Player area ── -->
        <div class="player-area">

          <div class="player-wrap" id="player-wrap">
            <div class="player-loader"><div class="spinner"></div></div>
          </div>

          <div class="player-infobar" id="player-infobar">
            <div class="player-infobar__title" id="infobar-title">Loading…</div>
            <span class="player-infobar__ep" id="infobar-ep"></span>
          </div>

          <div class="player-toolbar" id="player-toolbar">
            <div class="player-toolbar__left">
              <button class="tool-btn" id="prev-ep-btn" title="Previous episode">
                <svg viewBox="0 0 24 24"><polyline points="15,18 9,12 15,6"/></svg>
              </button>
              <span class="ep-label" id="ep-label">Loading…</span>
              <button class="tool-btn" id="next-ep-btn" title="Next episode">
                <svg viewBox="0 0 24 24"><polyline points="9,18 15,12 9,6"/></svg>
              </button>
            </div>
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

        </div><!-- /player-area -->

        <!-- ── Three sections ── -->
        <div class="watch-sections">

          <!-- Tab
