/* Лаборатория здоровья — «Словодел» (v10): составляйте слова из букв одного длинного слова.
   Спокойная игра без таймера. Слова — нарицательные существительные в начальной форме (от 3 букв),
   список ответов для каждого раунда заранее посчитан в js/words-data.js. Буквы «е» и «ё» равны.
   Очки раунда = сумма букв найденных слов. Раунд пройден с первой звездой (★ / ★★ / ★★★ — цели по числу слов).
   Результаты и ход раундов хранит LZBrain (lz_brain_v1 → games.words). */
(function () {
  "use strict";

  var ID = "words";
  var HINTS = 3;           // подсказок на раунд
  var MIN_LEN = 3;
  var $ = function (id) { return document.getElementById(id); };
  function L() { return window.LZ; }
  function BR() { return window.LZBrain; }
  function D() { return window.LZ_WORDS_DATA || { levels: [], rounds: [] }; }
  function norm(w) { return String(w || "").toLowerCase().replace(/ё/g, "е"); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function plural(n, a, b, c) { return L().plural(n, a, b, c); }

  /* ---------- Данные раундов ---------- */
  var ROUNDS = [], BYW = {};
  function prep() {
    if (ROUNDS.length) return;
    D().rounds.forEach(function (r, i) {
      var list = r.a.split(" "), map = {};
      list.forEach(function (w) { map[norm(w)] = w; });
      var x = { i: i, w: r.w, lv: r.lv, list: list, map: map, total: list.length };
      x.goals = goalsFor(r.lv, x.total);
      ROUNDS.push(x); BYW[r.w] = x;
    });
  }
  function level(lv) { return D().levels[lv] || D().levels[0]; }
  /* цели звёзд: по уровню, но не больше разумной доли слов раунда */
  function goalsFor(lv, total) {
    var g = level(lv).goals;
    var t3 = Math.min(g[2], Math.floor(total * 0.75));
    var t2 = Math.min(g[1], Math.floor(total * 0.55), t3 - 1);
    var t1 = Math.min(g[0], Math.max(3, Math.floor(total * 0.35)), t2 - 1);
    return [t1, t2, t3];
  }
  function roundsOf(lv) { prep(); return ROUNDS.filter(function (r) { return r.lv === lv; }); }

  /* ---------- Хранилище (lz_brain_v1 → games.words) ---------- */
  function store() {
    var g = BR().data(ID);
    if (!g.rounds || typeof g.rounds !== "object") g.rounds = {};
    return g;
  }
  function rstate(w) {
    var g = store(), s = g.rounds[w];
    if (!s || typeof s !== "object") s = g.rounds[w] = {};
    if (!Array.isArray(s.f)) s.f = [];
    if (!Array.isArray(s.hw)) s.hw = [];
    s.h = s.h | 0; s.st = s.st | 0; s.ms = s.ms || 0;
    return s;
  }
  function peek(w) { var g = store(); return g.rounds[w] || null; }
  function save() { BR().save(); }
  function curLevel() { var v = +BR().pref("wordsLevel"); return D().levels[v] ? v : 0; }
  function letters(list) { var n = 0; list.forEach(function (w) { n += w.length; }); return n; }
  function starsFor(r, n) { var s = 0; r.goals.forEach(function (g) { if (n >= g) s++; }); return s; }
  function starStr(n, max) { var o = ""; for (var i = 0; i < (max || 3); i++) o += i < n ? "★" : "☆"; return o; }

  /* следующий раунд уровня: начатый и не пройденный → первый не пройденный → первый без трёх звёзд → первый */
  function pickRound(lv) {
    var list = roundsOf(lv), last = BR().pref("wordsRound" + lv), r = last && BYW[last];
    if (r && r.lv === lv) { var s = peek(r.w); if (!s || !s.done) return r; }
    for (var i = 0; i < list.length; i++) { var p = peek(list[i].w); if (!p || !p.done) return list[i]; }
    for (i = 0; i < list.length; i++) { p = peek(list[i].w); if (!p || p.st < 3) return list[i]; }
    return list[0];
  }
  function nextRound(r) {
    var list = roundsOf(r.lv), k = list.indexOf(r);
    for (var j = 1; j <= list.length; j++) { var c = list[(k + j) % list.length], p = peek(c.w); if (!p || !p.done) return c; }
    for (j = 1; j <= list.length; j++) { c = list[(k + j) % list.length]; p = peek(c.w); if (!p || p.st < 3) return c; }
    return list[(k + 1) % list.length];
  }
  function doneCount(lv) {
    var n = 0; ROUNDS.forEach(function (r) { if (lv != null && r.lv !== lv) return; var p = peek(r.w); if (p && p.done) n++; }); return n;
  }
  function starCount() { var n = 0; prep(); ROUNDS.forEach(function (r) { var p = peek(r.w); if (p) n += p.st | 0; }); return n; }

  /* ---------- Звания (общие для разминок) ----------
     «Внимательный» — 3 пройденных раунда; «Зоркий глаз» — 10 раундов, из них 3 средних или сложных;
     «Мастер внимания» — 20 раундов, из них 5 сложных. */
  var RANK_RULES = [null, { n: 3, lv: 0, k: 0 }, { n: 10, lv: 1, k: 3 }, { n: 20, lv: 2, k: 5 }];
  function rankOK(i) {
    var r = RANK_RULES[i]; if (!r) return true;
    var total = doneCount(null), hi = 0;
    ROUNDS.forEach(function (x) { var p = peek(x.w); if (p && p.done && x.lv >= r.lv) hi++; });
    return total >= r.n && hi >= r.k;
  }
  function title() {
    prep();
    if (!doneCount(null)) return null;
    var i = 0; while (i < 3 && rankOK(i + 1)) i++;
    var R = BR().RANKS, next = null;
    if (i < 3) {
      var r = RANK_RULES[i + 1];
      next = "Следующее звание «" + R[i + 1] + "»: пройдите " + r.n + " " + plural(r.n, "раунд", "раунда", "раундов") + " Словодела" +
        (r.k ? ", из них " + r.k + " " + (r.lv === 2 ? "сложных" : "средних или сложных") : "") + ".";
    }
    return { i: i, name: R[i], next: next };
  }
  function status() {
    prep();
    var n = doneCount(null);
    return n ? "Пройдено " + n + " " + plural(n, "раунд", "раунда", "раундов") + " · звёзд: " + starCount() : "Составляйте слова из букв одного длинного слова";
  }
  function fmtEntry(e) { return e.sc + ' <small>' + plural(e.sc, "буква", "буквы", "букв") + (e.m ? " · " + e.m + " " + plural(e.m, "слово", "слова", "слов") : "") + "</small>"; }

  /* ---------- Вступление ---------- */
  function renderIntro() {
    var root = $("words-intro-root"); if (!root) return;
    prep();
    var lv = curLevel(), list = roundsOf(lv), r = pickRound(lv), p = peek(r.w);
    var farm = window.LZFarm && LZFarm.brainStatus ? LZFarm.brainStatus("words") : "";
    var started = p && p.f && p.f.length;
    root.innerHTML =
      '<div class="card center"><span class="pill">Разминка для ума</span>' +
      '<h2 id="wd-intro-title">Словодел</h2><div class="gold-line"></div>' +
      '<p class="wd-rules">Дано одно длинное слово. Составляйте из его букв другие слова — нажимайте плитки с буквами или печатайте на клавиатуре. Каждую букву можно взять столько раз, сколько она встречается в слове.</p>' +
      '<p class="wd-rules muted">Подходят существительные в начальной форме, от 3 букв: «вор», «дверь», «озеро». Буквы «е» и «ё» считаются одной. Спешить некуда — таймера нет, а неудачная попытка ничего не стоит.</p>' +
      '<h3>Уровень</h3><div class="sch-sizes wd-levels" role="radiogroup" aria-label="Уровень">' +
      D().levels.map(function (L2, k) {
        var dn = doneCount(k), all = roundsOf(k).length;
        return '<button class="seg-btn sch-size" role="radio" data-wd-level="' + k + '" aria-checked="' + (k === lv) + '"><b>' + L2.n + "</b><span>" + L2.d + "</span><span>пройдено " + dn + " из " + all + "</span></button>";
      }).join("") + "</div>" +
      '<p class="wd-next">Слово раунда: <b id="wd-next-word">' + r.w.toUpperCase() + "</b>" + (started ? " · найдено " + p.f.length + " из " + r.total : " · " + r.total + " " + plural(r.total, "слово", "слова", "слов") + " спрятано") + "</p>" +
      '<button class="btn btn-primary btn-big wd-start" data-wd-start>' + (started ? "Продолжить" : "Начать") + "</button>" +
      (farm ? '<p class="br-farm">🌿 ' + farm + "</p>" : "") +
      "</div>" +
      '<div class="card"><h3 class="first">Раунды уровня «' + level(lv).n + '»</h3><div class="wd-rounds">' +
      list.map(function (x) {
        var q = peek(x.w), st = q ? q.st | 0 : 0, n = q && q.f ? q.f.length : 0;
        return '<button class="wd-round' + (q && q.done ? " done" : "") + (x === r ? " cur" : "") + '" data-wd-round="' + esc(x.w) + '"><b>' + x.w + "</b><span>" +
          (n ? '<span class="wd-st" aria-label="Звёзд: ' + st + '">' + starStr(st) + "</span> " + n + "/" + x.total : x.total + " " + plural(x.total, "слово", "слова", "слов")) + "</span></button>";
      }).join("") + "</div></div>" +
      '<div class="card">' + BR().progressHTML(ID, lv, fmtEntry, "Ваш прогресс · " + level(lv).n.toLowerCase() + " уровень") + ranksHTML() + "</div>";
  }
  function ranksHTML() {
    var R = BR().RANKS, t = title(), cur = t ? t.i : -1;
    var rows = [[3, "20 раундов, из них 5 сложных"], [2, "10 раундов, из них 3 средних или сложных"], [1, "3 пройденных раунда"], [0, "первый раунд"]];
    return '<h3>Звания в Словоделе</h3><ul class="sch-ranks">' + rows.map(function (x) {
      return "<li" + (x[0] === cur ? ' class="on"' : "") + "><b>" + R[x[0]] + "</b><span>" + x[1] + (x[0] === cur ? " · ваш уровень" : "") + "</span></li>";
    }).join("") + "</ul>";
  }

  /* ---------- Игра ---------- */
  var G = null;   // { r, s, tiles:[{c, used}], pick:[idx], t0 }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function start(w) {
    prep();
    var r = (w && BYW[w]) || pickRound(curLevel());
    BR().pref("wordsLevel", r.lv); BR().pref("wordsRound" + r.lv, r.w);
    var s = rstate(r.w);
    G = { r: r, s: s, tiles: r.w.split("").map(function (c) { return { c: c, used: false }; }), pick: [], t0: Date.now() };
    save();
    L().go("words", true);
    renderPlay();
  }
  function pauseClock() { if (G && G.t0) { G.s.ms = (G.s.ms || 0) + Math.min(Date.now() - G.t0, 30 * 60000); G.t0 = 0; save(); } }
  function resumeClock() { if (G && !G.t0) G.t0 = Date.now(); }

  function renderPlay() {
    var root = $("words-root"); if (!root || !G) return;
    var r = G.r;
    root.innerHTML =
      '<div class="wd-top"><button class="btn-back" data-wd-exit>← К раундам</button>' +
      '<span class="sch-chip wd-chip" id="wd-score-chip">Очки: <b id="wd-score">0</b></span></div>' +
      '<div class="wd-source" aria-label="Слово раунда: ' + r.w + '"><span>Слово раунда</span><b id="wd-source">' + r.w.toUpperCase() + "</b></div>" +
      '<div class="wd-prog"><p class="wd-count" id="wd-count" aria-live="polite"></p><div class="wd-bar" aria-hidden="true"><span id="wd-bar-fill"></span>' +
      r.goals.map(function (g, k) { return '<i class="wd-mark" style="left:' + Math.min(100, g / r.total * 100) + '%"></i>'; }).join("") + "</div>" +
      '<p class="wd-goals" id="wd-goals"></p></div>' +
      '<div class="wd-word" id="wd-word" aria-live="polite"></div>' +
      '<p class="wd-msg" id="wd-msg" role="status" aria-live="polite"></p>' +
      '<div class="wd-tiles" id="wd-tiles" style="--n:' + cols(r.w.length) + '">' +
      G.tiles.map(function (t, i) { return '<button class="wd-tile" data-wd-tile="' + i + '" aria-label="Буква ' + t.c.toUpperCase() + '">' + t.c.toUpperCase() + "</button>"; }).join("") + "</div>" +
      '<div class="wd-actions"><button class="btn btn-ghost wd-act" data-wd-back aria-label="Убрать последнюю букву">←</button>' +
      '<button class="btn btn-ghost wd-act" data-wd-clear>Очистить</button>' +
      '<button class="btn btn-primary wd-act wd-check" data-wd-check>Проверить</button></div>' +
      '<div class="wd-tools"><button class="btn btn-ghost wd-tool" data-wd-hint id="wd-hint-btn"></button>' +
      '<button class="btn btn-ghost wd-tool" data-wd-shuffle>Перемешать буквы</button></div>' +
      '<div class="wd-hints" id="wd-hints"></div>' +
      '<div class="card wd-found-card"><h3 class="first">Найденные слова</h3><ul class="wd-found" id="wd-found"></ul></div>' +
      '<div class="wd-bottom"><button class="btn btn-ghost btn-big" data-wd-restart>Начать это слово заново</button></div>';
    updateWord(); updateHud();
  }
  /* плитки в 2–3 ровных ряда, чтобы буквы были крупными даже на узком экране */
  function cols(n) { return n <= 5 ? n : n <= 14 ? Math.ceil(n / 2) : Math.ceil(n / 3); }
  function curWord() { return G.pick.map(function (i) { return G.tiles[i].c; }).join(""); }
  function updateWord() {
    var w = $("wd-word"); if (!w || !G) return;
    var s = curWord();
    w.innerHTML = s ? s.toUpperCase().split("").map(function (c) { return '<span class="wd-l">' + c + "</span>"; }).join("") : '<span class="wd-ph">Нажимайте буквы</span>';
    w.setAttribute("aria-label", s ? "Составлено: " + s : "Слово пока пустое");
    document.querySelectorAll("[data-wd-tile]").forEach(function (b) {
      var u = G.tiles[+b.getAttribute("data-wd-tile")].used;
      b.classList.toggle("used", u); b.disabled = u; b.setAttribute("aria-pressed", u ? "true" : "false");
    });
  }
  function updateHud() {
    if (!G) return;
    var r = G.r, s = G.s, n = s.f.length, st = starsFor(r, n);
    var c = $("wd-count"); if (c) c.innerHTML = "Найдено <b>" + n + "</b> из <b>" + r.total + "</b> " + plural(r.total, "слова", "слов", "слов") + ' <span class="wd-st" aria-label="Звёзд: ' + st + '">' + starStr(st) + "</span>";
    var f = $("wd-bar-fill"); if (f) f.style.width = Math.min(100, n / r.total * 100) + "%";
    var g = $("wd-goals"); if (g) {
      var nx = r.goals.filter(function (x) { return n < x; })[0];
      g.textContent = nx ? (st ? "До следующей звезды: " : "Чтобы пройти раунд, найдите ") + (st ? (nx - n) + " " + plural(nx - n, "слово", "слова", "слов") : nx + " " + plural(nx, "слово", "слова", "слов")) + " · цели: " + r.goals.join(" / ")
        : n >= r.total ? "Все слова найдены — великолепно!" : "Три звезды! Можно искать дальше — осталось " + (r.total - n) + ".";
    }
    var sc = $("wd-score"); if (sc) sc.textContent = letters(s.f);
    var hb = $("wd-hint-btn"); if (hb) { var left = HINTS - s.h; hb.textContent = "💡 Подсказка (" + left + ")"; hb.disabled = left <= 0 || n >= r.total; }
    var hl = $("wd-hints"); if (hl) {
      var open = s.hw.filter(function (w) { return s.f.indexOf(w) < 0; });
      hl.innerHTML = open.map(function (w) {
        return '<p class="wd-hint">Подсказка: слово на «<b>' + w.charAt(0).toUpperCase() + "</b>», " + w.length + " " + plural(w.length, "буква", "буквы", "букв") +
          ' <span class="wd-hint-mask" aria-hidden="true">' + w.charAt(0).toUpperCase() + new Array(w.length).join(" _") + "</span></p>";
      }).join("");
    }
    var ul = $("wd-found"); if (ul) {
      var sorted = s.f.slice().sort(function (a, b) { return norm(a) < norm(b) ? -1 : norm(a) > norm(b) ? 1 : 0; });
      ul.innerHTML = sorted.length ? sorted.map(function (w) { return '<li data-wd-w="' + esc(w) + '">' + w + "</li>"; }).join("") : '<li class="wd-none">Пока ни одного — начните с коротких слов из трёх-четырёх букв.</li>';
    }
  }
  function msg(text, kind) {
    var m = $("wd-msg"); if (!m) return;
    m.textContent = text; m.className = "wd-msg" + (kind ? " " + kind : "");
    clearTimeout(msg._t); if (text) msg._t = setTimeout(function () { if (m.textContent === text) { m.textContent = ""; m.className = "wd-msg"; } }, 4000);
  }
  function addTile(i) {
    if (!G || G.tiles[i].used) return;
    G.tiles[i].used = true; G.pick.push(i); msg(""); updateWord();
  }
  function backspace() { if (!G || !G.pick.length) return; G.tiles[G.pick.pop()].used = false; updateWord(); }
  function clearWord() { if (!G) return; G.pick.forEach(function (i) { G.tiles[i].used = false; }); G.pick = []; updateWord(); }
  function typeLetter(ch) {
    if (!G) return;
    var c = norm(ch), any = false;
    for (var i = 0; i < G.tiles.length; i++) {
      if (norm(G.tiles[i].c) !== c) continue;
      any = true;
      if (!G.tiles[i].used) { addTile(i); return; }
    }
    shakeWord();
    msg(any ? "Буква «" + ch.toUpperCase() + "» уже использована — в слове их больше нет" : "Буквы «" + ch.toUpperCase() + "» нет в слове раунда", "warn");
  }
  function shakeWord() { var w = $("wd-word"); if (!w) return; w.classList.remove("shake"); void w.offsetWidth; w.classList.add("shake"); setTimeout(function () { w.classList.remove("shake"); }, 400); }
  function check() {
    if (!G) return;
    var raw = curWord(), k = norm(raw), r = G.r, s = G.s;
    if (!raw) { msg("Сначала составьте слово из букв", "warn"); return; }
    if (raw.length < MIN_LEN) { shakeWord(); msg("Нужно слово хотя бы из " + MIN_LEN + " букв", "warn"); return; }
    if (k === norm(r.w)) { shakeWord(); msg("Это само слово раунда — попробуйте найти другие", "warn"); return; }
    var w = r.map[k];
    if (w && s.f.indexOf(w) >= 0) {
      shakeWord(); msg("Слово «" + w + "» уже найдено", "warn");
      var li = document.querySelector('#wd-found [data-wd-w="' + w + '"]'); if (li) { li.classList.remove("again"); void li.offsetWidth; li.classList.add("again"); }
      return;
    }
    if (!w) { shakeWord(); msg("Такого слова нет в нашем словаре", "warn"); return; }
    var before = starsFor(r, s.f.length);
    s.f.push(w); clearWord();
    var after = starsFor(r, s.f.length);
    L().tone(true);
    msg("Есть слово «" + w + "»! +" + w.length + " " + plural(w.length, "очко", "очка", "очков"), "ok");
    var newly = !s.done && after >= 1;
    if (after > s.st) s.st = after;
    save();
    updateHud();
    var li2 = document.querySelector('#wd-found [data-wd-w="' + w + '"]'); if (li2) li2.classList.add("new");
    if (newly) { completeRound(); return; }
    if (s.done) {
      if (s.rec) { var u = BR().update(ID, r.lv, s.rec, { score: letters(s.f), mis: s.f.length }); if (u && u.isBest) s.best = 1; }
      if (after > before) L().toast(after === 3 ? "★★★ Три звезды! Отличная работа" : "★★ Вторая звезда!");
      else if (s.f.length === r.total) L().toast("Все слова раунда найдены — великолепно!");
    }
  }
  function hint() {
    if (!G) return;
    var s = G.s, r = G.r;
    if (s.h >= HINTS) { msg("Подсказки для этого раунда закончились", "warn"); return; }
    var open = s.hw.filter(function (w) { return s.f.indexOf(w) < 0; });
    if (open.length) { msg("Сначала попробуйте отгадать слово из подсказки ниже", "warn"); return; }
    var w = null;
    for (var i = 0; i < r.list.length; i++) if (s.f.indexOf(r.list[i]) < 0 && s.hw.indexOf(r.list[i]) < 0) { w = r.list[i]; break; }
    if (!w) { msg("Все слова уже найдены!", "ok"); return; }
    s.h++; s.hw.push(w); save(); updateHud();
    msg("Подсказка: слово на «" + w.charAt(0).toUpperCase() + "», " + w.length + " " + plural(w.length, "буква", "буквы", "букв"), "ok");
  }
  function reshuffle() {
    if (!G) return;
    clearWord();
    var order = shuffle(G.tiles.map(function (t, i) { return i; }));
    G.tiles = order.map(function (i) { return { c: G.tiles[i].c, used: false }; });
    var box = $("wd-tiles"); if (box) box.innerHTML = G.tiles.map(function (t, i) { return '<button class="wd-tile" data-wd-tile="' + i + '" aria-label="Буква ' + t.c.toUpperCase() + '">' + t.c.toUpperCase() + "</button>"; }).join("");
    updateWord();
  }
  function restartRound() {
    if (!G) return;
    var b = document.querySelector("[data-wd-restart]");
    if (b && !b.classList.contains("confirm")) {   // второе нажатие подтверждает — без системных окон
      b.classList.add("confirm"); b.textContent = "Точно начать заново? Нажмите ещё раз";
      msg("Найденные слова очистятся, а звёзды и рекорды сохранятся", "warn");
      setTimeout(function () { if (b.isConnected) { b.classList.remove("confirm"); b.textContent = "Начать это слово заново"; } }, 5000);
      return;
    }
    G.s.f = []; G.s.hw = []; G.s.h = 0; G.s.done = 0; G.s.rec = 0; G.s.ms = 0; save();
    start(G.r.w);
  }

  /* ---------- Итог раунда ---------- */
  var R = null;
  function completeRound() {
    var r = G.r, s = G.s;
    pauseClock(); resumeClock();
    var sc = letters(s.f);
    var res = BR().record(ID, r.lv, { score: sc, time: s.ms, mis: s.f.length, adj: 0 });
    s.done = 1; s.rec = res.entry.at; s.at = Date.now(); s.cnt = (s.cnt || 0) + 1; save();
    R = { w: r.w, res: res };
    setTimeout(function () { if (L().current() === "words") L().go("words-result", true); }, 900);
  }
  function renderResult() {
    var root = $("words-result-root"); if (!root) return;
    prep();
    if (!R || !BYW[R.w]) { root.innerHTML = '<div class="card center"><p>Результатов пока нет.</p><button class="btn btn-primary btn-big" data-go="words-intro">К Словоделу</button></div>'; return; }
    var r = BYW[R.w], s = rstate(r.w), res = R.res, rw = res.reward || {}, n = s.f.length, st = starsFor(r, n), sc = letters(s.f);
    var head = n >= r.total ? "Все слова найдены! 🎉" : res.isBest && !res.first ? "Новый рекорд! 🎉" : "Раунд пройден!";
    var lines = [];
    if (res.first) lines.push("Первый раунд уровня «" + level(r.lv).n + "» пройден!");
    else if (res.isBest) lines.push("Это ваш лучший раунд на этом уровне. Прошлый рекорд — " + res.prev.sc + " " + plural(res.prev.sc, "буква", "буквы", "букв") + ".");
    else lines.push(["Хорошая разминка! Каждое найденное слово идёт в копилку.", "Отличная работа! Слова прячутся по-разному — это нормально.", "Спасибо за игру! Можно поискать ещё слова и собрать больше звёзд."][Math.floor(Math.random() * 3)]);
    if (st < 3) lines.push("Ещё звёзды: " + r.goals.slice(st).join(" и ") + " " + plural(r.goals[2], "слово", "слова", "слов") + ".");
    var nx = nextRound(r);
    root.innerHTML =
      '<div class="card center wd-res"><span class="pill">Словодел · ' + level(r.lv).n.toLowerCase() + "</span>" +
      '<h2 id="wd-res-title">' + head + '</h2><div class="gold-line"></div>' +
      '<p class="wd-res-word">' + r.w.toUpperCase() + "</p>" +
      '<p class="wd-res-stars" id="wd-res-stars" aria-label="Звёзд: ' + st + ' из 3">' + starStr(st) + "</p>" +
      '<p class="sch-res-line" id="wd-res-line">Найдено ' + n + " из " + r.total + " " + plural(r.total, "слова", "слов", "слов") + "</p>" +
      '<p class="sch-res-score"><b id="wd-res-score">' + sc + "</b> " + plural(sc, "очко", "очка", "очков") + " · по букве за каждую букву найденных слов</p>" +
      '<p class="sch-msg">' + lines.join(" ") + "</p>" +
      (rw.coins ? '<p class="br-farm" id="wd-reward">🌿 В огород: +' + rw.coins + " " + plural(rw.coins, "монета", "монеты", "монет") + " (бонус дня за Словодел)</p>"
        : rw.already ? '<p class="br-farm muted" id="wd-reward">Бонус для огорода за Словодел сегодня уже получен — завтра будет новый.</p>' : "") +
      (n < r.total ? '<button class="btn btn-primary btn-big" data-wd-continue>Искать ещё слова</button>' : "") +
      '<button class="btn ' + (n < r.total ? "btn-ghost" : "btn-primary") + ' btn-big" data-wd-round="' + esc(nx.w) + '">Следующее слово: ' + nx.w + "</button>" +
      '<button class="btn btn-ghost btn-big" data-brain-back="brain">Ко всем играм</button></div>' +
      '<div class="card"><h3 class="first">Найденные слова</h3><ul class="wd-found">' + s.f.slice().sort(function (a, b) { return norm(a) < norm(b) ? -1 : 1; }).map(function (w) { return "<li>" + w + "</li>"; }).join("") + "</ul></div>" +
      '<div class="card">' + BR().progressHTML(ID, r.lv, fmtEntry, "Ваш прогресс · " + level(r.lv).n.toLowerCase() + " уровень") + "</div>";
  }

  /* ---------- События ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target, el;
    if (!t.closest) return;
    if ((el = t.closest("[data-wd-tile]"))) { addTile(+el.getAttribute("data-wd-tile")); return; }
    if (t.closest("[data-wd-back]")) { backspace(); return; }
    if (t.closest("[data-wd-clear]")) { clearWord(); msg(""); return; }
    if (t.closest("[data-wd-check]")) { check(); return; }
    if (t.closest("[data-wd-hint]")) { hint(); return; }
    if (t.closest("[data-wd-shuffle]")) { reshuffle(); return; }
    if (t.closest("[data-wd-restart]")) { restartRound(); return; }
    if ((el = t.closest("[data-wd-level]"))) { BR().pref("wordsLevel", +el.getAttribute("data-wd-level")); renderIntro(); var f = document.querySelector('[data-wd-level="' + curLevel() + '"]'); if (f) f.focus({ preventScroll: true }); return; }
    if ((el = t.closest("[data-wd-round]"))) { start(el.getAttribute("data-wd-round")); return; }
    if (t.closest("[data-wd-start]")) { start(); return; }
    if (t.closest("[data-wd-continue]")) { if (R) start(R.w); return; }
    if (t.closest("[data-wd-exit]")) { pauseClock(); L().go("words-intro", true); return; }
  });
  document.addEventListener("keydown", function (e) {
    if (!G || !L() || L().current() !== "words" || e.ctrlKey || e.metaKey || e.altKey) return;
    var tg = e.target && e.target.tagName;
    if (tg === "INPUT" || tg === "TEXTAREA" || tg === "SELECT") return;
    var k = e.key;
    if (k === "Enter") { if (tg === "BUTTON" && !e.target.closest("[data-wd-tile]")) return; e.preventDefault(); check(); return; }
    if (k === "Backspace") { e.preventDefault(); backspace(); return; }
    if (k === "Escape" || k === "Delete") { clearWord(); msg(""); return; }
    if (k && k.length === 1 && /[а-яё]/i.test(k)) { e.preventDefault(); typeLetter(k.toLowerCase()); return; }
    if (k && k.length === 1 && /[a-z]/i.test(k)) msg("Переключите клавиатуру на русский язык", "warn");
  });
  document.addEventListener("visibilitychange", function () { if (!G) return; if (document.hidden) pauseClock(); else if (L().current() === "words") resumeClock(); });

  function onShow(name) {
    if (name !== "words") { pauseClock(); }
    if (name === "words-intro") renderIntro();
    if (name === "words-result") renderResult();
    if (name === "words") {
      if (!G) { setTimeout(function () { if (L().current() === "words" && !G) L().go("words-intro", true); }, 0); }
      else { resumeClock(); if (!$("wd-tiles")) renderPlay(); }
    }
  }

  if (window.LZBrain) LZBrain.register({ id: ID, n: "Словодел", screen: "words-intro", status: status, title: title, onShow: onShow });
  window.LZWords = { HINTS: HINTS, norm: norm, goalsFor: goalsFor, title: title, rounds: function () { prep(); return ROUNDS; },
    _game: function () { return G; }, _start: start };
})();
