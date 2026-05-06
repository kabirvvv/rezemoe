// ============================================================
// API SERVICE — Shirayuki Scrapper API V2
// Base: /api/v2/animekai/
// ============================================================
const API = (() => {
  const base = () => `${window.CONFIG.API_BASE}/api/v2/animekai`;

  const get = async (endpoint, retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(`${base()}${endpoint}`);
        // 500 from the external scraper API — worth retrying once
        if (res.status >= 500 && attempt < retries) {
          await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
          continue;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.success === false) throw new Error(json.message || "API error");
        return json.data ?? json.results ?? json;
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
      }
    }
  };

  return {
    // ── Home ──────────────────────────────────────────────────
    getHome: () => get("/home"),

    // ── Anime details ─────────────────────────────────────────
    getAnimeInfo: (id) => get(`/anime/${encodeURIComponent(id)}`),

    // ── Episodes ──────────────────────────────────────────────
    getEpisodes: (id) => get(`/anime/${encodeURIComponent(id)}/episodes`),

    // ── Next episode schedule ──────────────────────────────────
    getNextEpisode: (id) => get(`/anime/${encodeURIComponent(id)}/next-episode-schedule`),

    // ── Search ────────────────────────────────────────────────
    search: (keyword, page = 1) =>
      get(`/search?q=${encodeURIComponent(keyword)}&page=${page}`),

    searchSuggest: (keyword) =>
      get(`/search/suggestion?q=${encodeURIComponent(keyword)}`),

    searchAdvanced: (params) => {
      // Strip undefined, null, and empty-string values so they don't appear
      // as "season=undefined&language=undefined" in the request (→ 400 error)
      const clean = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
      );
      const qs = new URLSearchParams(clean).toString();
      return get(`/search/advanced?${qs}`);
    },

    // ── Category ──────────────────────────────────────────────
    // e.g. most-popular, top-airing, recently-updated, most-favorite, completed
    getCategory: (name, page = 1) =>
      get(`/category/${encodeURIComponent(name)}?page=${page}`),

    // ── Genre ─────────────────────────────────────────────────
    getGenre: (name, page = 1) =>
      get(`/genre/${encodeURIComponent(name)}?page=${page}`),

    // ── Producer / Studio ─────────────────────────────────────
    getProducer: (name, page = 1) =>
      get(`/producer/${encodeURIComponent(name)}?page=${page}`),

    // ── A-Z List ──────────────────────────────────────────────
    getAZList: (sort = "all", page = 1) =>
      get(`/azlist/${encodeURIComponent(sort)}?page=${page}`),

    // ── Schedule ──────────────────────────────────────────────
    getSchedule: (date, tzOffset = 0) =>
      get(`/schedule?date=${date}&tzOffset=${tzOffset}`),

    // ── Streaming ─────────────────────────────────────────────
    // animeEpisodeId format: "steinsgate-3?ep=213"
    getServers: (animeId, epId) =>
      get(`/episode/servers?animeEpisodeId=${encodeURIComponent(animeId)}?ep=${epId}`),

    // server: hd-1 | hd-2 | hd-3   category: sub | dub
    getSources: (animeId, epId, server = "hd-1", category = "sub") =>
      get(
        `/episode/sources?animeEpisodeId=${encodeURIComponent(animeId)}&ep=${epId}&server=${encodeURIComponent(server)}&category=${category}`
      ),

    // ── Proxy (bypass CORS on m3u8/media URLs) ────────────────
    proxy: (url) =>
      `${base()}/proxy?url=${encodeURIComponent(url)}`,
  };
})();

window.API = API;
