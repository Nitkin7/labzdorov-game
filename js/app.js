/* Лаборатория здоровья — логика игры */
(function () {
  "use strict";

  var D = window.LZ_DATA;
  var STORE_KEY = "lz_game_v1";
  var QUIZ_LEN = 5;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Сохранение ---------- */
  var defaults = {
    points: 0, streak: 0, bestStreak: 0, lastDay: null,
    seen: [], herbRound: 1, font: 1, sound: 0,
    answered: 0, correct: 0, herbsCollected: 0
  };
  var S = load();

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      var s = {}; for (var k in defaults) s[k] = (k in raw) ? raw[k] : defaults[k];
      return s;
    } catch (e) { return JSON.parse(JSON.stringify(defaults)); }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {}
    if (window.Platform) Platform.saveProgress(S);
  }

  /* ---------- Даты ---------- */
  function dayKey(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function yesterdayKey() { var d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); }
  function currentStreak() {
    return (S.lastDay === dayKey() || S.lastDay === yesterdayKey()) ? S.streak : 0;
  }
  function dailyDone() { return S.lastDay === dayKey(); }

  /* ---------- Русские окончания ---------- */
  function plural(n, one, few, many) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }

  /* ---------- Уровни ---------- */
  function levelFloor(l) { return 50 * (l - 1) * l; } // 0, 100, 300, 600, 1000 …
  function levelOf(p) { var l = 1; while (p >= levelFloor(l + 1)) l++; return l; }
  function levelName(l) { return D.levels[Math.min(l - 1, D.levels.length - 1)]; }

  /* ---------- Случайности ---------- */
  function shuffle(a, rnd) {
    rnd = rnd || Math.random; a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function seeded(seed) { // mulberry32
    return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function hashStr(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

  /* ---------- Звук (мягкий, по желанию) ---------- */
  var audioCtx = null;
  function tone(ok) {
    if (!S.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = "sine"; o.frequency.value = ok ? 660 : 300;
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.45);
      o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.5);
    } catch (e) {}
  }

  /* ---------- Подсказки ---------- */
  var toastTimer;
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 3500);
  }
  function confirmBox(text) {
    return new Promise(function (resolve) {
      var m = $("modal"); $("modal-text").textContent = text; m.hidden = false; $("modal-no").focus();
      function done(v) { m.hidden = true; $("modal-yes").onclick = $("modal-no").onclick = null; resolve(v); }
      $("modal-yes").onclick = function () { done(true); };
      $("modal-no").onclick = function () { done(false); };
    });
  }

  /* ---------- Навигация ---------- */
  var current = "home";
  function show(name) {
    var el = $("screen-" + name); if (!el) return;
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("active"); });
    el.classList.add("active"); current = name;
    if (name === "home") renderHome();
    if (name === "quiz-intro") renderQuizIntro();
    if (name === "herbs-intro") renderHerbsIntro();
    if (name === "tip") renderTip();
    if (name === "settings") renderSettings();
    if (window.LZFarm) LZFarm.onShow(name);
    if (window.LZBrain) LZBrain.onShow(name);
    window.scrollTo(0, 0);
    var h = el.querySelector("h1, h2, .riddle"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }
  function go(name, replace) {
    var d = (history.state && history.state.d) || 0;
    if (replace) history.replaceState({ s: name, d: d }, ""); else history.pushState({ s: name, d: name === "home" ? 0 : d + 1 }, "");
    lastState = history.state;
    show(name);
  }
  /* v14: системная кнопка «Назад» (Android в ВК/ОК): сначала закрывает открытое окно,
     потом шаг за шагом возвращает по экранам игры; с главной — выход из приложения. */
  var lastState = null;
  function overlayOpen() {
    var m = $("modal"); if (m && !m.hidden) { $("modal-no").click(); return true; }
    if (window.LZFarm && LZFarm.closeSheet && LZFarm.closeSheet()) return true;
    return false;
  }
  window.addEventListener("popstate", function (e) {
    if (lastState && lastState.s && lastState.s !== "home" && overlayOpen()) {
      history.pushState(lastState, ""); return;   // остаёмся на том же экране
    }
    lastState = e.state;
    show((e.state && e.state.s) || "home");
  });
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-go]");
    if (b) { e.preventDefault(); var t = b.getAttribute("data-go"); if (t === "home") goHome(); else go(t); return; }
    var back = e.target.closest("[data-back]");
    if (back) {
      e.preventDefault();
      if (back.getAttribute("data-back") === "prev") {
        var from = current; history.back();
        setTimeout(function () { if (current === from) go("farm", true); }, 350);
      } else goHome();
    }
  });
  function goHome() {
    var from = current;
    // из огорода возвращаемся на главную сразу, сколько бы экранов ни было открыто до этого
    var d = (history.state && history.state.d) || 0;
    if (history.state && history.state.s && history.state.s !== "home") { if (d > 1 && document.body.classList.contains("farm-mode")) history.go(-d); else history.back(); }
    // подстраховка: если вернуться по истории не удалось (напр. открыли по прямой ссылке)
    setTimeout(function () { if (current === from && current !== "home") go("home", true); }, 350);
  }

  /* ---------- Главная ---------- */
  function renderHome() {
    var lvl = levelOf(S.points), lo = levelFloor(lvl), hi = levelFloor(lvl + 1);
    var pct = Math.round((S.points - lo) / (hi - lo) * 100);
    $("st-points").textContent = S.points;
    $("st-points").nextElementSibling.textContent = plural(S.points, "очко", "очка", "очков");
    $("st-level").textContent = lvl;
    var st = currentStreak();
    $("st-streak").textContent = st;
    $("st-streak-label").textContent = plural(st, "день", "дня", "дней") + " подряд";
    $("st-level-title").textContent = "Уровень " + lvl + ": «" + levelName(lvl) + "»";
    $("st-progress-fill").style.width = pct + "%";
    $("st-progress").setAttribute("aria-valuenow", pct);
    var left = hi - S.points;
    $("st-level-hint").textContent = "До уровня «" + levelName(lvl + 1) + "»: " + left + " " + plural(left, "очко", "очка", "очков");
    $("quiz-status").textContent = dailyDone() ? "Вопросы дня пройдены ✓ Можно сыграть ещё" : QUIZ_LEN + " вопросов дня — сохраните серию!";
    $("herbs-status").textContent = "Сбор №" + S.herbRound + " · " + herbCount(S.herbRound) + " " + plural(herbCount(S.herbRound), "трава", "травы", "трав");
  }

  /* ---------- Правда или миф ---------- */
  var Q = { list: [], i: 0, right: 0, daily: false };

  function renderQuizIntro() {
    $("qi-daily-info").textContent = dailyDone()
      ? "Вопросы дня уже пройдены — отлично! Можно сыграть ещё раз ради знаний и очков."
      : "Пройдите " + QUIZ_LEN + " вопросов дня, чтобы продлить серию. За каждый верный ответ — 10 очков, за весь день — ещё 20.";
  }

  /* Без повторов: S.seen — история показанных вопросов (номера в D.questions),
     от давних к недавним, каждый номер один раз. Сначала берём ещё не показанные;
     когда новые кончаются — только из «старой» половины истории, так что
     недавно показанный вопрос не вернётся, пока не пройдёт большая часть набора. */
  function cleanSeen() {
    var n = D.questions.length, out = [], has = {};
    (Array.isArray(S.seen) ? S.seen : []).forEach(function (i) {
      if (typeof i === "number" && i >= 0 && i < n && i === Math.floor(i)) {
        if (has[i]) out.splice(out.indexOf(i), 1); has[i] = 1; out.push(i);
      }
    });
    S.seen = out;
  }
  function markSeen(idx) {
    var k = S.seen.indexOf(idx); if (k >= 0) S.seen.splice(k, 1);
    S.seen.push(idx);
  }
  function pickQuestions() {
    cleanSeen();
    // Вопросы дня одинаковы в течение дня (детерминированно от даты)
    var rnd = dailyDone() ? Math.random : seeded(hashStr(dayKey()));
    var n = D.questions.length, inSeen = {};
    S.seen.forEach(function (i) { inSeen[i] = 1; });
    var fresh = [];
    for (var i = 0; i < n; i++) if (!inSeen[i]) fresh.push(i);
    var pick = shuffle(fresh, rnd).slice(0, QUIZ_LEN);
    if (pick.length < QUIZ_LEN) {
      // самые давние вопросы: первая половина истории (не меньше, чем нужно)
      var old = S.seen.slice(0, Math.max(QUIZ_LEN * 2, Math.floor(S.seen.length / 2)));
      pick = pick.concat(shuffle(old, rnd).slice(0, QUIZ_LEN - pick.length));
    }
    return pick;
  }

  function startQuiz() {
    Q.list = pickQuestions(); Q.i = 0; Q.right = 0; Q.daily = !dailyDone();
    go("quiz", true); renderQuestion();
  }

  function renderQuestion() {
    var q = D.questions[Q.list[Q.i]];
    markSeen(Q.list[Q.i]); save();
    $("q-counter").textContent = "Вопрос " + (Q.i + 1) + " из " + Q.list.length;
    $("q-topic").textContent = q.t;
    $("q-text").textContent = q.q;
    $("q-feedback").hidden = true;
    document.querySelectorAll(".btn-answer").forEach(function (b) { b.disabled = false; b.classList.remove("chosen", "correct"); });
    $("q-text").focus({ preventScroll: true });
  }

  function answer(val) {
    var idx = Q.list[Q.i], q = D.questions[idx], ok = (val === q.a);
    document.querySelectorAll(".btn-answer").forEach(function (b) {
      b.disabled = true;
      if (String(val) === b.getAttribute("data-answer")) b.classList.add("chosen");
      if (String(q.a) === b.getAttribute("data-answer")) b.classList.add("correct");
    });
    S.answered++;
    if (ok) { Q.right++; S.correct++; S.points += 10; }
    save(); tone(ok);
    var fb = $("q-feedback");
    fb.className = "feedback " + (ok ? "ok" : "bad");
    $("q-result").textContent = (ok ? "Верно! " : "Не совсем. ") + "Это " + (q.a ? "правда." : "миф.") + (ok ? " +10 очков" : "");
    $("q-explain").textContent = q.e;
    $("btn-q-next").textContent = Q.i + 1 < Q.list.length ? "Дальше →" : "Посмотреть итог";
    fb.hidden = false;
    fb.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function nextQuestion() {
    Q.i++;
    if (Q.i < Q.list.length) { renderQuestion(); window.scrollTo(0, 0); return; }
    finishQuiz();
  }

  function finishQuiz() {
    var gained = Q.right * 10, streakMsg = "";
    if (Q.daily && !dailyDone()) {
      S.streak = (S.lastDay === yesterdayKey()) ? S.streak + 1 : 1;
      S.bestStreak = Math.max(S.bestStreak, S.streak);
      S.lastDay = dayKey();
      S.points += 20; gained += 20;
      streakMsg = "🌿 Серия: " + S.streak + " " + plural(S.streak, "день", "дня", "дней") + " подряд! Бонус дня +20 очков.";
    }
    save();
    var coins = (Q.daily && window.LZFarm) ? LZFarm.onQuizDone(Q.right) : 0;
    if (coins) streakMsg += (streakMsg ? " " : "") + "В огород: +" + coins + " " + plural(coins, "монета", "монеты", "монет") + ".";
    var n = Q.list.length;
    $("qr-title").textContent = Q.right === n ? "Великолепно!" : Q.right >= n - 2 ? "Отличный результат!" : "Хорошее начало!";
    $("qr-score").textContent = Q.right + " из " + n;
    $("qr-points").textContent = "+" + gained + " " + plural(gained, "очко", "очка", "очков") + " · всего " + S.points;
    $("qr-streak").textContent = streakMsg || (dailyDone() ? "Возвращайтесь завтра за новыми вопросами дня." : "");
    go("quiz-result", true);
  }

  /* ---------- Собери травяной сбор ---------- */
  var H = { herbs: [], order: [], k: 0, tries: 0, gained: 0 };

  function herbCount(round) { return Math.min(3 + Math.floor((round - 1) / 2), 6); }

  function renderHerbsIntro() {
    var n = herbCount(S.herbRound);
    $("hi-level-info").textContent = "Сбор №" + S.herbRound + ": " + n + " " + plural(n, "трава", "травы", "трав") + ". За угаданную с первого раза траву — 10 очков.";
  }

  function pickHerbs(round) {
    var n = herbCount(round);
    var order = shuffle(D.herbs.map(function (_, i) { return i; }), seeded(1234 + Math.floor((round - 1) * n / D.herbs.length)));
    var start = ((round - 1) * n) % D.herbs.length, res = [];
    for (var i = 0; i < n; i++) res.push(order[(start + i) % order.length]);
    return res;
  }

  function herbIcon(h, size) {
    size = size || 52;
    var c = h.col, svg;
    if (h.c === "flower") {
      var petals = ""; for (var a = 0; a < 360; a += 45) petals += '<ellipse cx="32" cy="17" rx="7" ry="13" fill="' + (h.n === "Ромашка" ? "#fff" : c) + '" stroke="#d9cfa8" stroke-width="1" transform="rotate(' + a + ' 32 32)"/>';
      svg = petals + '<circle cx="32" cy="32" r="9" fill="' + (h.n === "Ромашка" ? "#f2c230" : "#9a6a1a") + '"/>';
    } else if (h.c === "berry") {
      svg = '<path d="M32 8 C30 18 24 22 20 26" stroke="#3f7d35" stroke-width="3" fill="none"/><path d="M34 10 C42 8 50 12 52 18 C44 20 38 16 34 10Z" fill="#5a9a40"/>' +
        '<circle cx="22" cy="38" r="11" fill="' + c + '"/><circle cx="40" cy="42" r="11" fill="' + c + '"/><circle cx="30" cy="52" r="9" fill="' + c + '"/>' +
        '<circle cx="19" cy="34" r="3" fill="#fff" opacity=".5"/><circle cx="37" cy="38" r="3" fill="#fff" opacity=".5"/>';
    } else if (h.c === "root") {
      svg = '<path d="M30 6 C24 14 22 20 28 24 M34 6 C40 14 42 20 36 24" stroke="#4f8a3a" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        '<path d="M22 26 C26 22 38 22 42 26 C44 36 38 48 32 58 C26 48 20 36 22 26Z" fill="' + c + '"/>' +
        '<path d="M26 34 h8 M30 42 h7" stroke="#6b4a22" stroke-width="2" stroke-linecap="round"/>';
    } else if (h.c === "sprig") {
      svg = '<path d="M32 60 V8" stroke="#4f7d2e" stroke-width="3"/>';
      for (var y = 12; y < 54; y += 9) svg += '<ellipse cx="24" cy="' + (y + 3) + '" rx="8" ry="4" fill="' + c + '" transform="rotate(-25 24 ' + (y + 3) + ')"/><ellipse cx="40" cy="' + y + '" rx="8" ry="4" fill="' + c + '" transform="rotate(25 40 ' + y + ')"/>';
    } else {
      svg = '<path d="M32 4 C50 14 54 34 32 58 C10 34 14 14 32 4Z" fill="' + c + '"/><path d="M32 10 V56 M32 24 L22 18 M32 24 L42 18 M32 36 L20 30 M32 36 L44 30" stroke="#e8f2d8" stroke-width="2" fill="none" opacity=".8"/>';
    }
    return '<svg class="leaf" viewBox="0 0 64 64" width="' + size + '" height="' + size + '" aria-hidden="true">' + svg + "</svg>";
  }

  function startHerbs() {
    H.herbs = pickHerbs(S.herbRound);
    H.order = shuffle(H.herbs); H.k = 0; H.tries = 0; H.gained = 0; H.done = [];
    $("h-counter").textContent = "Сбор №" + S.herbRound;
    var grid = $("h-grid"); grid.innerHTML = "";
    shuffle(H.herbs).forEach(function (i) {
      var b = document.createElement("button");
      b.className = "herb-btn"; b.setAttribute("data-herb", i);
      b.innerHTML = herbIcon(D.herbs[i]) + "<span>" + D.herbs[i].n + "</span>";
      grid.appendChild(b);
    });
    $("h-jar").innerHTML = "";
    go("herbs", true); renderRiddle();
  }

  function renderRiddle() {
    var h = D.herbs[H.order[H.k]];
    $("h-desc").textContent = h.d;
    $("h-hint").textContent = ""; $("h-hint").className = "hint";
    H.tries = 0;
  }

  function pickHerb(btn) {
    if (btn.classList.contains("done")) return;
    var chosen = +btn.getAttribute("data-herb"), target = H.order[H.k];
    document.querySelectorAll(".herb-btn.wrong").forEach(function (b) { b.classList.remove("wrong"); });
    if (chosen === target) {
      var pts = H.tries === 0 ? 10 : 5;
      S.points += pts; H.gained += pts; S.herbsCollected++; save(); tone(true);
      btn.classList.add("done"); btn.disabled = true;
      btn.querySelector("span").textContent = D.herbs[chosen].n + " ✓";
      $("h-jar").insertAdjacentHTML("beforeend", herbIcon(D.herbs[chosen], 30));
      $("h-hint").className = "hint ok";
      $("h-hint").textContent = "Верно, это " + D.herbs[chosen].n.toLowerCase() + "! +" + pts + " " + plural(pts, "очко", "очка", "очков");
      H.k++;
      if (H.k >= H.order.length) { setTimeout(finishHerbs, 1100); }
      else setTimeout(renderRiddle, 1300);
    } else {
      H.tries++; tone(false);
      btn.classList.add("wrong");
      $("h-hint").className = "hint";
      $("h-hint").textContent = "Не совсем: " + D.herbs[chosen].n.toLowerCase() + " — " + D.herbs[chosen].f + " Попробуйте ещё.";
    }
  }

  function finishHerbs() {
    S.points += 10; H.gained += 10;
    var round = S.herbRound; S.herbRound++; save();
    $("hr-title").textContent = "Сбор №" + round + " собран!";
    $("hr-points").textContent = "+" + H.gained + " " + plural(H.gained, "очко", "очка", "очков") + " (включая бонус за сбор +10)";
    $("hr-list").innerHTML = H.herbs.map(function (i) { var h = D.herbs[i]; return "<li><b>" + h.n + "</b> — " + h.f + "</li>"; }).join("");
    go("herbs-result", true);
  }

  /* ---------- Совет дня ---------- */
  function renderTip() {
    var start = new Date(2026, 0, 1), days = Math.floor((new Date() - start) / 864e5);
    var tip = D.tips[((days % D.tips.length) + D.tips.length) % D.tips.length];
    $("tip-title").textContent = tip.h; $("tip-text").textContent = tip.t;
  }

  /* ---------- Настройки ---------- */
  function applyFont() {
    document.documentElement.classList.remove("fs-2", "fs-3");
    if (S.font > 1) document.documentElement.classList.add("fs-" + S.font);
  }
  function renderSettings() {
    document.querySelectorAll("[data-font]").forEach(function (b) { b.setAttribute("aria-checked", String(+b.getAttribute("data-font") === S.font)); });
    document.querySelectorAll("[data-sound]").forEach(function (b) { b.setAttribute("aria-checked", String(+b.getAttribute("data-sound") === S.sound)); });
  }

  /* ---------- Поделиться ---------- */
  function share(text) {
    Platform.share(text).then(function (r) {
      if (r === "copied") toast("Текст скопирован — вставьте его в сообщение друзьям.");
      else if (r === "failed") toast("Не получилось поделиться на этом устройстве.");
    });
  }

  /* ---------- События ---------- */
  $("btn-quiz-start").onclick = startQuiz;
  $("btn-quiz-again").onclick = startQuiz;
  $("btn-q-next").onclick = nextQuestion;
  document.querySelectorAll(".btn-answer").forEach(function (b) {
    b.onclick = function () { answer(b.getAttribute("data-answer") === "true"); };
  });
  $("btn-herbs-start").onclick = startHerbs;
  $("btn-herbs-next").onclick = startHerbs;
  $("h-grid").addEventListener("click", function (e) { var b = e.target.closest(".herb-btn"); if (b) pickHerb(b); });
  $("btn-share-quiz").onclick = function () {
    share("Мой результат в игре «Правда или миф» от «Лаборатории здоровья»: " + $("qr-score").textContent + "! Попробуйте и вы.");
  };
  $("btn-share-tip").onclick = function () { share("Совет дня от «Лаборатории здоровья»: " + $("tip-text").textContent); };
  document.querySelectorAll("[data-font]").forEach(function (b) {
    b.onclick = function () { S.font = +b.getAttribute("data-font"); save(); applyFont(); renderSettings(); };
  });
  document.querySelectorAll("[data-sound]").forEach(function (b) {
    b.onclick = function () { S.sound = +b.getAttribute("data-sound"); save(); renderSettings(); tone(true); };
  });
  $("btn-reset").onclick = function () {
    confirmBox("Сбросить очки, уровень, серию дней и весь огород? Это нельзя отменить.").then(function (yes) {
      if (!yes) return;
      var font = S.font, sound = S.sound;
      S = JSON.parse(JSON.stringify(defaults)); S.font = font; S.sound = sound; save();
      if (window.LZFarm) LZFarm.reset();
      toast("Прогресс сброшен. Начинаем заново!");
    });
  };

  /* ---------- Общий доступ для огорода ---------- */
  window.LZ = { go: go, show: show, toast: toast, plural: plural, tone: tone, dayKey: dayKey, yesterdayKey: yesterdayKey,
    current: function () { return current; } };
  if (window.LZFarm) LZFarm.bind();

  /* ---------- Запуск ---------- */
  applyFont();
  history.replaceState({ s: "home" }, "");
  lastState = history.state;
  show("home");
  if (window.Platform) Platform.init();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
})();
