/* Лаборатория здоровья — «Тренировка памяти и внимания».
   Витрина мини-игр (разминка для ума) и общее хранилище результатов.
   Каждая игра — отдельный файл (js/schulte.js, js/wordgame.js; позже логические задачи, маджонг),
   который регистрирует себя через LZBrain.register({...}).
   Результаты лежат в localStorage под своим ключом lz_brain_v1 и не трогают lz_game_v1 / lz_farm_v1. */
(function () {
  "use strict";

  var KEY = "lz_brain_v1";
  var HIST_MAX = 20;          // последних результатов на игру
  var DAY = 864e5;
  var $ = function (id) { return document.getElementById(id); };
  function L() { return window.LZ; }

  /* ---------- Хранилище ---------- */
  var B = load();
  function load() {
    try {
      var r = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!r || typeof r !== "object") r = {};
      if (!r.games || typeof r.games !== "object") r.games = {};
      r.v = 1;
      return r;
    } catch (e) { return { v: 1, games: {} }; }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(B)); } catch (e) {} }
  function gameData(id) {
    var g = B.games[id];
    if (!g || typeof g !== "object") g = B.games[id] = {};
    if (!g.best || typeof g.best !== "object") g.best = {};
    if (!Array.isArray(g.hist)) g.hist = [];
    g.plays = g.plays || 0;
    return g;
  }
  function pref(name, val) {
    if (!B.pref || typeof B.pref !== "object") B.pref = {};
    if (arguments.length > 1) { B.pref[name] = val; save(); }
    return B.pref[name];
  }

  /* ---------- Каталог игр ---------- */
  var ICONS = {
    schulte: '<svg viewBox="0 0 60 60" aria-hidden="true"><rect x="2" y="2" width="56" height="56" rx="10" fill="#fbf6e9" stroke="#c49a3c" stroke-width="3"/>' +
      '<g fill="none" stroke="#c49a3c" stroke-width="2"><path d="M20 4v52M40 4v52M4 20h52M4 40h52"/></g>' +
      '<g font-family="Lora,Georgia,serif" font-weight="700" font-size="13" text-anchor="middle" fill="#1f3d20"><text x="12" y="16.5">7</text><text x="30" y="16.5">2</text><text x="48" y="16.5">9</text>' +
      '<text x="12" y="34.5">4</text><text x="48" y="34.5">6</text><text x="12" y="52.5">8</text><text x="30" y="52.5">3</text><text x="48" y="52.5">5</text></g>' +
      '<rect x="21" y="21" width="18" height="18" rx="4" fill="#e1f0d8"/><text x="30" y="34.5" font-family="Lora,Georgia,serif" font-weight="700" font-size="13" text-anchor="middle" fill="#2e6b2e">1</text></svg>',
    words: '<svg viewBox="0 0 60 60" aria-hidden="true"><g font-family="Lora,Georgia,serif" font-weight="700" font-size="17" text-anchor="middle" fill="#1f3d20">' +
      '<rect x="3" y="18" width="17" height="22" rx="4" fill="#fbf6e9" stroke="#c49a3c" stroke-width="2.5"/><text x="11.5" y="35">С</text>' +
      '<rect x="21.5" y="18" width="17" height="22" rx="4" fill="#fbf6e9" stroke="#c49a3c" stroke-width="2.5"/><text x="30" y="35">Л</text>' +
      '<rect x="40" y="18" width="17" height="22" rx="4" fill="#fbf6e9" stroke="#c49a3c" stroke-width="2.5"/><text x="48.5" y="35">О</text></g></svg>',
    logic: '<svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="26" fill="#fbf6e9" stroke="#c49a3c" stroke-width="3"/>' +
      '<text x="30" y="41" font-family="Lora,Georgia,serif" font-weight="700" font-size="30" text-anchor="middle" fill="#1f3d20">?</text></svg>',
    mahjong: '<svg viewBox="0 0 60 60" aria-hidden="true"><rect x="8" y="6" width="30" height="40" rx="5" fill="#e9dfc2" stroke="#8a6a1f" stroke-width="2.5"/>' +
      '<rect x="20" y="14" width="30" height="40" rx="5" fill="#fbf6e9" stroke="#c49a3c" stroke-width="2.5"/><circle cx="35" cy="27" r="5" fill="#2e5b2b"/><circle cx="35" cy="42" r="5" fill="#9a3b1e"/></svg>'
  };
  var GAMES = [
    { id: "schulte", n: "Таблица Шульте", d: "Найдите числа по порядку — тренирует внимание и быстрый взгляд", soon: true },
    { id: "words", n: "Словодел", d: "Составляйте слова из букв одного длинного слова", soon: true },
    { id: "logic", n: "Логические задачи", d: "Небольшие задачки на смекалку, без спешки", soon: true },
    { id: "mahjong", n: "Маджонг", d: "Находите пары одинаковых костей", soon: true }
  ];
  function find(id) { for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i]; return null; }
  /* Игра сообщает о себе: { id, n, d, screen, status(), title(), onShow(name) } */
  function register(def) {
    var g = find(def.id);
    if (!g) { g = { id: def.id }; GAMES.push(g); }
    for (var k in def) g[k] = def[k];
    g.soon = false;
  }

  /* ---------- Общие звания ---------- */
  var RANKS = ["Новичок", "Внимательный", "Зоркий глаз", "Мастер внимания"];

  /* ---------- Запись результата ----------
     res: { score, time (мс), mis, adj (мс, время с учётом ошибок) } — чем больше score, тем лучше. */
  function record(gameId, variant, res) {
    var g = gameData(gameId), v = String(variant);
    var prev = g.best[v] || null;
    var entry = { v: v, sc: res.score, t: Math.round(res.time), m: res.mis, a: Math.round(res.adj), at: Date.now() };
    var isBest = !prev || entry.sc > prev.sc;
    if (isBest) g.best[v] = entry;
    g.hist.push(entry); if (g.hist.length > HIST_MAX) g.hist = g.hist.slice(-HIST_MAX);
    g.plays++;
    save();
    var reward = { coins: 0, already: false };
    if (window.LZFarm && LZFarm.onBrain) reward = LZFarm.onBrain(gameId, v) || reward;
    if (window.Platform && Platform.leaderboard) Platform.leaderboard.submit(gameId, v, entry.sc);
    return { isBest: isBest, first: !prev, prev: prev, entry: entry, week: week(gameId, v), reward: reward };
  }
  /* v10: уточнить уже записанный результат (Словодел: раунд можно продолжать после прохождения).
     Находит запись по времени at, поднимает счёт и при необходимости личный рекорд. Монет не начисляет. */
  function update(gameId, variant, at, res) {
    var g = gameData(gameId), v = String(variant), e = null;
    g.hist.forEach(function (h) { if (h.at === at && h.v === v) e = h; });
    if (!e) return null;
    if (res.score > e.sc) e.sc = res.score;
    if (res.mis != null) e.m = res.mis;
    var b = g.best[v], isBest = false;
    if (b && b.at === at) { b.sc = e.sc; b.m = e.m; }
    else if (!b || e.sc > b.sc) { g.best[v] = { v: v, sc: e.sc, t: e.t, m: e.m, a: e.a, at: e.at }; isBest = true; }
    save();
    return { entry: e, isBest: isBest };
  }
  function best(gameId, variant) { return gameData(gameId).best[String(variant)] || null; }
  function hist(gameId, variant) {
    var v = variant == null ? null : String(variant);
    return gameData(gameId).hist.filter(function (h) { return v === null || h.v === v; });
  }
  /* среднее за последние 7 дней */
  function week(gameId, variant) {
    var since = Date.now() - 7 * DAY, list = hist(gameId, variant).filter(function (h) { return h.at >= since; });
    if (!list.length) return null;
    var s = 0, a = 0; list.forEach(function (h) { s += h.sc; a += h.a; });
    return { n: list.length, sc: Math.round(s / list.length), a: Math.round(a / list.length) };
  }

  /* ---------- Небольшая картинка прогресса (общая для всех игр) ----------
     fmt(entry) — подпись для лучшего/среднего результата. */
  function progressHTML(gameId, variant, fmt, label) {
    var b = best(gameId, variant), w = week(gameId, variant), h = hist(gameId, variant).slice(-10);
    if (!b) return '<div class="br-prog"><p class="muted center">' + (label ? label + ": " : "") + "результатов пока нет. Сыграйте первый раз — и здесь появится ваш прогресс.</p></div>";
    var max = 0; h.forEach(function (x) { if (x.sc > max) max = x.sc; });
    var last = h[h.length - 1];
    var bars = h.map(function (x) {
      var pct = Math.max(8, Math.round(x.sc / max * 100));
      return '<span class="br-bar' + (x === last ? " last" : "") + (x.at === b.at ? " best" : "") + '" style="height:' + pct + '%" title="' + x.sc + ' очков"></span>';
    }).join("");
    return '<div class="br-prog">' + (label ? '<h3 class="first">' + label + "</h3>" : "") +
      '<div class="br-stats"><div><span>Ваш лучший результат</span><b>' + fmt(b) + "</b></div>" +
      "<div><span>Среднее за неделю</span><b>" + (w ? fmt({ sc: w.sc, a: w.a }) : "—") + "</b></div></div>" +
      (h.length > 1 ? '<div class="br-chart" role="img" aria-label="Последние ' + h.length + ' результатов: чем выше столбик, тем лучше">' + bars + "</div>" +
        '<p class="br-chart-note">Последние ' + h.length + " " + L().plural(h.length, "игра", "игры", "игр") + " · чем выше столбик, тем лучше</p>" : "") +
      "</div>";
  }

  /* ---------- Витрина ---------- */
  function totalPlays() { var n = 0; for (var k in B.games) n += (B.games[k] && B.games[k].plays) || 0; return n; }
  /* v10: общее звание — лучшее из званий всех игр; подсказка о следующем — от игры с этим званием */
  function overallTitle() {
    var top = null;
    GAMES.forEach(function (g) {
      if (g.soon || !g.title) return;
      var t = g.title(); if (!t) return;
      if (!top || t.i > top.i || (t.i === top.i && !top.next && t.next)) top = t;
    });
    return top;
  }
  function renderHub() {
    var root = $("brain-root"); if (!root) return;
    var title = overallTitle(), plays = totalPlays();
    var farmLine = window.LZFarm && LZFarm.brainStatus ? LZFarm.brainStatus() : "";
    root.innerHTML =
      '<div class="card center br-head"><span class="pill">Разминка для ума</span>' +
      '<h2 id="brain-title">Тренировка памяти и внимания</h2><div class="gold-line"></div>' +
      "<p>Короткие спокойные игры на внимание и сообразительность. Играйте в своём темпе — несколько минут в день.</p>" +
      (plays ? '<p class="br-rank-line">Ваше звание: <b>' + (title ? title.name : RANKS[0]) + "</b></p>" + (title && title.next ? '<p class="muted br-small">' + title.next + "</p>" : "") +
        '<p class="muted br-small">Сыграно: ' + plays + " " + L().plural(plays, "раз", "раза", "раз") + "</p>" : "") +
      (farmLine ? '<p class="br-farm">🌿 ' + farmLine + "</p>" : "") +
      "</div>" +
      '<div class="br-games">' + GAMES.map(function (g) {
        var inner = '<span class="br-ic">' + (ICONS[g.id] || ICONS.logic) + '</span><span class="br-gt"><b>' + g.n + "</b>" +
          (g.soon ? '<span class="br-soon">скоро</span>' : "") + "<span>" + (g.soon ? g.d : (g.status ? g.status() : g.d)) + "</span></span>";
        return g.soon
          ? '<div class="br-game soon" aria-disabled="true">' + inner + "</div>"
          : '<button class="br-game" data-go="' + g.screen + '" data-brain-game="' + g.id + '">' + inner + '<span class="br-go" aria-hidden="true">›</span></button>';
      }).join("") + "</div>" +
      '<p class="muted center br-small">Новые игры появятся здесь — следите за обновлениями.</p>';
  }
  function homeStatus() {
    var el = $("brain-status"); if (!el) return;
    var t = overallTitle(), b = null;
    if (totalPlays()) b = "Звание: «" + (t ? t.name : RANKS[0]) + "» · Шульте, Словодел";
    el.textContent = b || "Таблица Шульте, Словодел и другие разминки для ума";
  }

  function onShow(name) {
    if (name === "brain") renderHub();
    if (name === "home") homeStatus();
    GAMES.forEach(function (g) { if (g.onShow) g.onShow(name); });
  }

  /* назад по истории; если не получилось (открыли по прямой ссылке) — на указанный экран */
  function back(fallback) {
    var from = L().current(); history.back();
    setTimeout(function () { if (L().current() === from) L().go(fallback || "brain", true); }, 350);
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-brain-back]");
    if (b) { e.preventDefault(); back(b.getAttribute("data-brain-back") || "brain"); }
  });

  window.LZBrain = {
    KEY: KEY, RANKS: RANKS, register: register, record: record, update: update, best: best, title: overallTitle, data: gameData, save: save, history: hist, week: week,
    progressHTML: progressHTML, pref: pref, onShow: onShow, back: back, games: function () { return GAMES; },
    _data: function () { return B; }
  };
})();
