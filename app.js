/* CineNova · frontend sin dependencias. La configuración está en config.js. */
(() => {
  "use strict";

  const config = window.CINENOVA_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const esc = (value = "") => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const titleOf = (item) => item.title || item.name || "Sin título";
  const typeOf = (item) => item._type === "tv" || item.media_type === "tv" ? "tv" : "movie";
  const keyOf = (item) => `${typeOf(item)}:${item.id}`;
  const yearOf = (item) => (item.release_date || item.first_air_date || "").slice(0, 4);
  const validItem = (item) => item && Number.isSafeInteger(Number(item.id)) && Number(item.id) > 0 && !item.adult && item.media_type !== "person";
  const normalize = (item, type) => ({ ...item, id: Number(item.id), _type: type || typeOf(item) });
  const compact = (item) => Object.fromEntries(["id", "_type", "title", "name", "overview", "poster_path", "backdrop_path", "release_date", "first_air_date", "vote_average", "genre_ids", "popularity"].filter((key) => item[key] !== undefined).map((key) => [key, item[key]]));
  const imageUrl = (path, size = "w500") => typeof path === "string" && /^\/[a-zA-Z0-9/_.-]+$/.test(path) ? `${config.imageBase || "https://image.tmdb.org/t/p/"}${size}${path}` : "";
  const imageHTML = (path, size, alt = "", classes = "") => {
    const src = imageUrl(path, size);
    return src ? `<img src="${esc(src)}" alt="${esc(alt)}" class="${classes}" loading="lazy" decoding="async">` : "";
  };
  const formatTime = (minutes) => minutes ? `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)} h ` : ""}${minutes % 60} min` : "";
  const GENRES = [
    { name: "Acción", movie: 28, tv: 10759 }, { name: "Aventura", movie: 12, tv: 10759 },
    { name: "Animación", movie: 16, tv: 16 }, { name: "Comedia", movie: 35, tv: 35 },
    { name: "Crimen", movie: 80, tv: 80 }, { name: "Drama", movie: 18, tv: 18 },
    { name: "Documental", movie: 99, tv: 99 }, { name: "Ciencia ficción", movie: 878, tv: 10765 },
    { name: "Terror", movie: 27 }, { name: "Familia", movie: 10751, tv: 10751 },
    { name: "Misterio", movie: 9648, tv: 9648 }, { name: "Fantasía", movie: 14, tv: 10765 }
  ];
  const COLORS = [
    { name: "Verde", value: "#b7f568" }, { name: "Azul", value: "#a1b8e0" },
    { name: "Rosa", value: "#f0b2c4" }, { name: "Naranja", value: "#f1bd83" },
    { name: "Lavanda", value: "#c6b7ee" }, { name: "Turquesa", value: "#99d8ce" }
  ];
  const STORAGE_KEY = "cinenova_library_v2";
  const GUEST = "__global__";
  const newLibrary = () => ({ favorites: [], history: [], progress: {} });
  let storageFailed = false;
  function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function readLegacyLibrary(name) {
    const legacy = (base, fallback) => readJSON(`${base}__${name}`, name === GUEST ? readJSON(base, fallback) : fallback);
    const items = (value) => Array.isArray(value) ? value.filter(validItem).map((i) => compact(normalize(i))) : [];
    const favorites = items(legacy("cinenova_favs", []));
    const history = items(legacy("cinenova_continue_watching", [])).reverse();
    const oldProgress = legacy("cinenova_progress", {});
    const progress = {};
    // El esquema anterior usaba solo el ID. El nuevo distingue película y serie.
    [...favorites, ...history].forEach((item) => {
      const p = oldProgress?.[item.id];
      if (p && typeof p === "object") progress[keyOf(item)] = { ...p, pct: Math.max(0, Math.min(100, Number(p.pct) || 0)) };
    });
    if (oldProgress && typeof oldProgress === "object") Object.entries(oldProgress).forEach(([id, p]) => {
      if (!/^\d+$/.test(id) || !p || typeof p !== "object") return;
      const type = Number(p.season) > 0 || Number(p.episode) > 0 ? "tv" : "movie";
      progress[`${type}:${id}`] ||= { ...p, pct: Math.max(0, Math.min(100, Number(p.pct) || 0)) };
    });
    return { favorites, history, progress };
  }
  function loadStore() {
    const saved = readJSON(STORAGE_KEY, null);
    if (saved?.version === 2 && Array.isArray(saved.profiles) && saved.libraries && typeof saved.libraries === "object" && !Array.isArray(saved.libraries)) {
      saved.profiles = saved.profiles.filter((p) => p && typeof p.id === "string" && typeof p.name === "string");
      if (!saved.profiles.some((p) => p.id === saved.currentProfileId)) saved.currentProfileId = null;
      return saved;
    }
    const legacyProfiles = readJSON("cinenova_profiles", []);
    let oldActive = "";
    try { oldActive = localStorage.getItem("cinenova_current_profile") || ""; } catch { /* Almacenamiento restringido. */ }
    const profiles = (Array.isArray(legacyProfiles) ? legacyProfiles : []).filter((p) => p && typeof p.name === "string" && p.name.trim()).map((p, i) => ({ id: `migrated-${i}`, name: p.name.slice(0, 24), avatar: p.avatar || "", color: COLORS[i % COLORS.length].value }));
    return { version: 2, profiles, currentProfileId: profiles.find((p) => p.name === oldActive)?.id || null, libraries: Object.fromEntries([[GUEST, readLegacyLibrary(GUEST)], ...profiles.map((p) => [p.id, readLegacyLibrary(p.name)])]) };
  }
  let store = loadStore();
  const activeId = () => store.currentProfileId || GUEST;
  function library(id = activeId()) {
    let value = store.libraries[id];
    if (!value || typeof value !== "object" || Array.isArray(value)) value = store.libraries[id] = newLibrary();
    value.favorites = Array.isArray(value.favorites) ? value.favorites.filter(validItem) : [];
    value.history = Array.isArray(value.history) ? value.history.filter(validItem) : [];
    if (!value.progress || typeof value.progress !== "object") value.progress = {};
    return value;
  }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); return true; }
    catch {
      if (!storageFailed) showToast("El navegador no permite guardar cambios. Se conservarán durante esta sesión.", null, 9000);
      storageFailed = true;
      return false;
    }
  }
  const isFavorite = (item, id = activeId()) => library(id).favorites.some((f) => keyOf(f) === keyOf(item));
  let toastTimer, toastAction = null;
  function showToast(message, action = null, timeout = 5200) {
    clearTimeout(toastTimer);
    $("toast-message").textContent = storageFailed && !message.includes("durante esta sesión") ? `${message} Los cambios se conservan solo durante esta sesión.` : message;
    toastAction = action;
    $("toast-action").hidden = !action;
    $("toast").hidden = false;
    // En un dialog modal solo son interactivos sus descendientes.
    const topDialog = [...document.querySelectorAll("dialog[open]")].at(-1);
    (topDialog || document.body).append($("toast"));
    toastTimer = setTimeout(hideToast, timeout);
  }
  function hideToast() { $("toast").hidden = true; toastAction = null; clearTimeout(toastTimer); }
  function setFavorite(item, add, id = activeId()) {
    const list = library(id).favorites.filter((f) => keyOf(f) !== keyOf(item));
    if (add) list.unshift(compact(item));
    library(id).favorites = list;
    persist();
    refreshLibraryUI();
  }
  function toggleFavorite(item) {
    const id = activeId();
    const add = !isFavorite(item, id);
    const before = library(id).favorites.slice();
    setFavorite(item, add, id);
    showToast(add ? `“${titleOf(item)}” se agregó a tu lista.` : `“${titleOf(item)}” se quitó de tu lista.`, () => {
      library(id).favorites = before;
      persist(); refreshLibraryUI(); showToast("Cambio deshecho.");
    });
  }

  // Las solicitudes de una vista cerrada se cancelan para evitar resultados atrasados.
  const apiCache = new Map();
  async function api(endpoint, params = {}, signal) {
    if (!config.tmdbApiKey) throw new Error("catalog-unavailable");
    const url = new URL(`${config.apiBase || "https://api.themoviedb.org/3"}${endpoint}`);
    const query = { api_key: config.tmdbApiKey, language: config.language || "es-MX", ...params };
    Object.keys(query).sort().forEach((key) => { if (query[key] !== undefined && query[key] !== "") url.searchParams.set(key, query[key]); });
    const cacheKey = url.toString();
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.time < 300000) return cached.data;
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) throw new DOMException("Vista cerrada", "AbortError");
    signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, 14000);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("catalog-unavailable");
      const data = await response.json();
      apiCache.set(cacheKey, { data, time: Date.now() });
      if (apiCache.size > 100) apiCache.delete(apiCache.keys().next().value);
      return data;
    } finally { clearTimeout(timeout); signal?.removeEventListener("abort", abort); }
  }

  let state = { view: "home", genre: "", filter: "all", sort: "popular", query: "", page: 1 };
  let viewController = new AbortController(), viewToken = 0, gridItems = [], gridTotalPages = 1, gridLoading = false;
  let lastViewHash = "#inicio", searchReturnHash = "#inicio", searchTimer;
  const itemRegistry = new Map();
  const viewHashes = { home: "inicio", movie: "peliculas", tv: "series", list: "mi-lista", continue: "continuar", search: "buscar" };
  function routeHash(view, options = {}) {
    const params = new URLSearchParams();
    if (options.genre) params.set("genero", options.genre);
    if (options.query) params.set("q", options.query.slice(0, 100));
    if (options.filter && options.filter !== "all") params.set("tipo", options.filter);
    if (options.sort && options.sort !== "popular") params.set("orden", options.sort);
    return `#${viewHashes[view] || "inicio"}${params.size ? `?${params}` : ""}`;
  }
  function parseRoute(hash = location.hash) {
    const [path, query = ""] = hash.replace(/^#/, "").split("?");
    const detail = path.match(/^(movie|tv)-(\d+)$/);
    if (detail) return { detail: { id: Number(detail[2]), _type: detail[1] } };
    const params = new URLSearchParams(query);
    const view = Object.keys(viewHashes).find((key) => viewHashes[key] === path) || "home";
    const filter = ["movie", "tv"].includes(params.get("tipo")) ? params.get("tipo") : "all";
    const sorts = view === "list" || view === "continue" ? ["recent", "rating", "title"] : view === "search" ? ["popular", "rating"] : ["popular", "rating", "newest"];
    return { view, filter, sort: sorts.includes(params.get("orden")) ? params.get("orden") : sorts[0], query: (params.get("q") || "").slice(0, 100).trim(), genre: GENRES.some((g) => g.name === params.get("genero") && g[view === "tv" ? "tv" : "movie"]) ? params.get("genero") : "", page: 1 };
  }
  function navigate(view, options = {}, focus = true) {
    clearTimeout(searchTimer);
    const hash = routeHash(view, options);
    if (location.hash === hash) { if (focus) focusMain(); return; }
    history.pushState(null, "", hash);
    applyRoute();
    if (focus) focusMain();
  }
  function focusMain() { window.scrollTo({ top: 0, behavior: "instant" }); $("main-content").focus({ preventScroll: true }); }
  function setNavigation() {
    document.querySelectorAll("[data-view]").forEach((a) => {
      if (a.dataset.view === state.view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    $("hero").hidden = state.view !== "home";
    $("discover-bar").hidden = !["home", "movie", "tv"].includes(state.view);
    renderGenres();
    $("search").value = state.view === "search" ? state.query : "";
    $("search-clear").hidden = !$("search").value;
    document.title = `${state.view === "search" ? `Buscar ${state.query}` : { home: "Tu próxima historia", movie: "Películas", tv: "Series", list: "Mi lista", continue: "Continuar viendo" }[state.view]} · CineNova`;
  }
  function renderGenres() {
    const type = state.view === "tv" ? "tv" : "movie";
    const button = (name, selected) => `<button class="genre-chip" data-genre="${esc(name)}" aria-pressed="${selected}">${esc(name || "Todos")}</button>`;
    $("genre-chips").innerHTML = button("", !state.genre) + GENRES.filter((g) => g[type]).map((g) => button(g.name, state.genre === g.name)).join("");
    $("menu-genres").innerHTML = GENRES.filter((g) => g[type]).map((g) => button(g.name, state.genre === g.name)).join("");
  }
  function errorHTML(title, message, action = "retry-view", label = "Reintentar", glyph = "retry") {
    return `<div class="empty-state">${icon(glyph)}<h3>${esc(title)}</h3><p>${esc(message)}</p>${action ? `<button class="button secondary" data-action="${action}">${icon(action.startsWith("retry") ? "retry" : "arrow")}${esc(label)}</button>` : ""}</div>`;
  }
  function skeletons(count = 6) { return Array.from({ length: count }, () => '<div class="skeleton-card" aria-hidden="true"><div class="skeleton"></div></div>').join(""); }
  function mediaCard(raw, context = "catalog") {
    const item = normalize(raw);
    const key = keyOf(item);
    itemRegistry.set(key, item);
    const title = titleOf(item), favorite = isFavorite(item);
    const progress = library().progress[key];
    const pct = Math.max(0, Math.min(100, Number(progress?.pct) || 0));
    const rating = Number(item.vote_average) > 0 ? Number(item.vote_average).toFixed(1) : "";
    const history = context === "continue";
    const episode = history && item._type === "tv" && progress?.season !== undefined && progress?.episode ? `T${Number(progress.season)} · E${Number(progress.episode)}` : "";
    return `<article class="media-card" data-key="${esc(key)}">
      <a class="card-link" href="#${item._type}-${item.id}" data-detail="${esc(key)}" ${history ? 'data-play="true"' : ""} aria-label="${esc(`${history ? "Continuar" : "Ver ficha de"} ${title}`)}">
        <div class="poster">${imageHTML(item.poster_path, "w342")}
          <div class="poster-fallback">${icon(item._type === "tv" ? "tv" : "film")}<span>${esc(title)}</span></div>
          ${rating ? `<span class="rating-badge" aria-label="Valoración ${rating} de 10">${icon("star")}${rating}</span>` : ""}
          <span class="poster-play">${icon(history ? "play" : "info")}</span>
        </div>
        <span class="card-title" title="${esc(title)}">${esc(title)}</span>
        <span class="card-meta"><span>${esc(episode || yearOf(item) || "Fecha pendiente")}</span><span aria-hidden="true">·</span><span>${item._type === "tv" ? "Serie" : "Película"}</span></span>
        ${history && pct > 0 ? `<span class="watch-progress" role="progressbar" aria-label="Progreso de ${esc(title)}" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></span>` : ""}
      </a>
      <div class="card-actions"><button data-${history ? "remove-history" : "favorite"}="${esc(key)}" aria-label="${esc(history ? `Quitar ${title} de continuar viendo` : `${favorite ? "Quitar" : "Añadir"} ${title} ${favorite ? "de" : "a"} mi lista`)}" ${history ? "" : `aria-pressed="${favorite}"`}>${icon(history ? "close" : favorite ? "check" : "plus")}</button></div>
    </article>`;
  }
  function rowShell(id, title, subtitle, moreView, moreOptions = {}) {
    return `<section class="section" aria-labelledby="${id}-title" id="${id}"><div class="section-heading"><div><h2 id="${id}-title">${esc(title)}</h2><p class="section-description">${esc(subtitle)}</p></div><div class="section-tools">${moreView ? `<a class="text-button" href="${esc(routeHash(moreView, moreOptions))}" data-route>Ver todo${icon("arrow")}</a>` : ""}<div class="carousel-controls"><button class="icon-button prev" data-scroll="-1" data-target="${id}-row" aria-label="Desplazar ${esc(title)} hacia atrás">${icon("arrow")}</button><button class="icon-button" data-scroll="1" data-target="${id}-row" aria-label="Desplazar ${esc(title)} hacia adelante">${icon("arrow")}</button></div></div></div><div id="${id}-row" class="carousel" tabindex="0" role="group" aria-label="${esc(title)}" aria-busy="true">${skeletons()}</div></section>`;
  }
  const HOME_ROWS = [
    { id: "popular", title: "Populares ahora", subtitle: "Las historias que están dando de qué hablar.", endpoint: "/movie/popular", type: "movie" },
    { id: "premieres", title: "En cartelera", subtitle: "Descubre los últimos estrenos en cines.", endpoint: "/movie/now_playing", type: "movie", sort: "newest" },
    { id: "tv-trending", title: "Series en tendencia", subtitle: "Un episodio más siempre es un buen plan.", endpoint: "/trending/tv/week", type: "tv" },
    { id: "top-rated", title: "Historias que dejan huella", subtitle: "Las películas mejor valoradas por la comunidad.", endpoint: "/movie/top_rated", type: "movie", sort: "rating" }
  ];
  function renderLocalRows() {
    if (state.view !== "home" || !$("local-rows")) return;
    const { history, favorites } = library();
    $("local-rows").innerHTML = (history.length ? rowShell("continue-row", "Continúa tu historia", "Retoma los títulos que empezaste a ver.", "continue") : "") + (favorites.length ? rowShell("saved-row", "Tu lista, tu próximo plan", "Los títulos que guardaste para después.", "list") : "");
    if (history.length) { $("continue-row-row").innerHTML = history.slice(0, 12).map((item) => mediaCard(item, "continue")).join(""); $("continue-row-row").setAttribute("aria-busy", "false"); }
    if (favorites.length) { $("saved-row-row").innerHTML = favorites.slice(0, 12).map((item) => mediaCard(item)).join(""); $("saved-row-row").setAttribute("aria-busy", "false"); }
    updateCarouselControls();
  }
  let featured = [], featuredIndex = 0;
  function setImage(element, path, size = "w1280") {
    const url = imageUrl(path, size);
    element.hidden = !url;
    if (url) element.src = url; else element.removeAttribute("src");
  }
  function metaHTML(item) {
    const rating = Number(item.vote_average) > 0 ? `<span class="rating">${icon("star")}${Number(item.vote_average).toFixed(1)} <span class="sr-only">de 10 en TMDB</span></span>` : "";
    const duration = item._type === "tv" ? item.number_of_seasons ? `${item.number_of_seasons} ${item.number_of_seasons === 1 ? "temporada" : "temporadas"}` : "" : formatTime(item.runtime);
    return `<span class="meta-label">${item._type === "tv" ? "SERIE" : "PELÍCULA"}</span>${yearOf(item) ? `<span>${esc(yearOf(item))}</span>` : ""}${rating}${duration ? `<span>${esc(duration)}</span>` : ""}`;
  }
  function selectFeatured(index) {
    featuredIndex = index;
    const item = featured[index];
    if (!item) return;
    setImage($("hero-image"), item.backdrop_path);
    $("hero-title").textContent = titleOf(item);
    $("hero-meta").innerHTML = metaHTML(item);
    $("hero-description").textContent = item.overview || "Una nueva historia por descubrir. Conoce la ficha y guárdala en tu lista.";
    $("hero-play").disabled = false; $("hero-info").disabled = false;
    $("hero-pagination").innerHTML = featured.map((f, i) => `<button class="hero-dot" data-featured="${i}" aria-pressed="${i === index}" aria-label="Mostrar ${esc(titleOf(f))}"></button>`).join("");
    $("hero").setAttribute("aria-busy", "false"); $("hero-retry").hidden = true;
  }
  async function renderHome(token, signal) {
    $("content").innerHTML = '<div id="local-rows"></div>' + HOME_ROWS.map((r) => rowShell(r.id, r.title, r.subtitle, r.type, { sort: r.sort })).join("");
    renderLocalRows();
    $("hero").setAttribute("aria-busy", "true");
    const jobs = HOME_ROWS.map(async (row) => {
      try {
        const data = await api(row.endpoint, {}, signal);
        if (token !== viewToken) return;
        const items = (data.results || []).filter(validItem).map((item) => normalize(item, row.type));
        $(`${row.id}-row`).innerHTML = items.length ? items.map((item) => mediaCard(item)).join("") : errorHTML("Sin títulos por ahora", "Vuelve a intentarlo en unos minutos.", "retry-view");
      } catch {
        if (token !== viewToken || signal.aborted) return;
        $(`${row.id}-row`).innerHTML = errorHTML("No pudimos cargar esta selección", "Comprueba tu conexión e inténtalo de nuevo.");
      } finally {
        if (token === viewToken && $(`${row.id}-row`)) $(`${row.id}-row`).setAttribute("aria-busy", "false");
      }
    });
    jobs.push((async () => {
      try {
        const data = await api("/trending/all/week", {}, signal);
        if (token !== viewToken) return;
        featured = (data.results || []).filter((item) => validItem(item) && item.backdrop_path).slice(0, 4).map((i) => normalize(i));
        if (!featured.length) throw new Error("no-featured");
        selectFeatured(0);
      } catch {
        if (token !== viewToken || signal.aborted) return;
        $("hero").setAttribute("aria-busy", "false");
        if (!featured.length) { $("hero-description").textContent = "No pudimos cargar los destacados. Revisa tu conexión e inténtalo de nuevo."; $("hero-retry").hidden = false; }
      }
    })());
    await Promise.allSettled(jobs);
    if (token === viewToken) updateCarouselControls();
  }
  function viewHeading(title, subtitle, eyebrow = "ENCUENTRA TU PRÓXIMA HISTORIA") {
    return `<header class="view-header"><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></header>`;
  }
  function toolbar() {
    const local = ["list", "continue"].includes(state.view), searchable = state.view === "search" || local;
    const filter = searchable ? `<div class="filter-tabs" role="group" aria-label="Tipo de contenido">${[["all", "Todos"], ["movie", "Películas"], ["tv", "Series"]].map(([type, label]) => `<button data-filter="${type}" aria-pressed="${state.filter === type}">${label}</button>`).join("")}</div>` : '<p class="results-caption" id="result-count" role="status">Buscando historias…</p>';
    const options = local ? [["recent", "Añadidos recientemente"], ["rating", "Mejor valorados"], ["title", "Nombre: A–Z"]] : state.view === "search" ? [["popular", "Relevancia"], ["rating", "Mejor valorados"]] : [["popular", "Más populares"], ["rating", "Mejor valorados"], ["newest", "Más recientes"]];
    return `<div class="view-toolbar">${filter}<div class="sort-control"><label for="sort-select">Ordenar por</label><select id="sort-select">${options.map(([value, label]) => `<option value="${value}" ${state.sort === value ? "selected" : ""}>${label}</option>`).join("")}</select></div></div>`;
  }
  function renderLocalView() {
    const continuing = state.view === "continue";
    let items = (continuing ? library().history : library().favorites).filter(validItem).filter((item) => state.filter === "all" || typeOf(item) === state.filter).slice();
    if (state.sort === "rating") items.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    if (state.sort === "title") items.sort((a, b) => titleOf(a).localeCompare(titleOf(b), "es"));
    $("content").innerHTML = viewHeading(continuing ? "Continúa donde lo dejaste" : "Mi lista", continuing ? "Tus películas y series empezadas, en un solo lugar." : `${library().favorites.length} ${library().favorites.length === 1 ? "historia guardada" : "historias guardadas"} para tu próximo momento libre.`, "TU ESPACIO PERSONAL") + toolbar() + `<div class="media-grid">${items.length ? items.map((i) => mediaCard(i, continuing ? "continue" : "catalog")).join("") : errorHTML(continuing ? "Tu próxima historia te espera" : "Haz espacio para tus favoritas", state.filter !== "all" ? "Todavía no tienes títulos guardados de este tipo. Prueba con otro filtro." : continuing ? "Aquí aparecerán los títulos cuando recibamos su progreso de reproducción." : "Pulsa + en una película o serie para tenerla siempre a mano.", "explore", "Explorar el catálogo", continuing ? "play" : "list")}</div>`;
  }
  async function fetchGridPage(page, signal) {
    if (state.view === "search") {
      const endpoint = state.filter === "all" ? "/search/multi" : `/search/${state.filter}`;
      const data = await api(endpoint, { query: state.query, page, include_adult: false }, signal);
      return { ...data, results: (data.results || []).filter(validItem).map((i) => normalize(i, state.filter === "all" ? undefined : state.filter)) };
    }
    const type = state.view;
    const genre = GENRES.find((g) => g.name === state.genre)?.[type];
    const sort = { popular: "popularity.desc", rating: "vote_average.desc", newest: type === "tv" ? "first_air_date.desc" : "primary_release_date.desc" }[state.sort];
    const params = { page, sort_by: sort, include_adult: false, include_video: false, with_genres: genre, "vote_count.gte": state.sort === "rating" ? 200 : state.sort === "newest" ? 30 : undefined };
    if (state.sort === "newest") params[type === "tv" ? "first_air_date.lte" : "primary_release_date.lte"] = new Date().toISOString().slice(0, 10);
    const data = await api(`/discover/${type}`, params, signal);
    return { ...data, results: (data.results || []).filter(validItem).map((i) => normalize(i, type)) };
  }
  async function loadGridPage(token, signal, append = false) {
    if (gridLoading || token !== viewToken) return;
    gridLoading = true;
    const nextPage = append ? state.page + 1 : 1;
    const button = $("load-more-button");
    button.disabled = true; button.textContent = "Cargando…";
    $("catalog-grid").setAttribute("aria-busy", "true");
    try {
      const data = await fetchGridPage(nextPage, signal);
      if (token !== viewToken) return;
      state.page = nextPage;
      gridTotalPages = Math.min(Number(data.total_pages) || 1, 500);
      gridItems = (append ? [...gridItems, ...data.results] : data.results).filter((item, i, all) => all.findIndex((f) => keyOf(f) === keyOf(item)) === i);
      if (state.sort === "rating" && state.view === "search") gridItems.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
      const grid = $("catalog-grid");
      if (!gridItems.length) grid.innerHTML = errorHTML("No encontramos títulos", state.view === "search" ? "Prueba con otra palabra o comprueba cómo se escribe el título." : "Prueba otro género para descubrir más historias.", "clear-filters", "Ver todos", "search");
      else if (append && !(state.sort === "rating" && state.view === "search")) {
        const shown = new Set([...grid.querySelectorAll(".media-card")].map((c) => c.dataset.key));
        grid.insertAdjacentHTML("beforeend", gridItems.filter((i) => !shown.has(keyOf(i))).map((i) => mediaCard(i)).join(""));
      } else grid.innerHTML = gridItems.map((i) => mediaCard(i)).join("");
      $("load-more-wrap").hidden = nextPage >= gridTotalPages;
      if ($("result-count")) $("result-count").textContent = `${Number(data.total_results || 0).toLocaleString("es-CL")} títulos para explorar`;
      $("results-status").textContent = `${gridItems.length} títulos mostrados${state.view === "search" ? ` para ${state.query}` : ""}.`;
    } catch {
      if (token !== viewToken || signal.aborted) return;
      if (append) showToast("No pudimos cargar más títulos. Puedes volver a intentarlo.");
      else { $("catalog-grid").innerHTML = errorHTML("El catálogo no está disponible", "Comprueba tu conexión e inténtalo de nuevo."); $("load-more-wrap").hidden = true; if ($("result-count")) $("result-count").textContent = "No pudimos cargar el catálogo"; }
    } finally {
      if (token === viewToken) { gridLoading = false; button.disabled = false; button.textContent = "Cargar más títulos"; $("catalog-grid").setAttribute("aria-busy", "false"); }
    }
  }
  function renderCatalog(token, signal) {
    gridItems = []; gridLoading = false;
    const title = state.view === "search" ? `Resultados para “${state.query}”` : state.genre || (state.view === "tv" ? "Series para engancharte" : "Películas para cada momento");
    const subtitle = state.view === "search" ? "Encuentra películas y series por su título." : state.view === "tv" ? "Descubre tu próxima serie, un episodio a la vez." : "Elige un género, explora y guarda lo que te llame la atención.";
    $("content").innerHTML = viewHeading(title, subtitle) + toolbar() + `<div id="catalog-grid" class="media-grid" aria-busy="true">${skeletons(12)}</div><div id="load-more-wrap" class="load-more" hidden><button id="load-more-button" class="button secondary" data-action="load-more">Cargar más títulos</button></div>`;
    loadGridPage(token, signal);
  }
  function renderView() {
    viewController.abort(); viewController = new AbortController(); viewToken++;
    setNavigation();
    if (state.view === "home") renderHome(viewToken, viewController.signal);
    else if (["list", "continue"].includes(state.view)) renderLocalView();
    else renderCatalog(viewToken, viewController.signal);
  }
  function applyRoute() {
    const route = parseRoute();
    if (route.detail) {
      if (!$("content").children.length) { state = parseRoute(history.state?.background || "#inicio"); renderView(); }
      if (!currentDetail || keyOf(currentDetail) !== keyOf(route.detail) || !$("details-dialog").open) openDetails(itemRegistry.get(keyOf(route.detail)) || route.detail, { updateURL: false });
      return;
    }
    closeDetails(false);
    state = route;
    lastViewHash = routeHash(state.view, state);
    renderView();
  }
  function refreshLibraryUI() {
    const activeCard = document.activeElement?.closest(".media-card");
    const focusBefore = activeCard && $("content").contains(activeCard) ? { key: activeCard.dataset.key, parentId: activeCard.parentElement.id, index: [...activeCard.parentElement.children].indexOf(activeCard), action: document.activeElement.tagName === "BUTTON" } : null;
    const count = library().favorites.length;
    document.querySelectorAll("[data-list-count]").forEach((el) => { el.textContent = count; el.hidden = !count; });
    document.querySelectorAll("[data-favorite]").forEach((button) => {
      const item = itemRegistry.get(button.dataset.favorite); if (!item) return;
      const active = isFavorite(item);
      button.setAttribute("aria-pressed", String(active)); button.setAttribute("aria-label", `${active ? "Quitar" : "Añadir"} ${titleOf(item)} ${active ? "de" : "a"} mi lista`); button.innerHTML = icon(active ? "check" : "plus");
    });
    if (currentDetail) updateDetailFavorite();
    if (state.view === "home") renderLocalRows();
    if (["list", "continue"].includes(state.view)) renderLocalView();
    updateProfileBadge();
    if (focusBefore && !document.activeElement?.closest(".media-card")) {
      const container = focusBefore.parentId ? $(focusBefore.parentId) : $("content").querySelector(".media-grid");
      const cards = container ? [...container.querySelectorAll(".media-card")] : [];
      const card = cards.find((c) => c.dataset.key === focusBefore.key) || cards[Math.min(focusBefore.index, cards.length - 1)];
      const target = card?.querySelector(focusBefore.action ? ".card-actions button" : ".card-link") || $("content").querySelector("[data-action=explore]");
      target?.focus({ preventScroll: true });
    }
  }
  function removeHistory(item) {
    const id = activeId(), before = library(id).history.slice();
    library(id).history = before.filter((i) => keyOf(i) !== keyOf(item));
    persist(); refreshLibraryUI();
    showToast(`“${titleOf(item)}” se quitó de continuar viendo.`, () => { library(id).history = before; persist(); refreshLibraryUI(); showToast("Cambio deshecho."); });
  }
  function updateCarouselControls() {
    document.querySelectorAll("[data-scroll]").forEach((button) => {
      const target = $(button.dataset.target); if (!target) return;
      const atStart = target.scrollLeft <= 2, atEnd = target.scrollLeft + target.clientWidth >= target.scrollWidth - 2;
      button.disabled = button.dataset.scroll === "-1" ? atStart : atEnd;
    });
  }

  let currentDetail = null, detailController = null, detailToken = 0, seasonController = null, seasonToken = 0;
  let episodes = [], selectedSeason = 1, selectedEpisode = 1, seasonLoading = false;
  let playerSession = null, playerURL = "", frameToken = 0, playerTimer, lastProgressWrite = 0;
  function syncDialogLock() {
    const open = Boolean(document.querySelector("dialog[open]"));
    document.body.classList.toggle("dialog-open", open);
    const topDialog = [...document.querySelectorAll("dialog[open]")].at(-1);
    (topDialog || document.body).append($("toast"));
  }
  function openDialog(dialog) { if (!dialog.open) dialog.showModal(); syncDialogLock(); }
  function closeDialog(dialog) { if (dialog.open) dialog.close(); syncDialogLock(); }
  function updateDetailFavorite() {
    if (!currentDetail) return;
    const active = isFavorite(currentDetail), button = $("detail-favorite");
    button.setAttribute("aria-pressed", String(active));
    button.innerHTML = icon(active ? "check" : "plus") + `<span>${active ? "En mi lista" : "Mi lista"}</span>`;
  }
  function renderDetail(item) {
    $("detail-title").textContent = titleOf(item);
    $("detail-category").textContent = item._type === "tv" ? "SERIE" : "PELÍCULA";
    $("detail-meta").innerHTML = metaHTML(item);
    $("detail-overview").textContent = item.overview || "Todavía no hay una sinopsis disponible para este título.";
    $("detail-overview").classList.toggle("clamped", (item.overview || "").length > 280);
    $("overview-toggle").hidden = (item.overview || "").length <= 280;
    $("overview-toggle").setAttribute("aria-expanded", "false"); $("overview-toggle").textContent = "Leer sinopsis completa";
    setImage($("detail-image"), item.backdrop_path);
    $("detail-tmdb").href = `https://www.themoviedb.org/${item._type}/${item.id}`;
    updateDetailFavorite();
  }
  function renderCast(cast = []) {
    $("cast-section").hidden = !cast.length;
    $("cast-list").innerHTML = cast.slice(0, 12).map((person) => `<div class="cast-person"><div class="cast-avatar">${imageHTML(person.profile_path, "w185", person.name || "") || icon("user")}</div><p>${esc(person.name)}</p><p class="cast-role">${esc(person.character || "")}</p></div>`).join("");
  }
  function refreshPlayButton() {
    const hasId = /^tt\d+$/.test(currentDetail?.imdb_id || "");
    const episode = episodes.find((e) => e.episode_number === selectedEpisode);
    $("detail-play").disabled = !hasId || (currentDetail?._type === "tv" && (seasonLoading || !episode || !availableEpisode(episode)));
    const saved = currentDetail ? library().progress[keyOf(currentDetail)] : null;
    $("detail-play").querySelector("span").textContent = currentDetail?._type === "tv" ? `${saved?.season === selectedSeason && saved?.episode === selectedEpisode && saved?.pct < 92 ? "Continuar" : "Ver"} T${selectedSeason} · E${selectedEpisode}` : "Reproducir";
  }
  async function openDetails(raw, { play = false, updateURL = true } = {}) {
    const item = normalize(raw);
    if (!validItem(item)) return;
    detailController?.abort(); seasonController?.abort(); stopPlayer();
    detailController = new AbortController(); const signal = detailController.signal, token = ++detailToken;
    currentDetail = item; episodes = []; seasonLoading = false;
    if (updateURL) {
      if (!/^#(movie|tv)-\d+$/.test(location.hash)) lastViewHash = location.hash || "#inicio";
      const url = `#${item._type}-${item.id}`, background = lastViewHash;
      if ($("details-dialog").open) history.replaceState({ background }, "", url); else history.pushState({ background }, "", url);
    } else if (history.state?.background && !parseRoute(history.state.background).detail) lastViewHash = history.state.background;
    document.title = `${titleOf(item)} · CineNova`;
    $("details-dialog").setAttribute("aria-busy", "true");
    $("detail-play").disabled = true;
    $("detail-play").querySelector("span").textContent = "Cargando…";
    ["episodes-section", "cast-section", "similar-section"].forEach((id) => { $(id).hidden = true; });
    $("detail-status").textContent = "Cargando la ficha…";
    renderDetail(item);
    openDialog($("details-dialog")); $("details-dialog").scrollTop = 0;
    try {
      const data = await api(`/${item._type}/${item.id}`, { append_to_response: "credits,similar,external_ids" }, signal);
      if (token !== detailToken || signal.aborted) return;
      currentDetail = normalize({ ...item, ...data, imdb_id: data.imdb_id || data.external_ids?.imdb_id || null }, item._type);
      itemRegistry.set(keyOf(currentDetail), currentDetail);
      renderDetail(currentDetail); document.title = `${titleOf(currentDetail)} · CineNova`;
      renderCast(data.credits?.cast || []);
      const similar = (data.similar?.results || []).filter(validItem).slice(0, 10).map((i) => normalize(i, item._type));
      $("similar-section").hidden = !similar.length;
      $("similar-list").innerHTML = similar.map((i) => mediaCard(i)).join("");
      const hasId = /^tt\d+$/.test(currentDetail.imdb_id || "");
      $("detail-status").textContent = hasId ? item._type === "tv" ? "Elige una temporada o continúa el último episodio que viste." : "Pulsa Reproducir cuando quieras empezar." : "Este título todavía no tiene un enlace de reproducción disponible.";
      if (item._type === "tv") {
        const seasons = (data.seasons || []).filter((s) => Number.isInteger(s.season_number) && s.episode_count > 0).sort((a, b) => a.season_number - b.season_number);
        $("episodes-section").hidden = false;
        $("season-select").innerHTML = seasons.map((s) => `<option value="${s.season_number}">${esc(s.name || `Temporada ${s.season_number}`)}</option>`).join("");
        const saved = library().progress[keyOf(currentDetail)];
        selectedSeason = seasons.find((s) => s.season_number === Number(saved?.season))?.season_number ?? seasons.find((s) => s.season_number > 0)?.season_number ?? seasons[0]?.season_number ?? 1;
        selectedEpisode = Number(saved?.episode) || 1;
        $("season-select").value = String(selectedSeason);
        $("season-select").disabled = !seasons.length;
        if (seasons.length) await loadSeason(selectedSeason, selectedEpisode);
        else $("episodes-list").innerHTML = errorHTML("Episodios pendientes", "Todavía no hay información de episodios para esta serie.", "");
      }
      if (token !== detailToken || signal.aborted) return;
      refreshPlayButton();
      if (play && !$("detail-play").disabled) startPlayer();
    } catch {
      if (token !== detailToken || signal.aborted) return;
      $("detail-status").innerHTML = `No pudimos completar la ficha. <button class="text-button" data-action="retry-detail">${icon("retry")}Reintentar</button>`;
      $("detail-play").querySelector("span").textContent = "Reproducir";
    } finally { if (token === detailToken) $("details-dialog").setAttribute("aria-busy", "false"); }
  }
  function availableEpisode(episode) { return !episode.air_date || episode.air_date <= new Date().toISOString().slice(0, 10); }
  async function loadSeason(season, preferredEpisode = 1) {
    if (!currentDetail || currentDetail._type !== "tv") return;
    seasonController?.abort(); seasonController = new AbortController();
    const signal = seasonController.signal, token = ++seasonToken, detailAtStart = detailToken, id = currentDetail.id;
    selectedSeason = Number(season); seasonLoading = true; episodes = []; refreshPlayButton();
    $("episodes-list").setAttribute("aria-busy", "true");
    $("episodes-list").innerHTML = '<p class="subtle-note" role="status">Cargando episodios…</p>';
    try {
      const data = await api(`/tv/${id}/season/${selectedSeason}`, {}, signal);
      if (token !== seasonToken || detailAtStart !== detailToken || signal.aborted) return;
      episodes = (data.episodes || []).filter((e) => Number.isInteger(e.episode_number));
      const saved = library().progress[keyOf(currentDetail)];
      const preferred = saved?.season === selectedSeason ? Number(saved.episode) : Number(preferredEpisode);
      selectedEpisode = episodes.find((e) => e.episode_number === preferred && availableEpisode(e))?.episode_number ?? episodes.find(availableEpisode)?.episode_number ?? episodes[0]?.episode_number ?? 1;
      renderEpisodes();
    } catch {
      if (token !== seasonToken || detailAtStart !== detailToken || signal.aborted) return;
      $("episodes-list").innerHTML = errorHTML("No pudimos cargar los episodios", "Comprueba tu conexión y vuelve a intentarlo.", "retry-season");
    } finally {
      if (token === seasonToken && detailAtStart === detailToken) { seasonLoading = false; refreshPlayButton(); $("episodes-list").setAttribute("aria-busy", "false"); }
    }
  }
  function renderEpisodes() {
    $("episodes-list").innerHTML = episodes.length ? episodes.map((ep) => {
      const active = playerSession?.key === keyOf(currentDetail) && playerSession.season === selectedSeason && playerSession.episode === ep.episode_number;
      const canPlay = /^tt\d+$/.test(currentDetail.imdb_id || "") && availableEpisode(ep);
      return `<button class="episode" data-episode="${ep.episode_number}" aria-pressed="${Boolean(active)}" aria-label="${esc(`Ver episodio ${ep.episode_number}: ${ep.name || "Sin título"}`)}" ${canPlay ? "" : "disabled"}>
        ${imageHTML(ep.still_path, "w300", "", "episode-image") || `<span class="episode-image episode-placeholder">${icon("tv")}</span>`}
        <span><span class="episode-number">EPISODIO ${ep.episode_number}${ep.runtime ? ` · ${ep.runtime} MIN` : ""}${availableEpisode(ep) ? "" : " · PRÓXIMAMENTE"}</span><span class="episode-name">${esc(ep.name || `Episodio ${ep.episode_number}`)}</span><span class="episode-description">${esc(ep.overview || "Sin sinopsis disponible.")}</span></span>${icon(active ? "check" : "play")}</button>`;
    }).join("") : errorHTML("Sin episodios por ahora", "Prueba con otra temporada.", "");
    updateNextEpisode();
  }
  function embedURL(item, season, episode) {
    if (!/^tt\d+$/.test(item.imdb_id || "")) return "";
    try {
      const url = new URL(item._type === "tv" ? `${config.tvEmbed}${item.imdb_id}/${Number(season)}/${Number(episode)}` : `${config.movieEmbed}${item.imdb_id}/`);
      return url.protocol === "https:" ? url.href : "";
    } catch { return ""; }
  }
  function loadPlayerFrame() {
    if (!playerURL) return;
    const token = ++frameToken;
    clearTimeout(playerTimer); $("movie-frame").src = "about:blank";
    $("player-loading").textContent = "Cargando el reproductor externo…";
    requestAnimationFrame(() => { if (token === frameToken && playerSession) $("movie-frame").src = playerURL; });
    playerTimer = setTimeout(() => {
      if (token === frameToken && playerSession) $("player-loading").textContent = "Si el video no aparece, reintenta o abre el reproductor en otra pestaña.";
    }, 14000);
  }
  function startPlayer(season = selectedSeason, episode = selectedEpisode) {
    if (!currentDetail) return;
    if (currentDetail._type === "tv" && (seasonLoading || !episodes.some((e) => e.episode_number === Number(episode) && availableEpisode(e)))) return;
    const url = embedURL(currentDetail, season, episode);
    if (!url) { showToast("Este título no tiene un enlace de reproducción disponible."); return; }
    selectedEpisode = Number(episode);
    playerSession = { key: keyOf(currentDetail), item: compact(currentDetail), profileId: activeId(), season: currentDetail._type === "tv" ? Number(season) : 0, episode: currentDetail._type === "tv" ? Number(episode) : 0 };
    playerURL = url; lastProgressWrite = 0;
    $("external-player").href = url;
    $("movie-frame").title = `Reproductor de ${titleOf(currentDetail)}${currentDetail._type === "tv" ? `, temporada ${season}, episodio ${episode}` : ""}`;
    $("player-title").textContent = currentDetail._type === "tv" ? `Temporada ${season} · Episodio ${episode}` : titleOf(currentDetail);
    $("player-section").hidden = false;
    loadPlayerFrame(); if (currentDetail._type === "tv") renderEpisodes();
    $("player-section").scrollIntoView({ behavior: "smooth", block: "start" });
    $("player-title").focus({ preventScroll: true });
  }
  function updateNextEpisode() {
    const following = playerSession && currentDetail?._type === "tv" && playerSession.season === selectedSeason ? episodes.find((e) => e.episode_number > playerSession.episode && availableEpisode(e)) : null;
    $("next-episode").hidden = !following;
    $("next-episode").dataset.episode = following?.episode_number || "";
  }
  function stopPlayer() {
    frameToken++; clearTimeout(playerTimer); playerSession = null; playerURL = "";
    $("movie-frame").src = "about:blank"; $("external-player").removeAttribute("href");
    $("player-section").hidden = true; $("next-episode").hidden = true;
    exitFullscreen();
  }
  function closeDetails(updateURL = true) {
    detailController?.abort(); seasonController?.abort(); detailToken++; seasonToken++;
    stopPlayer(); currentDetail = null; episodes = [];
    if (updateURL && /^#(movie|tv)-\d+$/.test(location.hash)) history.replaceState(null, "", lastViewHash);
    closeDialog($("details-dialog"));
    if (updateURL) document.title = `${state.view === "home" ? "Tu próxima historia" : { movie: "Películas", tv: "Series", list: "Mi lista", continue: "Continuar viendo", search: "Buscar" }[state.view]} · CineNova`;
  }
  function acceptProgress(event) {
    if (!playerSession || event.source !== $("movie-frame").contentWindow) return;
    try {
      const origin = new URL(event.origin);
      if (origin.protocol !== "https:" || !(config.playerHosts || []).some((host) => origin.hostname === host || origin.hostname.endsWith(`.${host}`))) return;
    } catch { return; }
    let data = event.data;
    if (typeof data === "string") { try { data = JSON.parse(data); } catch { return; } }
    if (!data || data.event !== "timeupdate") return;
    const currentTime = Number(data.currentTime), duration = Number(data.duration);
    if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0 || currentTime < 60 || currentTime > duration + 1) return;
    const pct = Math.min(100, currentTime / duration * 100);
    if (pct < 3) return;
    const session = playerSession, lib = library(session.profileId);
    const exists = lib.history.some((i) => keyOf(i) === session.key);
    if (Date.now() - lastProgressWrite < 5000 && exists && pct <= 92) return;
    lastProgressWrite = Date.now();
    lib.progress[session.key] = { season: session.season, episode: session.episode, pct: pct > 92 ? 100 : pct, currentTime, duration, ts: Date.now() };
    lib.history = lib.history.filter((i) => keyOf(i) !== session.key);
    if (pct <= 92) lib.history.unshift(session.item);
    lib.history = lib.history.slice(0, 30);
    persist();
    if (session.profileId === activeId()) {
      // Una actualización de tiempo no debe reemplazar el control con foco en el catálogo.
      document.querySelectorAll(`.media-card[data-key="${session.key}"] .watch-progress`).forEach((bar) => { bar.setAttribute("aria-valuenow", String(Math.round(pct))); bar.firstElementChild.style.width = `${pct}%`; });
      if (exists !== (pct <= 92)) refreshLibraryUI();
    }
  }
  async function toggleFullscreen() {
    const wrap = $("player-wrap");
    if (document.fullscreenElement || document.webkitFullscreenElement || wrap.classList.contains("css-fullscreen")) { exitFullscreen(); return; }
    const request = wrap.requestFullscreen || wrap.webkitRequestFullscreen;
    if (request) { try { await request.call(wrap); return; } catch { /* Respaldo para navegadores móviles. */ } }
    wrap.classList.add("css-fullscreen"); $("details-dialog").classList.add("css-fullscreen-dialog");
    $("exit-fullscreen").focus();
  }
  function exitFullscreen() {
    const wrap = $("player-wrap"), wasCSS = wrap.classList.contains("css-fullscreen");
    wrap.classList.remove("css-fullscreen"); $("details-dialog").classList.remove("css-fullscreen-dialog");
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (document.webkitFullscreenElement) { try { document.webkitExitFullscreen(); } catch { /* Ya terminó. */ } }
    if (wasCSS && !$("player-section").hidden) $("fullscreen-button").focus({ preventScroll: true });
  }
  async function shareDetail() {
    if (!currentDetail) return;
    const url = new URL(location.href); url.hash = `${currentDetail._type}-${currentDetail.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `${titleOf(currentDetail)} · CineNova`, url: url.href });
      else { await navigator.clipboard.writeText(url.href); showToast("Enlace copiado. Compártelo con quien quieras."); }
    } catch (error) { if (error.name !== "AbortError") showToast("No pudimos copiar el enlace. Puedes copiar la dirección de esta página."); }
  }

  let manageMode = false, editingProfileId = null, editorColor = COLORS[0].value, colorChanged = false;
  function avatarMarkup(profile, className = "profile-avatar") {
    const color = COLORS.some((c) => c.value === profile.color) ? profile.color : COLORS[1].value;
    let src = "";
    try { if (new URL(profile.avatar).protocol === "https:") src = profile.avatar; } catch { /* Avatar por inicial. */ }
    return `<span class="${className}" style="background:${color}"><span>${esc(profile.name.trim().slice(0, 1).toLocaleUpperCase("es"))}</span>${src ? `<img src="${esc(src)}" alt="" loading="lazy">` : ""}</span>`;
  }
  function updateProfileBadge() {
    const profile = store.profiles.find((p) => p.id === store.currentProfileId);
    $("profile-button").innerHTML = avatarMarkup(profile || { name: "C", color: COLORS[1].value }, "avatar-mini") + `<span class="profile-button-name">${esc(profile?.name || "Perfil")}</span>`;
    $("profile-button").setAttribute("aria-label", profile ? `Cambiar perfil, actual: ${profile.name}` : "Elegir perfil");
  }
  function renderProfiles() {
    $("profiles-list").innerHTML = store.profiles.map((p) => `<button class="profile-card" data-profile="${esc(p.id)}" aria-label="${esc(`${manageMode ? "Editar" : "Ver como"} ${p.name}`)}">${avatarMarkup(p)}<span class="profile-card-name">${esc(p.name)}</span>${manageMode ? '<span class="profile-edit-label">Editar</span>' : p.id === store.currentProfileId ? '<span class="profile-edit-label">Actual</span>' : ""}</button>`).join("") + (store.profiles.length < 6 ? `<button class="profile-card add" data-action="add-profile" aria-label="Crear perfil"><span class="profile-avatar">${icon("plus")}</span><span class="profile-card-name">Añadir perfil</span></button>` : "");
    $("manage-profiles").textContent = manageMode ? "Terminar edición" : "Editar perfiles";
    $("manage-profiles").hidden = !store.profiles.length;
  }
  function openProfiles() { manageMode = false; renderProfiles(); openDialog($("profiles-dialog")); }
  function selectProfile(id) {
    // Cambiar de perfil detiene el reproductor antes de asignar el siguiente progreso.
    closeDetails(); store.currentProfileId = id; library(); persist();
    closeDialog($("profile-editor")); closeDialog($("profiles-dialog"));
    refreshLibraryUI(); showToast(id ? `Hola, ${store.profiles.find((p) => p.id === id)?.name || ""}.` : "Estás explorando sin perfil.");
  }
  function renderColors() {
    $("avatar-colors").innerHTML = COLORS.map((c) => `<button class="color-option" type="button" data-color="${c.value}" style="background:${c.value}" aria-label="${c.name}" aria-pressed="${c.value === editorColor}">${c.value === editorColor ? icon("check") : ""}</button>`).join("");
  }
  function openProfileEditor(id = null) {
    editingProfileId = id; colorChanged = false;
    const profile = store.profiles.find((p) => p.id === id);
    editorColor = profile?.color || COLORS[0].value;
    $("editor-title").textContent = profile ? "Editar perfil" : "Crear perfil";
    $("profile-name").value = profile?.name || "";
    $("profile-name").removeAttribute("aria-invalid"); $("profile-error").textContent = "";
    $("delete-profile").hidden = !profile;
    renderColors(); openDialog($("profile-editor")); $("profile-name").focus();
  }
  function saveProfile(event) {
    event.preventDefault();
    const name = $("profile-name").value.trim().replace(/\s+/g, " ").slice(0, 24);
    const duplicate = store.profiles.some((p) => p.id !== editingProfileId && p.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"));
    if (!name || duplicate) {
      $("profile-error").textContent = duplicate ? "Ese nombre ya está en uso. Elige otro para identificar el perfil." : "Escribe un nombre para tu perfil.";
      $("profile-name").setAttribute("aria-invalid", "true"); $("profile-name").focus(); return;
    }
    if (editingProfileId) {
      const profile = store.profiles.find((p) => p.id === editingProfileId); if (!profile) return;
      Object.assign(profile, { name, color: editorColor });
      if (colorChanged) profile.avatar = "";
      persist(); closeDialog($("profile-editor")); renderProfiles(); updateProfileBadge(); showToast("Perfil actualizado.");
    } else {
      if (store.profiles.length >= 6) return;
      const id = `profile-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;
      store.profiles.push({ id, name, color: editorColor, avatar: "" }); store.libraries[id] = newLibrary();
      selectProfile(id);
    }
  }
  function confirmAction(title, description) {
    $("confirm-title").textContent = title; $("confirm-description").textContent = description;
    $("confirm-dialog").returnValue = ""; openDialog($("confirm-dialog"));
    $("confirm-cancel").focus();
    return new Promise((resolve) => $("confirm-dialog").addEventListener("close", () => resolve($("confirm-dialog").returnValue === "yes"), { once: true }));
  }
  async function deleteProfile() {
    const profile = store.profiles.find((p) => p.id === editingProfileId); if (!profile) return;
    if (!await confirmAction(`¿Eliminar a ${profile.name}?`, "Se eliminarán su lista y su progreso en este navegador. Esta acción no se puede deshacer.")) return;
    store.profiles = store.profiles.filter((p) => p.id !== profile.id); delete store.libraries[profile.id];
    if (store.currentProfileId === profile.id) store.currentProfileId = null;
    persist(); closeDialog($("profile-editor")); renderProfiles(); refreshLibraryUI(); showToast("Perfil eliminado.");
  }

  function runSearch() {
    clearTimeout(searchTimer);
    const query = $("search").value.trim().slice(0, 100);
    if (!query) {
      const route = parseRoute(searchReturnHash);
      navigate(route.detail ? "home" : route.view, route.detail ? {} : route, false);
      return;
    }
    if (state.view !== "search") searchReturnHash = lastViewHash;
    const hash = routeHash("search", { query, filter: state.view === "search" ? state.filter : "all", sort: state.view === "search" ? state.sort : "popular" });
    if (location.hash === hash) return;
    if (state.view === "search") history.replaceState(null, "", hash); else history.pushState(null, "", hash);
    applyRoute();
  }
  function clearSearch() { $("search").value = ""; $("search-clear").hidden = true; runSearch(); $("search").focus(); }
  document.addEventListener("click", (event) => {
    const target = event.target.closest("button, a"); if (!target || target.disabled) return;
    if (target.tagName === "A" && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)) return;
    if (target.dataset.view) { event.preventDefault(); closeDialog($("menu-dialog")); navigate(target.dataset.view); return; }
    if (target.hasAttribute("data-route")) { event.preventDefault(); const route = parseRoute(target.getAttribute("href")); navigate(route.view, route); return; }
    if (target.dataset.detail) { event.preventDefault(); const item = itemRegistry.get(target.dataset.detail); if (item) openDetails(item, { play: target.dataset.play === "true" }); return; }
    if (target.dataset.favorite) { toggleFavorite(itemRegistry.get(target.dataset.favorite)); return; }
    if (target.dataset.removeHistory) { removeHistory(itemRegistry.get(target.dataset.removeHistory)); return; }
    if (target.dataset.closeDialog) { if (target.dataset.closeDialog === "details-dialog") closeDetails(); else closeDialog($(target.dataset.closeDialog)); return; }
    if (target.hasAttribute("data-genre")) { closeDialog($("menu-dialog")); if (state.view !== "home" || target.dataset.genre) navigate(state.view === "tv" ? "tv" : "movie", { genre: target.dataset.genre }); return; }
    if (target.dataset.filter) { navigate(state.view, { ...state, filter: target.dataset.filter }); return; }
    if (target.dataset.scroll) { $(target.dataset.target)?.scrollBy({ left: Number(target.dataset.scroll) * $(target.dataset.target).clientWidth * .85, behavior: "smooth" }); return; }
    if (target.dataset.featured !== undefined) { selectFeatured(Number(target.dataset.featured)); return; }
    if (target.dataset.episode) { startPlayer(selectedSeason, Number(target.dataset.episode)); return; }
    if (target.dataset.profile) { if (manageMode) openProfileEditor(target.dataset.profile); else selectProfile(target.dataset.profile); return; }
    if (target.dataset.color && COLORS.some((c) => c.value === target.dataset.color)) { editorColor = target.dataset.color; colorChanged = true; renderColors(); document.querySelector(`[data-color="${editorColor}"]`).focus(); return; }
    const action = target.dataset.action;
    if (action === "retry-view") { apiCache.clear(); renderView(); }
    if (action === "load-more") loadGridPage(viewToken, viewController.signal, true);
    if (action === "clear-filters") navigate(state.view === "search" ? "home" : state.view);
    if (action === "explore") navigate("home");
    if (action === "retry-detail" && currentDetail) openDetails(currentDetail, { updateURL: false });
    if (action === "retry-season") loadSeason(selectedSeason);
    if (action === "add-profile") openProfileEditor();
  });
  document.addEventListener("change", (event) => {
    if (event.target.id === "sort-select") navigate(state.view, { ...state, sort: event.target.value });
    if (event.target.id === "season-select") loadSeason(Number(event.target.value));
  });
  $("search-form").addEventListener("submit", (event) => { event.preventDefault(); runSearch(); });
  $("search").addEventListener("input", () => { $("search-clear").hidden = !$("search").value; clearTimeout(searchTimer); searchTimer = setTimeout(runSearch, 350); });
  $("search").addEventListener("keydown", (event) => { if (event.key === "Escape" && $("search").value) { event.preventDefault(); clearSearch(); } });
  $("search-clear").addEventListener("click", clearSearch);
  $("toast-action").addEventListener("click", () => { const action = toastAction; hideToast(); action?.(); });
  $("toast-close").addEventListener("click", hideToast);
  $("toast").addEventListener("pointerenter", () => clearTimeout(toastTimer));
  $("toast").addEventListener("focusin", () => clearTimeout(toastTimer));
  const resumeToastTimer = () => { if (!$("toast").hidden && !$("toast").matches(":focus-within, :hover")) toastTimer = setTimeout(hideToast, 5200); };
  $("toast").addEventListener("pointerleave", resumeToastTimer);
  $("toast").addEventListener("focusout", resumeToastTimer);
  $("hero-info").addEventListener("click", () => { if (featured[featuredIndex]) openDetails(featured[featuredIndex]); });
  $("hero-play").addEventListener("click", () => { if (featured[featuredIndex]) openDetails(featured[featuredIndex], { play: true }); });
  $("hero-retry").addEventListener("click", () => { apiCache.clear(); renderView(); });
  $("profile-button").addEventListener("click", openProfiles);
  $("menu-button").addEventListener("click", () => openDialog($("menu-dialog")));
  $("menu-profile").addEventListener("click", () => { closeDialog($("menu-dialog")); openProfiles(); });
  $("menu-continue").addEventListener("click", () => { closeDialog($("menu-dialog")); navigate("continue"); });
  $("manage-profiles").addEventListener("click", () => { manageMode = !manageMode; renderProfiles(); });
  $("guest-button").addEventListener("click", () => selectProfile(null));
  $("profile-form").addEventListener("submit", saveProfile);
  $("profile-name").addEventListener("input", () => { $("profile-name").removeAttribute("aria-invalid"); $("profile-error").textContent = ""; });
  $("delete-profile").addEventListener("click", deleteProfile);
  $("confirm-cancel").addEventListener("click", () => $("confirm-dialog").close("no"));
  $("confirm-accept").addEventListener("click", () => $("confirm-dialog").close("yes"));
  $("detail-favorite").addEventListener("click", () => { if (currentDetail) toggleFavorite(currentDetail); });
  $("detail-share").addEventListener("click", shareDetail);
  $("detail-play").addEventListener("click", () => startPlayer());
  $("overview-toggle").addEventListener("click", () => {
    const expanded = $("overview-toggle").getAttribute("aria-expanded") !== "true";
    $("detail-overview").classList.toggle("clamped", !expanded);
    $("overview-toggle").setAttribute("aria-expanded", String(expanded));
    $("overview-toggle").textContent = expanded ? "Ver menos" : "Leer sinopsis completa";
  });
  $("retry-player").addEventListener("click", loadPlayerFrame);
  $("fullscreen-button").addEventListener("click", toggleFullscreen);
  $("exit-fullscreen").addEventListener("click", exitFullscreen);
  $("movie-frame").addEventListener("load", () => {
    if (!playerSession || $("movie-frame").getAttribute("src") === "about:blank") return;
    clearTimeout(playerTimer);
    $("player-loading").textContent = "Si el video no aparece, reintenta o abre el reproductor en otra pestaña.";
  });
  window.addEventListener("message", acceptProgress);
  window.addEventListener("hashchange", () => { clearTimeout(searchTimer); applyRoute(); });
  // Un solo listener de errores cubre portadas, avatares y miniaturas.
  document.addEventListener("error", (event) => { if (event.target.tagName === "IMG") event.target.hidden = true; }, true);
  document.addEventListener("scroll", (event) => { if (event.target.classList?.contains("carousel")) updateCarouselControls(); }, true);
  window.addEventListener("resize", updateCarouselControls);
  document.addEventListener("keydown", (event) => {
    const input = event.target.closest("input, textarea, select, [contenteditable]");
    if (!input && !document.querySelector("dialog[open]") && (event.key === "/" || (event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey)))) { event.preventDefault(); $("search").focus(); }
    if (event.target.classList?.contains("carousel") && ["ArrowLeft", "ArrowRight"].includes(event.key)) { event.preventDefault(); event.target.scrollBy({ left: (event.key === "ArrowLeft" ? -1 : 1) * event.target.clientWidth * .8, behavior: "smooth" }); }
    if (event.key === "Escape" && $("player-wrap").classList.contains("css-fullscreen")) { event.preventDefault(); exitFullscreen(); }
  });
  document.querySelectorAll("dialog").forEach((dialog) => {
    let backdropDown = false;
    const outside = (event) => { const r = dialog.getBoundingClientRect(); return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom; };
    dialog.addEventListener("pointerdown", (event) => { backdropDown = event.target === dialog && outside(event); });
    dialog.addEventListener("click", (event) => { if (backdropDown && event.target === dialog && outside(event)) { if (dialog.id === "details-dialog") closeDetails(); else closeDialog(dialog); } backdropDown = false; });
    dialog.addEventListener("close", () => { if (dialog.id === "details-dialog" && !dialog.open && currentDetail) closeDetails(); syncDialogLock(); });
    dialog.addEventListener("cancel", (event) => {
      if (dialog.id !== "details-dialog") return;
      event.preventDefault();
      if (document.fullscreenElement || document.webkitFullscreenElement || $("player-wrap").classList.contains("css-fullscreen")) exitFullscreen(); else closeDetails();
    });
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    const updated = loadStore();
    // Una lista actualizada en otra pestaña no interrumpe el video del mismo perfil.
    if (playerSession && (updated.currentProfileId || GUEST) !== playerSession.profileId) stopPlayer();
    store = updated; refreshLibraryUI(); if ($("profiles-dialog").open) renderProfiles();
  });
  function updateConnection() { $("offline-banner").hidden = navigator.onLine; }
  window.addEventListener("offline", updateConnection);
  window.addEventListener("online", () => { updateConnection(); apiCache.clear(); if (!["list", "continue"].includes(state.view)) renderView(); });
  let installPrompt = null;
  window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); installPrompt = event; $("pwa-install").hidden = false; });
  $("pwa-install").addEventListener("click", async () => {
    if (!installPrompt) return;
    const prompt = installPrompt; installPrompt = null; $("pwa-install").hidden = true;
    try { await prompt.prompt(); await prompt.userChoice; } catch { showToast("No se pudo abrir la instalación. Vuelve a intentarlo desde el menú del navegador."); }
  });
  window.addEventListener("appinstalled", () => { installPrompt = null; $("pwa-install").hidden = true; });
  if ("serviceWorker" in navigator && (location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname))) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => { /* El catálogo funciona también sin instalación. */ }));
  }
  applyRoute(); refreshLibraryUI(); updateConnection();
  // Escribe la migración una sola vez sin borrar las claves antiguas.
  if (!readJSON(STORAGE_KEY, null)) persist();
})();
