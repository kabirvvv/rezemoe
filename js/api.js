// ============================================================
// API SERVICE — AniList GraphQL API
// ============================================================
const API = (() => {
  const ANILIST_URL = "https://graphql.anilist.co";

  // Core GraphQL fetcher with retry
  const query = async (graphql, variables = {}, retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(ANILIST_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ query: graphql, variables }),
        });
        if (res.status >= 500 && attempt < retries) {
          await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
          continue;
        }
        if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
        const json = await res.json();
        if (json.errors) throw new Error(json.errors[0]?.message || "AniList error");
        return json.data;
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
      }
    }
  };

  // Normalize an AniList Media object into the consistent shape used by all UI pages
  const norm = (m) => ({
    id:          m.id,
    name:        m.title?.english || m.title?.romaji || m.title?.native || "",
    title:       m.title?.english || m.title?.romaji || m.title?.native || "",
    poster:      m.coverImage?.extraLarge || m.coverImage?.large || "",
    image:       m.coverImage?.extraLarge || m.coverImage?.large || "",
    banner:      m.bannerImage || m.coverImage?.extraLarge || "",
    description: m.description ? m.description.replace(/<[^>]+>/g, "") : "",
    type:        m.format  || "",
    status:      m.status  || "",
    score:       m.averageScore ? (m.averageScore / 10).toFixed(1) : "",
    episodes:    m.episodes || 0,
    season:      m.season,
    seasonYear:  m.seasonYear,
    genres:      m.genres  || [],
    rank:        m.trending || 0,
    nextAiringEpisode: m.nextAiringEpisode || null,
    stats: {
      type:     m.format || "",
      rating:   m.averageScore ? (m.averageScore / 10).toFixed(1) : "",
      episodes: {
        sub: m.episodes || (m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : null),
        dub: null,
      },
    },
  });

  // ── Home ────────────────────────────────────────────────────
  const getHome = async () => {
    const data = await query(`
      query {
        featured: Page(page: 1, perPage: 10) {
          media(type: ANIME, sort: TRENDING_DESC, isAdult: false, status_in: [RELEASING]) {
            id title { romaji english } coverImage { extraLarge large } bannerImage
            format status episodes averageScore trending description genres
            nextAiringEpisode { episode airingAt }
          }
        }
        popular: Page(page: 1, perPage: 12) {
          media(type: ANIME, sort: POPULARITY_DESC, isAdult: false, status: RELEASING) {
            id title { romaji english } coverImage { extraLarge large }
            format status episodes averageScore
          }
        }
        upcoming: Page(page: 1, perPage: 12) {
          media(type: ANIME, sort: POPULARITY_DESC, isAdult: false, status: NOT_YET_RELEASED) {
            id title { romaji english } coverImage { extraLarge large }
            format status episodes averageScore
          }
        }
        completed: Page(page: 1, perPage: 12) {
          media(type: ANIME, sort: SCORE_DESC, isAdult: false, status: FINISHED) {
            id title { romaji english } coverImage { extraLarge large }
            format status episodes averageScore
          }
        }
      }
    `);
    return {
      featuredAnimes:  data.featured.media.map(norm),
      topTrending:     { now: data.featured.media.map(norm) },
      latestUpdates:   { all: data.popular.media.map(norm) },
      quickLists: {
        newReleases: data.popular.media.map(norm),
        upcoming:    data.upcoming.media.map(norm),
        completed:   data.completed.media.map(norm),
      },
    };
  };

  // ── Anime info ──────────────────────────────────────────────
  const getAnimeInfo = async (id) => {
    const data = await query(`
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id title { romaji english native } coverImage { extraLarge large } bannerImage
          description format status episodes averageScore genres trending synonyms
          season seasonYear
          startDate { year month day }
          endDate   { year month day }
          studios(isMain: true) { nodes { name } }
          nextAiringEpisode { episode airingAt }
          relations {
            edges {
              relationType
              node { id title { romaji english } coverImage { large } format status }
            }
          }
          recommendations(perPage: 8) {
            nodes {
              mediaRecommendation {
                id title { romaji english } coverImage { large } format status
              }
            }
          }
        }
      }
    `, { id: parseInt(id) });

    const m    = data.Media;
    const info = norm(m);

    const fmt = (d) =>
      d?.year
        ? `${d.year}-${String(d.month ?? 1).padStart(2, "0")}-${String(d.day ?? 1).padStart(2, "0")}`
        : "";

    const moreInfo = {
      genres:    m.genres,
      type:      m.format  || "",
      status:    m.status  || "",
      score:     m.averageScore ? (m.averageScore / 10).toFixed(1) : "",
      studios:   m.studios.nodes.map(s => s.name).join(", "),
      aired:     fmt(m.startDate),
      premiered: m.season ? `${m.season} ${m.seasonYear}` : "",
      synonyms:  m.synonyms?.join(", ") || "",
      japanese:  m.title?.native || "",
    };

    const recommended = (m.recommendations?.nodes || [])
      .map(n => n.mediaRecommendation)
      .filter(Boolean)
      .map(norm);

    const seasons = (m.relations?.edges || [])
      .filter(e => ["SEQUEL", "PREQUEL", "SIDE_STORY", "ALTERNATIVE"].includes(e.relationType))
      .map(e => norm(e.node));

    return { anime: { info, moreInfo }, seasons, relatedAnimes: [], recommendedAnimes: recommended };
  };

  // ── Episodes — generated from AniList episode count ─────────
  // reanime only needs anilistId + episode number; no slugs or embed IDs required
  const getEpisodes = async (id) => {
    const data = await query(`
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id episodes status nextAiringEpisode { episode }
        }
      }
    `, { id: parseInt(id) });

    const m     = data.Media;
    const total = m.episodes || (m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : 1);
    const episodes = Array.from({ length: total }, (_, i) => ({
      id:        i + 1,
      number:    i + 1,
      episodeNo: i + 1,
      title:     "",
    }));
    return { episodes };
  };

  // ── Search ──────────────────────────────────────────────────
  const search = async (keyword, page = 1) => {
    const data = await query(`
      query ($search: String, $page: Int) {
        Page(page: $page, perPage: 20) {
          pageInfo { total currentPage hasNextPage lastPage }
          media(type: ANIME, search: $search, isAdult: false, sort: SEARCH_MATCH) {
            id title { romaji english } coverImage { extraLarge large }
            format status episodes averageScore
          }
        }
      }
    `, { search: keyword, page: parseInt(page) });
    return {
      animes:      data.Page.media.map(norm),
      results:     data.Page.media.map(norm),
      currentPage: data.Page.pageInfo.currentPage,
      hasNextPage: data.Page.pageInfo.hasNextPage,
      totalPages:  data.Page.pageInfo.lastPage,
    };
  };

  // Suggest — title search only, no slug/embed-id lookups
  const searchSuggest = async (keyword) => {
    const data = await query(`
      query ($search: String) {
        Page(page: 1, perPage: 8) {
          media(type: ANIME, search: $search, isAdult: false, sort: SEARCH_MATCH) {
            id title { romaji english } coverImage { large } format
          }
        }
      }
    `, { search: keyword });
    return { suggestions: data.Page.media.map(norm) };
  };

  // ── Advanced search (Browse / Filter page) ─────────────────
  const SORT_MAP = {
    score:          "SCORE_DESC",
    recently_added: "UPDATED_AT_DESC",
    title_az:       "TITLE_ROMAJI",
    "":             "POPULARITY_DESC",
  };
  const STATUS_MAP = {
    "finished-airing":   "FINISHED",
    "currently-airing":  "RELEASING",
    "not-yet-aired":     "NOT_YET_RELEASED",
    FINISHED:            "FINISHED",
    RELEASING:           "RELEASING",
    NOT_YET_RELEASED:    "NOT_YET_RELEASED",
    "": null,
  };
  const FORMAT_MAP = {
    tv: "TV", movie: "MOVIE", ova: "OVA", ona: "ONA",
    special: "SPECIAL", music: "MUSIC", "": null,
  };

  const searchAdvanced = async (params) => {
    const { q, genres, type, status, sort = "", season, page = 1 } = params;

    const genreList = genres
      ? genres.split(",").map(g => g.trim().replace(/\b\w/g, l => l.toUpperCase())).filter(Boolean)
      : null;

    const data = await query(`
      query ($page: Int, $search: String, $genre_in: [String], $format: MediaFormat,
             $status: MediaStatus, $season: MediaSeason, $sort: [MediaSort]) {
        Page(page: $page, perPage: 24) {
          pageInfo { total currentPage hasNextPage lastPage }
          media(type: ANIME, isAdult: false, search: $search, genre_in: $genre_in,
                format: $format, status: $status, season: $season, sort: $sort) {
            id title { romaji english } coverImage { extraLarge large }
            format status episodes averageScore genres
          }
        }
      }
    `, {
      page:     parseInt(page),
      search:   q || null,
      genre_in: genreList?.length ? genreList : null,
      format:   FORMAT_MAP[type]   ?? null,
      status:   STATUS_MAP[status] ?? null,
      season:   season?.toUpperCase() || null,
      sort:     [SORT_MAP[sort] ?? "POPULARITY_DESC"],
    });
    return {
      animes:      data.Page.media.map(norm),
      currentPage: data.Page.pageInfo.currentPage,
      hasNextPage: data.Page.pageInfo.hasNextPage,
      totalPages:  data.Page.pageInfo.lastPage,
    };
  };

  // ── Category ────────────────────────────────────────────────
  const CATEGORY_MAP = {
    "most-popular":      { sort: ["POPULARITY_DESC"] },
    "recently-updated":  { sort: ["UPDATED_AT_DESC"], status: "RELEASING" },
    tv:                  { sort: ["POPULARITY_DESC"], format: "TV" },
    movie:               { sort: ["POPULARITY_DESC"], format: "MOVIE" },
    upcoming:            { sort: ["POPULARITY_DESC"], status: "NOT_YET_RELEASED" },
    completed:           { sort: ["SCORE_DESC"],      status: "FINISHED" },
    ova:                 { sort: ["POPULARITY_DESC"], format: "OVA" },
    ona:                 { sort: ["POPULARITY_DESC"], format: "ONA" },
    special:             { sort: ["POPULARITY_DESC"], format: "SPECIAL" },
  };

  const getCategory = async (name, page = 1) => {
    const p = CATEGORY_MAP[name] || { sort: ["POPULARITY_DESC"] };
    const data = await query(`
      query ($page: Int, $sort: [MediaSort], $status: MediaStatus, $format: MediaFormat) {
        Page(page: $page, perPage: 24) {
          pageInfo { total currentPage hasNextPage lastPage }
          media(type: ANIME, isAdult: false, sort: $sort, status: $status, format: $format) {
            id title { romaji english } coverImage { extraLarge large }
            format status episodes averageScore
          }
        }
      }
    `, { page: parseInt(page), sort: p.sort, status: p.status || null, format: p.format || null });
    return {
      animes:      data.Page.media.map(norm),
      currentPage: data.Page.pageInfo.currentPage,
      hasNextPage: data.Page.pageInfo.hasNextPage,
      totalPages:  data.Page.pageInfo.lastPage,
    };
  };

  // ── Genre ───────────────────────────────────────────────────
  const getGenre = async (name, page = 1) => {
    const genre = name.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    const data = await query(`
      query ($page: Int, $genre: String) {
        Page(page: $page, perPage: 24) {
          pageInfo { total currentPage hasNextPage lastPage }
          media(type: ANIME, isAdult: false, sort: POPULARITY_DESC, genre: $genre) {
            id title { romaji english } coverImage { extraLarge large }
            format status episodes averageScore
          }
        }
      }
    `, { page: parseInt(page), genre });
    return {
      animes:      data.Page.media.map(norm),
      currentPage: data.Page.pageInfo.currentPage,
      hasNextPage: data.Page.pageInfo.hasNextPage,
      totalPages:  data.Page.pageInfo.lastPage,
    };
  };

  // ── Schedule ────────────────────────────────────────────────
  const getSchedule = async (date) => {
    const dayStart = Math.floor(new Date(date + "T00:00:00").getTime() / 1000);
    const dayEnd   = dayStart + 86399;
    const data = await query(`
      query ($from: Int, $to: Int) {
        Page(page: 1, perPage: 50) {
          airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: TIME) {
            airingAt episode
            media {
              id title { romaji english } coverImage { large } format isAdult
            }
          }
        }
      }
    `, { from: dayStart, to: dayEnd });

    const schedule = data.Page.airingSchedules
      .filter(s => !s.media.isAdult)
      .map(s => ({
        id:      s.media.id,
        name:    s.media.title.english || s.media.title.romaji,
        title:   s.media.title.english || s.media.title.romaji,
        episode: s.episode,
        airingAt: s.airingAt,
        time:    new Date(s.airingAt * 1000).toLocaleTimeString("en-US", {
          hour: "2-digit", minute: "2-digit",
        }),
        poster:  s.media.coverImage?.large || "",
      }));
    return { schedule };
  };

  // ── Stubs — streaming handled entirely by reanime ───────────
  const getNextEpisode = () => Promise.resolve({});
  const getServers     = () => Promise.resolve([]);
  const getSources     = () => Promise.resolve({});
  const getProducer    = (name, page) => getCategory("most-popular", page);
  const getAZList      = (sort, page)  => getCategory("most-popular", page);
  const PROXY_BASE     = "https://lingering-thunder-953e.kabirv338.workers.dev";
  const proxy          = (url) => `${PROXY_BASE}?url=${encodeURIComponent(url)}`;

  return {
    getHome, getAnimeInfo, getEpisodes, getNextEpisode,
    search, searchSuggest, searchAdvanced,
    getCategory, getGenre, getProducer, getAZList,
    getSchedule, getServers, getSources, proxy,
  };
})();

window.API = API;
