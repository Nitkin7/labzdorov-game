/* Лаборатория здоровья — «Таблица Шульте»: найдите числа по порядку.
   Размеры 3×3 (лёгкий), 4×4 (средний), 5×5 (классика).
   Итог = время + 1 секунда за каждое неверное нажатие. Очки = чисел в минуту × 10.
   Результаты хранит LZBrain (lz_brain_v1). */
(function () {
  "use strict";

  var ID = "schulte";
  var PENALTY = 1000;   // +1 с за неверное нажатие
  var SIZES = {
    3: { n: "3×3", lv: "лёгкий" },
    4: { n: "4×4", lv: "средний" },
    5: { n: "5×5", lv: "классика" }
  };
  /* Пороги званий (итоговое время в секундах, с учётом ошибок): [Внимательный, Зоркий глаз, Мастер внимания].
     Для 5×5 взрослые обычно укладываются в 25–60 с; пороги взяты с запасом, без спешки. */
  var RANK_T = { 3: [22, 15, 10], 4: [45, 30, 21], 5: [75, 50, 35] };
  /* Общее звание растёт с размером таблицы: 3×3 — до «Внимательного», 4×4 — до «Зоркого глаза», 5×5 — до «Мастера внимания». */
  var RANK_CAP = { 3: 1, 4: 2, 5: 3 };

  var $ = function (id) { return document.getElementById(id); };
  function L() { return window.LZ; }
  function BR() { return window.LZBrain; }

  /* ---------- Счёт и звания ---------- */
  function scoreOf(cells, adjMs) { return Math.max(1, Math.round(cells * 600000 / Math.max(adjMs, 1000))); }
  function rankIdx(size, adjMs) {
    var t = adjMs / 1000, r = RANK_T[size], i = 0;
    if (t <= r[0]) i = 1; if (t <= r[1]) i = 2; if (t <= r[2]) i = 3;
    return i;
  }
  function sec(ms) { return (Math.round(ms / 100) / 10).toFixed(1).replace(".", ",") + " с"; }
  function clock(ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function fmtEntry(e) { return sec(e.a) + ' <small>· ' + e.sc + " " + L().plural(e.sc, "очко", "очка", "очков") + "</small>"; }

  function title() {
    var best = -1, have = false;
    [3, 4, 5].forEach(function (s) {
      var b = BR().best(ID, s); if (!b) return; have = true;
      best = Math.max(best, Math.min(rankIdx(s, b.a), RANK_CAP[s]));
    });
    if (!have) return null;
    best = Math.max(best, 0);
    var R = BR().RANKS, nx = best + 1, next = null;
    if (nx < R.length) {
      var size = nx === 1 ? 3 : nx === 2 ? 4 : 5;
      next = "Следующее звание «" + R[nx] + "»: таблица " + SIZES[size].n + " быстрее " + RANK_T[size][nx - 1] + " с.";
    }
    return { i: best, name: R[best], next: next };
  }
  function status() {
    var parts = [];
    [5, 4, 3].forEach(function (s) { var b = BR().best(ID, s); if (b && parts.length < 1) parts.push("Лучшее " + SIZES[s].n + ": " + sec(b.a)); });
    return parts.length ? parts[0] + " · найдите числа по порядку" : "Найдите числа по порядку — разминка для внимания";
  }

  /* ---------- Состояние игры ---------- */
  var G = null, timer = null;
  function size() { var s = +BR().pref("schulteSize"); return SIZES[s] ? s : 3; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function elapsed() { return G ? G.acc + (G.paused || G.done ? 0 : Date.now() - G.t0) : 0; }

  /* ---------- Вступление ---------- */
  function renderIntro() {
    var root = $("schulte-intro-root"); if (!root) return;
    var s = size(), farm = window.LZFarm && LZFarm.brainStatus ? LZFarm.brainStatus(s) : "";
    root.innerHTML =
      '<div class="card center"><span class="pill">Разминка для ума</span>' +
      '<h2 id="sch-intro-title">Таблица Шульте</h2><div class="gold-line"></div>' +
      '<p class="sch-rules">В таблице перемешаны числа. Нажимайте их по порядку — 1, 2, 3… — как можно быстрее. Подсказка сверху покажет, какое число искать.</p>' +
      '<p class="sch-rules muted">Ошибиться не страшно: неверное нажатие добавит всего 1 секунду.</p>' +
      '<h3>Размер таблицы</h3><div class="sch-sizes" role="radiogroup" aria-label="Размер таблицы">' +
      [3, 4, 5].map(function (k) {
        return '<button class="seg-btn sch-size" role="radio" data-sch-size="' + k + '" aria-checked="' + (k === s) + '"><b>' + SIZES[k].n + "</b><span>" + SIZES[k].lv + "</span></button>";
      }).join("") + "</div>" +
      '<button class="btn btn-primary btn-big sch-start" data-sch-start>Начать</button>' +
      (farm ? '<p class="br-farm">🌿 ' + farm + "</p>" : "") +
      "</div>" +
      '<div class="card">' + BR().progressHTML(ID, s, fmtEntry, "Таблица " + SIZES[s].n) + ranksHTML(s) + "</div>";
  }
  function ranksHTML(s) {
    var R = BR().RANKS, t = RANK_T[s], b = BR().best(ID, s), cur = b ? rankIdx(s, b.a) : -1;
    var rows = [[3, "до " + t[2] + " с"], [2, "до " + t[1] + " с"], [1, "до " + t[0] + " с"], [0, "любое время"]];
    return '<h3>Звания для ' + SIZES[s].n + '</h3><ul class="sch-ranks">' + rows.map(function (r) {
      return '<li' + (r[0] === cur ? ' class="on"' : "") + "><b>" + R[r[0]] + "</b><span>" + r[1] + (r[0] === cur ? " · ваш уровень" : "") + "</span></li>";
    }).join("") + "</ul>";
  }

  /* ---------- Игра ---------- */
  function start() {
    var s = size(), cells = s * s, order = [];
    for (var i = 1; i <= cells; i++) order.push(i);
    G = { s: s, cells: cells, grid: shuffle(order), next: 1, mis: 0, t0: Date.now(), acc: 0, paused: false, done: false };
    L().go("schulte", true);
    renderPlay();
    startTimer();
  }
  function renderPlay() {
    var root = $("schulte-root"); if (!root || !G) return;
    root.innerHTML =
      '<div class="sch-top"><button class="btn-back sch-pause-btn" data-sch-pause>⏸ Пауза</button>' +
      '<div class="sch-chips"><span class="sch-chip" aria-label="Время"><span aria-hidden="true">⏱</span> <b id="sch-time">0:00</b></span>' +
      '<span class="sch-chip">Ошибки: <b id="sch-mis">0</b></span></div></div>' +
      '<div class="sch-find" aria-live="polite"><span>Найдите:</span> <b id="sch-next">1</b></div>' +
      '<div class="sch-grid s' + G.s + '" id="sch-grid" style="--n:' + G.s + '">' +
      G.grid.map(function (n) { return '<button class="sch-cell" data-sch-n="' + n + '" aria-label="Число ' + n + '">' + n + "</button>"; }).join("") +
      "</div>" +
      '<p class="sch-found muted center" id="sch-found">Найдено 0 из ' + G.cells + "</p>" +
      '<div class="sch-pause" id="sch-pause" hidden><div class="card center sch-pause-box" role="dialog" aria-modal="true" aria-labelledby="sch-pause-title">' +
      '<h2 id="sch-pause-title" tabindex="-1">Пауза</h2><p>Время остановлено. Отдохните сколько нужно.</p>' +
      '<button class="btn btn-primary btn-big" data-sch-resume>Продолжить</button>' +
      '<button class="btn btn-ghost btn-big" data-sch-restart>Начать заново</button>' +
      '<button class="btn btn-ghost btn-big" data-sch-exit>Выйти к играм</button></div></div>';
    updateHud();
  }
  function updateHud() {
    if (!G) return;
    var t = $("sch-time"); if (t) t.textContent = clock(elapsed() + G.mis * PENALTY);
    var m = $("sch-mis"); if (m) m.textContent = G.mis;
    var n = $("sch-next"); if (n) n.textContent = G.done ? "✓" : G.next;
    var f = $("sch-found"); if (f) f.textContent = "Найдено " + (G.next - 1) + " из " + G.cells + (G.mis ? " · за ошибки +" + G.mis + " с" : "");
  }
  function startTimer() { stopTimer(); timer = setInterval(function () { if (L().current() === "schulte") updateHud(); }, 250); }
  function stopTimer() { if (timer) clearInterval(timer); timer = null; }

  function tap(btn) {
    if (!G || G.paused || G.done) return;
    var n = +btn.getAttribute("data-sch-n");
    if (btn.classList.contains("found")) return;
    if (n === G.next) {
      btn.classList.add("found", "flash"); btn.setAttribute("aria-label", "Число " + n + ", найдено");
      setTimeout(function () { btn.classList.remove("flash"); }, 450);
      G.next++; L().tone(true);
      if (G.next > G.cells) { finish(); return; }
    } else {
      G.mis++;
      btn.classList.remove("wrong"); void btn.offsetWidth; btn.classList.add("wrong");
      setTimeout(function () { btn.classList.remove("wrong"); }, 450);
      L().tone(false);
    }
    updateHud();
  }
  function pause() {
    if (!G || G.done || G.paused) return;
    G.acc += Date.now() - G.t0; G.paused = true;
    var p = $("sch-pause"); if (p) { p.hidden = false; $("sch-pause-title").focus({ preventScroll: true }); }
    document.body.classList.add("sch-paused");
    updateHud();
  }
  function resume() {
    if (!G || !G.paused) return;
    G.paused = false; G.t0 = Date.now();
    var p = $("sch-pause"); if (p) p.hidden = true;
    document.body.classList.remove("sch-paused");
  }
  function abandon() { stopTimer(); if (G && !G.done) G = null; document.body.classList.remove("sch-paused"); }

  /* ---------- Итог ---------- */
  var R = null;
  function finish() {
    G.acc += Date.now() - G.t0; G.done = true; stopTimer(); updateHud();
    var adj = G.acc + G.mis * PENALTY, sc = scoreOf(G.cells, adj);
    var res = BR().record(ID, G.s, { score: sc, time: G.acc, mis: G.mis, adj: adj });
    R = { s: G.s, time: G.acc, mis: G.mis, adj: adj, sc: sc, rank: rankIdx(G.s, adj), res: res };
    setTimeout(function () { if (L().current() === "schulte") { L().go("schulte-result", true); } }, 600);
  }
  function message(r) {
    var res = r.res, out = [];
    if (res.first) out.push("Первый результат для таблицы " + SIZES[r.s].n + " записан! Дальше будет интересно сравнивать.");
    else if (res.isBest) out.push("Это ваш новый личный рекорд! Прошлый лучший — " + sec(res.prev.a) + ".");
    else if (res.week && res.week.n > 1 && r.adj < res.week.a) out.push("Быстрее, чем ваше среднее за неделю. Так держать!");
    else out.push(["Хорошая разминка! Каждая игра идёт в копилку.", "Отличная работа! Результат меняется день ото дня — это нормально.",
      "Спасибо за игру! Иногда вторая попытка идёт ещё легче."][Math.floor(Math.random() * 3)]);
    if (!r.mis) out.push("Ни одной ошибки — отличная точность!");
    return out.join(" ");
  }
  function renderResult() {
    var root = $("schulte-result-root"); if (!root) return;
    if (!R) { root.innerHTML = '<div class="card center"><p>Результатов пока нет.</p><button class="btn btn-primary btn-big" data-go="schulte-intro">К таблице Шульте</button></div>'; return; }
    var r = R, rw = r.res.reward || {}, Rk = BR().RANKS;
    var head = r.res.isBest && !r.res.first ? "Новый рекорд! 🎉" : "Таблица пройдена!";
    root.innerHTML =
      '<div class="card center sch-res"><span class="pill">Таблица ' + SIZES[r.s].n + "</span>" +
      '<h2 id="sch-res-title">' + head + '</h2><div class="gold-line"></div>' +
      '<p class="big-result" id="sch-res-time">' + sec(r.adj) + "</p>" +
      '<p class="sch-res-line">Время ' + sec(r.time) + " · " + (r.mis ? "ошибок: " + r.mis + " (+" + r.mis + " с)" : "без ошибок") + "</p>" +
      '<p class="sch-res-score"><b id="sch-res-score">' + r.sc + "</b> " + L().plural(r.sc, "очко", "очка", "очков") + "</p>" +
      '<div class="sch-rank" id="sch-res-rank"><span class="sch-rank-ic" aria-hidden="true">★</span><span><small>Уровень результата</small><b>' + Rk[r.rank] + "</b></span></div>" +
      '<p class="sch-msg">' + message(r) + "</p>" +
      (rw.coins ? '<p class="br-farm" id="sch-reward">🌿 В огород: +' + rw.coins + " " + L().plural(rw.coins, "монета", "монеты", "монет") + " (бонус дня за " + SIZES[r.s].n + ")</p>"
        : rw.already ? '<p class="br-farm muted" id="sch-reward">Бонус для огорода за ' + SIZES[r.s].n + " сегодня уже получен — завтра будет новый.</p>" : "") +
      '<button class="btn btn-primary btn-big" data-sch-again>Ещё раз</button>' +
      '<button class="btn btn-ghost btn-big" data-sch-other>Другой размер</button>' +
      '<button class="btn btn-ghost btn-big" data-brain-back="brain">Ко всем играм</button></div>' +
      '<div class="card">' + BR().progressHTML(ID, r.s, fmtEntry, "Ваш прогресс · " + SIZES[r.s].n) + "</div>";
  }

  /* ---------- События ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target, el;
    if (!t.closest) return;
    if ((el = t.closest("[data-sch-n]"))) { tap(el); return; }
    if ((el = t.closest("[data-sch-size]"))) { BR().pref("schulteSize", +el.getAttribute("data-sch-size")); renderIntro(); var f = document.querySelector('[data-sch-size="' + size() + '"]'); if (f) f.focus({ preventScroll: true }); return; }
    if (t.closest("[data-sch-start]") || t.closest("[data-sch-again]")) { start(); return; }
    if (t.closest("[data-sch-pause]")) { pause(); return; }
    if (t.closest("[data-sch-resume]")) { resume(); return; }
    if (t.closest("[data-sch-restart]")) { document.body.classList.remove("sch-paused"); start(); return; }
    if (t.closest("[data-sch-exit]")) { abandon(); L().go("schulte-intro", true); return; }
    if (t.closest("[data-sch-other]")) { L().go("schulte-intro", true); return; }
  });
  document.addEventListener("visibilitychange", function () { if (document.hidden && L() && L().current() === "schulte") pause(); });

  function onShow(name) {
    if (name !== "schulte") { abandon(); }
    if (name === "schulte-intro") renderIntro();
    if (name === "schulte-result") renderResult();
    if (name === "schulte" && !G) { setTimeout(function () { if (L().current() === "schulte" && !G) L().go("schulte-intro", true); }, 0); }
  }

  if (window.LZBrain) LZBrain.register({ id: ID, n: "Таблица Шульте", screen: "schulte-intro", status: status, title: title, onShow: onShow });
  window.LZSchulte = { SIZES: SIZES, RANK_T: RANK_T, RANK_CAP: RANK_CAP, PENALTY: PENALTY, scoreOf: scoreOf, rankIdx: rankIdx, title: title,
    _game: function () { return G; } };
})();
