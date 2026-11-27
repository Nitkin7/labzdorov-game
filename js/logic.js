/* Лаборатория здоровья — «Логические задачи». Прогресс: lz_logic_v1. */
(function () {
  "use strict";
  var DATA = window.LZ_PUZZLES;
  var KEY = "lz_logic_v1";
  var clockTimer = 0;
  var state = load();
  var view = { name: "hub" };
  function L() { return window.LZ; }

  var NAMES = { logic: "Логическая таблица", sudoku: "Судоку", kakuro: "Какуро", pattern: "Закономерности" };

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!raw || typeof raw !== "object") raw = {};
    } catch (e) { raw = {}; }
    raw.v = 1;
    raw.at = raw.at || 0;
    raw.done = raw.done || {};
    raw.best = raw.best || {};
    raw.showTime = !!raw.showTime;
    raw.sound = raw.sound !== false;
    raw.errors = !!raw.errors;
    ["logic", "sudoku", "kakuro", "pattern"].forEach(function (id) {
      if (!Array.isArray(raw.done[id])) raw.done[id] = [];
    });
    return raw;
  }
  function persist() {
    state.at = Date.now();
    var text = JSON.stringify(state);
    try { localStorage.setItem(KEY, text); } catch (e) {}
    if (window.vkBridge && vkBridge.send && text.length <= 4096) {
      vkBridge.send("VKWebAppStorageSet", { key: KEY, value: text }).catch(function () {});
    }
  }
  function pullCloud(done) {
    if (!(window.vkBridge && vkBridge.send)) { done(); return; }
    vkBridge.send("VKWebAppStorageGet", { keys: [KEY] }).then(function (res) {
      var row = ((res && res.keys) || []).filter(function (k) { return k.key === KEY; })[0];
      if (row && row.value) {
        try {
          var remote = JSON.parse(row.value);
          if (remote && remote.at > (state.at || 0)) {
            localStorage.setItem(KEY, row.value);
            state = load();
          }
        } catch (e) {}
      }
      done();
    }, function () { done(); });
  }
  function toast(msg) { if (L()) L().toast(msg); }
  function tone(ok) {
    if (!state.sound) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      var ctx = tone.ctx || (tone.ctx = new Ctx());
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = ok ? 523 : 196;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.04, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.18);
    } catch (e) {}
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fig(cell) {
    var bits = "";
    for (var i = 0; i < cell.n; i++) bits += '<i class="fig ' + cell.s + " " + cell.f + '" style="width:14px;height:14px"></i>';
    return '<span class="figbox">' + bits + "</span>";
  }
  function fmt(ms) {
    var s = Math.round(ms / 1000), m = (s / 60) | 0;
    return m + ":" + String(s % 60).padStart(2, "0");
  }
  function dayIndex() {
    var days = Math.floor((new Date() - new Date(2026, 0, 1)) / 864e5);
    return ((days % 60) + 60) % 60;
  }
  function dailyRef() {
    var ids = ["logic", "sudoku", "kakuro", "pattern"];
    var n = dayIndex();
    return { id: ids[(n / 15) | 0], level: n % 15 };
  }
  function bestKey() { return view.id + ":" + view.level; }
  function elapsed() { return Date.now() - (view.t0 || Date.now()); }

  function rootEl() {
    if (view.name === "win") return document.getElementById("logic-result-root");
    if (view.name === "logic" || view.name === "sudoku" || view.name === "kakuro" || view.name === "pattern") return document.getElementById("logic-play-root");
    return document.getElementById("logic-intro-root");
  }
  function html(s) {
    var root = rootEl();
    if (!root) return;
    root.innerHTML = s;
    bind(root);
  }
  function bind(root) {
    root.querySelectorAll("[data-act]").forEach(function (node) {
      node.addEventListener("click", function () { act(node.getAttribute("data-act"), node); });
    });
  }
  function screenFor(name) {
    if (name === "win") return "logic-result";
    if (name === "logic" || name === "sudoku" || name === "kakuro" || name === "pattern") return "logic";
    return "logic-intro";
  }
  function reveal() {
    var name = screenFor(view.name);
    if (L() && L().current && L().current() !== name) L().go(name, name === "logic-result");
    else render();
  }
  function tools() {
    return '<div class="tools">' +
      '<button class="btn' + (state.showTime ? " on" : "") + '" type="button" data-act="time">Время</button>' +
      '<button class="btn' + (state.sound ? " on" : "") + '" type="button" data-act="sound">Звук</button>' +
      '<button class="btn" type="button" data-act="hint">Подсказка ' + (view.hintsLeft == null ? "" : view.hintsLeft) + "</button>" +
      (view.undo ? '<button class="btn" type="button" data-act="undo">Отменить</button>' : "") +
      (view.id === "sudoku" ? '<button class="btn' + (state.errors ? " on" : "") + '" type="button" data-act="errors">Ошибки</button><button class="btn' + (view.notes ? " on" : "") + '" type="button" data-act="notes">Карандаш</button>' : "") +
      "</div>";
  }
  function head(title) {
    var clock = state.showTime ? '<div class="msg" id="clock">' + fmt(elapsed()) + "</div>" : "";
    return '<div class="top"><button class="btn" type="button" data-act="back">← Назад</button><b>' + title + "</b></div>" + clock;
  }

  function render() {
    document.body.classList.toggle("lg-play", view.name === "logic" || view.name === "sudoku" || view.name === "kakuro" || view.name === "pattern" || view.name === "win");
    clearInterval(clockTimer);
    if (view.name === "hub") renderHub();
    else if (view.name === "levels") renderLevels();
    else if (view.name === "logic") renderLogic();
    else if (view.name === "sudoku") renderSudoku();
    else if (view.name === "kakuro") renderKakuro();
    else if (view.name === "pattern") renderPattern();
    else if (view.name === "win") renderWin();
    if (state.showTime && view.t0 && view.name !== "hub" && view.name !== "levels" && view.name !== "win") {
      clockTimer = setInterval(function () {
        var el = document.getElementById("clock");
        if (el) el.textContent = fmt(elapsed());
      }, 400);
    }
  }
  function renderHub() {
    var d = dailyRef();
    var doneDaily = state.daily === dayStamp() && state.dailyId === d.id + ":" + d.level;
    html(
      '<h1 id="lg-intro-title">Логические задачи</h1><div class="gold"></div>' +
      '<p class="note">Таблицы, судоку, какуро и ряды. Без спешки и без штрафа за ошибку.</p>' +
      '<div class="tools"><button class="btn' + (state.sound ? " on" : "") + '" type="button" data-act="sound">Звук</button>' +
      '<button class="btn' + (state.showTime ? " on" : "") + '" type="button" data-act="time">Время</button></div>' +
      '<button class="card daily" type="button" data-act="daily"><b>Задача дня</b><br>' + NAMES[d.id] + ", ступень " + (d.level + 1) +
      (doneDaily ? " · уже решена" : " · одна на сегодня") + "</button>" +
      '<div class="games">' + card("logic", "Дома, дела, города и годы. Отметьте клетка за клеткой.") +
      card("sudoku", "Поле 6×6, затем 9×9. Карандаш, отмена, подсветка ошибок.") +
      card("kakuro", "Суммы по рядам. Цифры не повторяются. Клетки крупные.") +
      card("pattern", "Ряды, аналогии и фигуры. Правила не с первого взгляда.") + "</div>"
    );
  }
  function card(id, text) {
    var n = state.done[id].filter(Boolean).length;
    return '<button class="game" type="button" data-act="open" data-id="' + id + '"><b>' + NAMES[id] + "</b><span>" + text +
      '</span><br><em>Пройдено ' + n + " из 15</em></button>";
  }
  function renderLevels() {
    var buttons = "";
    for (var i = 0; i < 15; i++) {
      var best = state.best[view.id + ":" + i];
      buttons += '<button class="lv' + (state.done[view.id][i] ? " done" : "") + '" type="button" data-act="level" data-n="' + i + '">' +
        (i + 1) + (best ? "<small>" + fmt(best) + "</small>" : "") + "</button>";
    }
    html(head(NAMES[view.id]) + '<p class="note">От лёгких к трудным. Время можно скрыть — лучшее всё равно запомнится.</p><div class="levels">' + buttons + "</div>");
  }

  function start(id, level) {
    var puzzle = DATA[id][level];
    view = { name: id, id: id, level: level, hintsLeft: 3, t0: Date.now(), undo: [], notes: false, clue: "" };
    if (id === "logic") {
      view.mark = puzzle.cats.map(function (cat) { return cat.values.map(function () { return -1; }); });
      view.no = puzzle.cats.map(function (cat) { return cat.values.map(function () { return {}; }); });
    } else if (id === "sudoku") {
      view.grid = puzzle.givens.split("").map(Number);
      view.given = view.grid.map(function (n) { return n > 0; });
      view.pencil = view.grid.map(function () { return {}; });
      view.sel = 0;
      while (view.given[view.sel]) view.sel = (view.sel + 1) % view.grid.length;
    } else if (id === "kakuro") {
      view.grid = puzzle.solution.split("").map(function () { return 0; });
      view.sel = 0;
    } else if (id === "pattern") {
      view.hidden = {};
    }
    reveal();
  }
  function snapshot() {
    view.undo.push(JSON.stringify({
      mark: view.mark, no: view.no, grid: view.grid, pencil: view.pencil, sel: view.sel, hidden: view.hidden
    }));
    if (view.undo.length > 40) view.undo.shift();
  }

  function renderLogic() {
    var p = DATA.logic[view.level];
    var cols = p.n;
    var body = p.cats.map(function (cat, ci) {
      var rows = cat.values.map(function (val, vi) {
        var cells = "";
        for (var h = 0; h < p.n; h++) {
          var cls = "cell";
          if (view.mark[ci][vi] === h) cls += " yes";
          else if (view.no[ci][vi][h]) cls += " no";
          cells += '<button class="' + cls + '" type="button" data-act="logic" data-c="' + ci + '" data-v="' + vi + '" data-h="' + h + '">' +
            (view.mark[ci][vi] === h ? "✓" : view.no[ci][vi][h] ? "✗" : "") + "</button>";
        }
        return "<div>" + val + "</div>" + cells;
      }).join("");
      return '<div class="group"><h3>' + esc(cat.title) + '</h3><div class="grid logic-grid" style="grid-template-columns:92px repeat(' + cols + ',1fr)">' +
        '<div></div>' + rangeLabels(p.n) + rows + "</div></div>";
    }).join("");
    html(head((view.level + 1) + " из 15") + tools() +
      '<div class="card clues"><ol>' + p.clues.map(function (c) { return "<li>" + esc(c.text) + "</li>"; }).join("") + "</ol></div>" +
      '<p class="msg">' + esc(view.clue || "Пусто → ✓ → ✗. В каждом ряду одна галочка.") + "</p>" + body +
      '<button class="btn gold" type="button" data-act="check">Проверить</button>');
  }
  function rangeLabels(n) {
    var s = "";
    for (var i = 1; i <= n; i++) s += '<div class="msg">Дом ' + i + "</div>";
    return s;
  }
  function renderSudoku() {
    var p = DATA.sudoku[view.level];
    var n = p.size;
    var cells = view.grid.map(function (v, i) {
      var cls = "cell" + (view.given[i] ? " given" : "") + (view.sel === i ? " on" : "");
      if (state.errors && !view.given[i] && v && conflict(i, v, n, p.br, p.bc)) cls += " bad";
      var inner = v ? String(v) : noteText(view.pencil[i]);
      return '<button class="' + cls + '" type="button" data-act="cell" data-n="' + i + '"' + (view.given[i] ? " disabled" : "") + ">" + inner + "</button>";
    }).join("");
    var pad = "";
    for (var d = 1; d <= n; d++) pad += '<button type="button" data-act="digit" data-n="' + d + '">' + d + "</button>";
    pad += '<button type="button" data-act="digit" data-n="0">×</button>';
    html(head(n + "×" + n + " · " + (view.level + 1) + " / 15") + tools() +
      '<p class="msg">' + esc(view.clue || (view.notes ? "Карандаш: пометки в клетке." : "Выберите клетку и цифру.")) + "</p>" +
      '<div class="grid" style="grid-template-columns:repeat(' + n + ",1fr);width:" + (n === 9 ? "100%" : "min(100%,340px)") + '">' + cells + "</div>" +
      '<div class="pad">' + pad + "</div>");
  }
  function noteText(map) {
    var list = [];
    Object.keys(map).forEach(function (k) { if (map[k]) list.push(k); });
    if (!list.length) return "";
    return '<span class="notes">' + list.join(" ") + "</span>";
  }
  function conflict(i, v, n, br, bc) {
    var r = (i / n) | 0, c = i % n, k, rr, cc;
    for (k = 0; k < n; k++) {
      if (k !== c && view.grid[r * n + k] === v) return true;
      if (k !== r && view.grid[k * n + c] === v) return true;
    }
    var r0 = ((r / br) | 0) * br, c0 = ((c / bc) | 0) * bc;
    for (rr = 0; rr < br; rr++) for (cc = 0; cc < bc; cc++) {
      var j = (r0 + rr) * n + c0 + cc;
      if (j !== i && view.grid[j] === v) return true;
    }
    return false;
  }
  function renderKakuro() {
    var p = DATA.kakuro[view.level];
    var lines = p.runs.map(function (run) {
      var a = run.cells[0], b = run.cells[1];
      var across = a[0] === b[0];
      return "<li>" + (across ? "Вправо" : "Вниз") + " от ряда " + (a[0] + 1) + ", столбца " + (a[1] + 1) +
        ": сумма <b>" + run.sum + "</b>, клеток " + run.idx.length + ".</li>";
    }).join("");
    var cells = "";
    for (var r = 0; r < p.h; r++) {
      for (var c = 0; c < p.w; c++) {
        var ix = -1;
        for (var i = 0; i < p.whites.length; i++) if (p.whites[i][0] === r && p.whites[i][1] === c) ix = i;
        if (ix < 0) cells += '<div class="kcell block"></div>';
        else cells += '<button class="cell' + (view.sel === ix ? " on" : "") + '" type="button" data-act="kcell" data-n="' + ix + '">' +
          (view.grid[ix] || "") + "</button>";
      }
    }
    var pad = "";
    for (var d = 1; d <= 9; d++) pad += '<button type="button" data-act="kdigit" data-n="' + d + '">' + d + "</button>";
    pad += '<button type="button" data-act="kdigit" data-n="0">×</button>';
    html(head("Какуро · " + (view.level + 1) + " / 15") + tools() +
      '<div class="card clues"><ol>' + lines + "</ol></div>" +
      '<p class="msg">' + esc(view.clue || "Цифры от 1 до 9, в одном ряду без повторов.") + "</p>" +
      '<div class="grid kgrid" style="grid-template-columns:repeat(' + p.w + ',1fr);width:min(100%,300px)">' + cells + "</div>" +
      '<div class="pad">' + pad + "</div>" +
      '<button class="btn gold" type="button" data-act="check">Проверить</button>');
  }
  function renderPattern() {
    var p = DATA.pattern[view.level];
    var body = "";
    if (p.kind === "series") {
      body = '<div class="chips">' + p.seq.map(function (n) { return '<span class="chip">' + n + "</span>"; }).join("") + '<span class="chip">?</span></div>';
    } else if (p.kind === "analogy") {
      body = '<h2>' + esc(p.left) + " : " + esc(p.pair) + " = " + esc(p.right) + " : ?</h2>";
    } else {
      var boxes = p.cells.map(fig).join("") + '<span class="figbox">?</span>';
      body = '<div class="matrix">' + boxes + "</div>";
    }
    var choices = p.choices.map(function (c, i) {
      if (view.hidden[i]) return "";
      var label = p.kind === "matrix" ? fig(c) : esc(c);
      return '<button class="choice" type="button" data-act="pick" data-n="' + i + '">' + label + "</button>";
    }).join("");
    html(head((view.level + 1) + " из 15") + tools() + body + '<p class="msg">' + esc(view.clue || "") + "</p>" + choices);
  }
  function renderWin() {
    var best = state.best[bestKey()];
    html(head("Верно") + '<div class="card"><h2>' + NAMES[view.id] + ", ступень " + (view.level + 1) + "</h2>" +
      '<p class="why">' + esc(view.why || "Решение сходится.") + "</p>" +
      "<p>Время: " + fmt(view.spent || 0) + (best ? ". Лучшее: " + fmt(best) : "") + ".</p>" +
      '<p id="lg-reward">' + esc(view.reward || "") + "</p>" +
      (view.wasDaily ? '<button class="btn gold" type="button" data-act="share">Поделиться задачей дня</button>' : "") +
      '<button class="btn gold" type="button" data-act="next">Дальше</button></div>');
  }

  function act(name, node) {
    if (name === "sound") { state.sound = !state.sound; persist(); render(); return; }
    if (name === "time") { state.showTime = !state.showTime; persist(); render(); return; }
    if (name === "errors") { state.errors = !state.errors; persist(); render(); return; }
    if (name === "notes") { view.notes = !view.notes; render(); return; }
    if (name === "back") {
      if (view.name === "levels") { view = { name: "hub" }; render(); return; }
      if (view.name === "hub") { if (L()) L().go("brain"); return; }
      var backId = view.id;
      view = { name: "levels", id: backId };
      if (L() && L().current && L().current() !== "logic-intro") L().go("logic-intro");
      else render();
      return;
    }
    if (name === "open") { view = { name: "levels", id: node.getAttribute("data-id") }; render(); return; }
    if (name === "daily") { var d = dailyRef(); start(d.id, d.level); return; }
    if (name === "level") { start(view.id, +node.getAttribute("data-n")); return; }
    if (name === "undo") return undo();
    if (name === "hint") return hint();
    if (name === "logic") return tapLogic(node);
    if (name === "cell") { view.sel = +node.getAttribute("data-n"); render(); return; }
    if (name === "digit") return putDigit(+node.getAttribute("data-n"));
    if (name === "kcell") { view.sel = +node.getAttribute("data-n"); render(); return; }
    if (name === "kdigit") return putKakuro(+node.getAttribute("data-n"));
    if (name === "check") return check();
    if (name === "pick") return pick(+node.getAttribute("data-n"));
    if (name === "next") {
      if (view.level < 14) start(view.id, view.level + 1);
      else { var id = view.id; view = { name: "levels", id: id }; if (L()) L().go("logic-intro"); else render(); }
      return;
    }
    if (name === "share") share();
  }
  function undo() {
    if (!view.undo || !view.undo.length) return;
    var prev = JSON.parse(view.undo.pop());
    ["mark", "no", "grid", "pencil", "sel", "hidden"].forEach(function (k) { if (prev[k] != null) view[k] = prev[k]; });
    render();
  }
  function tapLogic(node) {
    snapshot();
    var ci = +node.getAttribute("data-c"), vi = +node.getAttribute("data-v"), h = +node.getAttribute("data-h");
    if (view.mark[ci][vi] === h) { view.mark[ci][vi] = -1; view.no[ci][vi][h] = true; }
    else if (view.no[ci][vi][h]) view.no[ci][vi][h] = false;
    else {
      view.mark[ci][vi] = h;
      for (var v = 0; v < view.mark[ci].length; v++) if (v !== vi && view.mark[ci][v] === h) view.mark[ci][v] = -1;
    }
    render();
  }
  function putDigit(n) {
    if (view.given[view.sel]) return;
    snapshot();
    if (view.notes && n) {
      view.pencil[view.sel][n] = !view.pencil[view.sel][n];
      view.grid[view.sel] = 0;
    } else {
      view.grid[view.sel] = n;
      view.pencil[view.sel] = {};
      if (n) moveSel();
    }
    if (n && view.grid.every(function (v, i) { return view.given[i] || v; }) && view.grid.every(Boolean)) {
      var sol = DATA.sudoku[view.level].solution;
      if (view.grid.join("") === sol) return win("Все цифры встали по правилам поля.");
    }
    render();
  }
  function moveSel() {
    var n = view.grid.length, i = view.sel;
    for (var k = 0; k < n; k++) {
      i = (i + 1) % n;
      if (!view.given[i] && !view.grid[i]) { view.sel = i; return; }
    }
  }
  function putKakuro(n) {
    snapshot();
    view.grid[view.sel] = n;
    render();
  }
  function check() {
    if (view.id === "logic") {
      var p = DATA.logic[view.level];
      for (var ci = 0; ci < p.cats.length; ci++) {
        for (var vi = 0; vi < p.cats[ci].values.length; vi++) {
          if (view.mark[ci][vi] !== p.solution[ci][vi]) {
            view.clue = "Пока не сходится. Галочка не на том доме.";
            tone(false); render(); return;
          }
        }
      }
      return win("Каждое имя, дело, город и год стоят в своём доме.");
    }
    if (view.id === "kakuro") {
      var pk = DATA.kakuro[view.level];
      if (view.grid.join("") !== pk.solution) {
        view.clue = "Сумма или повтор цифры ещё не сходятся.";
        tone(false); render(); return;
      }
      return win("Суммы сошлись, цифры в рядах не повторяются.");
    }
  }
  function hint() {
    if (!view.hintsLeft) { toast("Подсказки на этой ступени кончились"); return; }
    snapshot();
    view.hintsLeft--;
    if (view.id === "logic") {
      var p = DATA.logic[view.level];
      for (var ci = 0; ci < p.cats.length; ci++) for (var vi = 0; vi < p.n; vi++) {
        if (view.mark[ci][vi] !== p.solution[ci][vi]) {
          view.mark[ci][vi] = p.solution[ci][vi];
          view.clue = "Одна галочка поставлена. Это бесплатно для счёта.";
          tone(true); render(); return;
        }
      }
    } else if (view.id === "sudoku") {
      var sol = DATA.sudoku[view.level].solution.split("").map(Number);
      for (var i = 0; i < sol.length; i++) if (view.grid[i] !== sol[i]) {
        view.grid[i] = sol[i];
        view.given[i] = true;
        view.pencil[i] = {};
        view.clue = "Одна цифра открыта.";
        tone(true); render(); return;
      }
    } else if (view.id === "kakuro") {
      var ks = DATA.kakuro[view.level].solution.split("").map(Number);
      for (var j = 0; j < ks.length; j++) if (view.grid[j] !== ks[j]) {
        view.grid[j] = ks[j];
        view.clue = "Одна цифра открыта.";
        tone(true); render(); return;
      }
    } else if (view.id === "pattern") {
      var choices = DATA.pattern[view.level].choices;
      var ans = DATA.pattern[view.level].answer;
      for (var c = 0; c < choices.length; c++) if (c !== ans && !view.hidden[c]) {
        view.hidden[c] = true;
        view.clue = "Один неверный ответ убран.";
        tone(true); render(); return;
      }
    }
    render();
  }
  function pick(n) {
    var p = DATA.pattern[view.level];
    if (n === p.answer) win(p.why);
    else { tone(false); view.clue = "Не то. Очки не снимаются."; render(); }
  }
  function variantOf(id, level) {
    if (id === "logic") return level < 8 ? "lg4" : "lg5";
    if (id === "sudoku") return level < 6 ? "sd6" : "sd9";
    if (id === "kakuro") return "kak";
    return level < 8 ? "pat" : "pth";
  }
  function xpWord(n) {
    return n + " " + (L() ? L().plural(n, "опыт", "опыта", "опыта") : "опыта");
  }
  function win(why) {
    tone(true);
    var spent = elapsed();
    var daily = dailyRef();
    var isDaily = daily.id === view.id && daily.level === view.level;
    view.spent = spent;
    view.why = why;
    view.wasDaily = isDaily;
    state.done[view.id][view.level] = true;
    var key = bestKey();
    if (!state.best[key] || spent < state.best[key]) state.best[key] = spent;
    if (isDaily) {
      state.daily = dayStamp();
      state.dailyId = daily.id + ":" + daily.level;
    }
    persist();
    var reward = { coins: 0, xp: 0, daily: 0, streak: 1, already: false };
    if (window.LZFarm && LZFarm.onLogic) reward = LZFarm.onLogic(variantOf(view.id, view.level), isDaily) || reward;
    var bits = [];
    if (reward.coins && L()) bits.push("+" + reward.coins + " " + L().plural(reward.coins, "монета", "монеты", "монет"));
    if (reward.xp) bits.push("+" + xpWord(reward.xp));
    if (reward.daily && L()) bits.push("задача дня +" + reward.daily + " " + L().plural(reward.daily, "монета", "монеты", "монет"));
    var streak = "Серия " + reward.streak + " " + (L() ? L().plural(reward.streak, "день", "дня", "дней") : "дн.");
    view.reward = bits.length ? "В огород: " + bits.join(", ") + ". " + streak : "Бонус этого вида сегодня уже получен. " + streak;
    toast(view.reward);
    view.name = "win";
    reveal();
  }
  function dayStamp() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function share() {
    var text = "Задача дня в «Лаборатории здоровья»: " + (NAMES[view.id] || "логическая задача") + ", ступень " + ((view.level || 0) + 1) + ".";
    toast("Открываем окно, чтобы поделиться…");
    if (!(window.Platform && Platform.share)) { toast("Не получилось поделиться. Попробуйте ещё раз."); return; }
    Platform.share(text).then(function (r) {
      if (r === "shared") toast("Готово. Можно отправить друзьям.");
      else if (r === "copied") toast("Скопировано");
      else if (r === "cancelled") toast("Окно закрыто. Поделиться можно позже.");
      else toast("Не получилось поделиться. Попробуйте ещё раз.");
    });
  }

  function onShow(name) {
    if (name !== "logic-intro" && name !== "logic" && name !== "logic-result") return;
    if (name === "logic-intro") {
      if (view.name === "win" && view.id) view = { name: "levels", id: view.id };
      else if (view.name !== "levels") view = { name: "hub" };
    }
    render();
  }
  function reloadProgress() { state = load(); }
  if (window.LZBrain) LZBrain.register({
    id: "logic",
    n: "Логические задачи",
    d: "Таблицы, судоку, какуро и ряды",
    screen: "logic-intro",
    status: function () {
      var n = 0;
      ["logic", "sudoku", "kakuro", "pattern"].forEach(function (id) { n += (state.done[id] || []).filter(Boolean).length; });
      var farm = window.LZFarm && LZFarm.brainStatus ? LZFarm.brainStatus("logic") : "";
      return "Пройдено " + n + " из 60" + (farm ? ". " + farm : "");
    },
    title: function () { return null; },
    onShow: onShow
  });
  window.LZLogic = { reloadProgress: reloadProgress };
  pullCloud(function () {});
})();
