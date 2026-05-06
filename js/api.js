// ============================================================
// API SERVICE — Shirayuki Scrapper API V2
// ============================================================
const API = (() => {
  const base = () => `${window.CONFIG.API_BASE}/api/v2/animekai`;

  const get = async (endpoint, retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(`${base()}${endpoint}`);
        if (res.status >= 500 && attempt < retries) {
          await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
          continue;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.success === false) throw new Error(json.message || json.error || "API error");
        // Schedule returns { success, schedule, requestedDate } — no data wrapper
        if (json.schedule) return json;
        return json.data ?? json.results ?? json;
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
      }
    }
  };

  return {
    getHome:    ()     => get("/home"),
    getAnimeInfo: (id) => get(`/anime/${encodeURIComponent(id)}`),
    getEpisodes:  (id) => get(`/anime/${encodeURIComponent(id)}/episodes`),
    getNextEpisode: (id) => get(`/anime/${encodeURIComponent(id)}/next-episode-schedule`),

    search: (keyword, page = 1) =>
      get(`/search?q=${encodeURIComponent(keyword)}&page=${page}`),

    searchSuggest: (keyword) =>
      get(`/search/suggestion?q=${encodeURIComponent(keyword)}`),

    searchAdvanced: (params) => {
      const clean = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
      );
      return get(`/search/advanced?${new URLSearchParams(clean)}`);
    },

    getCategory: (name, page = 1) =>
      get(`/category/${encodeURIComponent(name)}?page=${page}`),

    getGenre: (name, page = 1) =>
      get(`/genre/${encodeURIComponent(name)}?page=${page}`),

    getProducer: (name, page = 1) =>
      get(`/producer/${encodeURIComponent(name)}?page=${page}`),

    getAZList: (sort = "all", page = 1) =>
      get(`/azlist/${encodeURIComponent(sort)}?page=${page}`),

    getSchedule: (date, tzOffset = 0) =>
      get(`/schedule?date=${date}&tzOffset=${tzOffset}`),

    // epNum = episode NUMBER (1, 2, 3…) — NOT the episodeId string
    getServers: (animeId, epNum) =>
      get(`/episode/servers?animeEpisodeId=${encodeURIComponent(animeId)}&ep=${epNum}`),

    getSources: (animeId, epNum, server = "server-1", category = "sub") =>
      get(`/episode/sources?animeEpisodeId=${encodeURIComponent(animeId)}&ep=${epNum}&server=${encodeURIComponent(server)}&category=${category}`),

    proxy: (url) => `${base()}/proxy?url=${encodeURIComponent(url)}`,
  };
})();

window.API = API;
