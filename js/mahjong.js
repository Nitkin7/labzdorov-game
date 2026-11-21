/* Лаборатория здоровья — «Маджонг»: спокойный пасьянс из парных костей.
   Кость свободна, если сверху пусто и открыта левая или правая сторона.
   Расклад собирается с конца: пары снимаются только со свободных мест,
   поэтому каждая партия решается. Результаты — в lz_brain_v1 (games.mahjong). */
(function () {
  "use strict";

  var ID = "mahjong";
  var $ = function (id) { return document.getElementById(id); };
  function L() { return window.LZ; }
  function BR() { return window.LZBrain; }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function clock(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function face(body) { return '<svg viewBox="0 0 48 48" aria-hidden="true">' + body + "</svg>"; }
  var TILES = [
    { id: "chamomile", n: "Ромашка", svg: face('<g fill="#fffef8" stroke="#d7b45a" stroke-width="1"><ellipse cx="24" cy="11" rx="5" ry="7"/><ellipse cx="24" cy="37" rx="5" ry="7"/><ellipse cx="11" cy="24" rx="7" ry="5"/><ellipse cx="37" cy="24" rx="7" ry="5"/><ellipse cx="14" cy="14" rx="5" ry="6.5" transform="rotate(-45 14 14)"/><ellipse cx="34" cy="14" rx="5" ry="6.5" transform="rotate(45 34 14)"/><ellipse cx="14" cy="34" rx="5" ry="6.5" transform="rotate(45 14 34)"/><ellipse cx="34" cy="34" rx="5" ry="6.5" transform="rotate(-45 34 34)"/></g><circle cx="24" cy="24" r="5.5" fill="#e2b423"/>') },
    { id: "mint", n: "Мята", svg: face('<path d="M24 42 C24 30 12 26 6 14 C16 16 22 22 24 30 C26 22 32 16 42 14 C36 26 24 30 24 42Z" fill="#2f7d32"/><path d="M24 42 L24 16" fill="none" stroke="#1b4d24" stroke-width="1.6"/>') },
    { id: "rosehip", n: "Шиповник", svg: face('<circle cx="24" cy="27" r="12" fill="#c0392b"/><circle cx="20" cy="24" r="2.2" fill="#f6d0cb"/><path d="M18 16 Q24 8 30 16" fill="#3d7a32"/><path d="M24 15 L24 8" stroke="#6b4a22" stroke-width="1.6"/>') },
    { id: "linden", n: "Липа", svg: face('<path d="M24 42 C8 30 8 16 16 12 C20 10 22 16 24 20 C26 16 28 10 32 12 C40 16 40 30 24 42Z" fill="#8fbf6a"/><path d="M24 20 L24 38" fill="none" stroke="#3d6b32" stroke-width="1.5"/><circle cx="24" cy="12" r="3" fill="#f2d15a"/>') },
    { id: "viburnum", n: "Калина", svg: face('<circle cx="24" cy="15" r="7" fill="#b42318"/><circle cx="14" cy="30" r="7" fill="#d4544a"/><circle cx="34" cy="30" r="7" fill="#8e1b14"/><circle cx="22" cy="13" r="1.7" fill="#f8d0cc"/><circle cx="12" cy="28" r="1.7" fill="#f8d0cc"/><circle cx="32" cy="28" r="1.7" fill="#f8d0cc"/>') },
    { id: "garlic", n: "Чеснок", svg: face('<path d="M24 6 C26 12 28 14 28 17 L24 14 L20 17 C20 14 22 12 24 6Z" fill="#7dae4a"/><path d="M24 15 C35 18 39 28 34 37 C29 44 19 44 14 37 C9 28 13 18 24 15Z" fill="#f7f3e8" stroke="#c9c0a6" stroke-width="1.6"/><path d="M24 18 L24 39" stroke="#e6deca" stroke-width="1.5"/>') },
    { id: "honey", n: "Мёд", svg: face('<rect x="16" y="11" width="16" height="8" rx="3" fill="#fff6d8" stroke="#a67c1d" stroke-width="2"/><rect x="13" y="18" width="22" height="20" rx="4" fill="#f0c14a" stroke="#a67c1d" stroke-width="2"/><path d="M18 28 H30" stroke="#a67c1d" stroke-width="1.6"/>') },
    { id: "raspberry", n: "Малина", svg: face('<g fill="#c23b78"><circle cx="24" cy="13" r="6"/><circle cx="15" cy="22" r="6"/><circle cx="33" cy="22" r="6"/><circle cx="19" cy="31" r="6"/><circle cx="29" cy="31" r="6"/></g><path d="M18 10 Q24 4 30 10" fill="#3d7a32"/>') },
    { id: "hypericum", n: "Зверобой", svg: face('<polygon points="24,5 28,17 41,17 31,25 35,38 24,30 13,38 17,25 7,17 20,17" fill="#f2c200"/><circle cx="24" cy="23" r="4" fill="#d36b16"/>') },
    { id: "thyme", n: "Чабрец", svg: face('<path d="M8 40 Q24 28 40 8" fill="none" stroke="#3d7a32" stroke-width="2.2"/><g fill="#7b4ea3"><circle cx="14" cy="34" r="3.4"/><circle cx="21" cy="27" r="3.4"/><circle cx="28" cy="20" r="3.4"/><circle cx="34" cy="13" r="3.4"/></g>') },
    { id: "carrot", n: "Морковь", svg: face('<path d="M24 16 C32 16 36 22 33 28 L27 42 L21 42 L15 28 C12 22 16 16 24 16Z" fill="#e67e22"/><path d="M16 15 Q24 4 32 15 Q24 11 16 15Z" fill="#3d7a32"/>') },
    { id: "apple", n: "Яблоко", svg: face('<circle cx="24" cy="28" r="13" fill="#d6453d"/><path d="M24 16 Q29 7 35 10" fill="none" stroke="#6b4a22" stroke-width="2"/><ellipse cx="32" cy="14" rx="5" ry="3" fill="#3d7a32" transform="rotate(-25 32 14)"/><ellipse cx="19" cy="24" rx="3" ry="4.2" fill="#f3b7b1"/>') },
    { id: "calendula", n: "Календула", svg: face('<circle cx="24" cy="24" r="15" fill="#e67e22"/><circle cx="24" cy="24" r="8" fill="#f6c144"/><circle cx="24" cy="24" r="3.5" fill="#c46a12"/>') },
    { id: "tea", n: "Чай", svg: face('<path d="M8 18 H30 V30 Q30 40 19 40 Q8 40 8 30Z" fill="#f7f1e4" stroke="#6b4a22" stroke-width="2"/><path d="M30 22 H36 Q42 22 42 28 Q42 34 35 34 H30" fill="none" stroke="#6b4a22" stroke-width="2"/><path d="M15 12 Q17 7 15 4 M22 12 Q24 6 22 3" fill="none" stroke="#8eb4c4" stroke-width="1.7"/>') },
    { id: "lemon", n: "Лимон", svg: face('<ellipse cx="24" cy="27" rx="14" ry="11" fill="#f6e04a" stroke="#d4b423" stroke-width="1.5"/><path d="M24 16 L29 8" stroke="#3d7a32" stroke-width="2"/><ellipse cx="32" cy="12" rx="4.5" ry="2.6" fill="#6aaa45" transform="rotate(-20 32 12)"/>') },
    { id: "cucumber", n: "Огурец", svg: face('<ellipse cx="24" cy="24" rx="10" ry="16" fill="#5ea348" transform="rotate(28 24 24)"/><path d="M14 22 Q24 24 34 18 M13 30 Q24 32 36 26" fill="none" stroke="#2f6b32" stroke-width="1.4" transform="rotate(28 24 24)"/>') }
  ];
  var BY_TYPE = {};
  TILES.forEach(function (t) { BY_TYPE[t.id] = t; });

  var LEVELS = [
    { id: 0, n: "Лёгкий", about: "24 кости", base: 30 },
    { id: 1, n: "Средний", about: "48 костей", base: 50 },
    { id: 2, n: "Сложный", about: "72 кости", base: 80 }
  ];

  /* ---------- Расклад: прямоугольники, верхние слои по центру ---------- */
  function rect(z, x0, y0, cols, rows) {
    var out = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) out.push({ x: x0 + c * 2, y: y0 + r * 2, z: z });
    return out;
  }
  function centerOn(base, z, cols, rows) {
    var maxX = 0, maxY = 0;
    base.forEach(function (p) { if (p.x + 2 > maxX) maxX = p.x + 2; if (p.y + 2 > maxY) maxY = p.y + 2; });
    return rect(z, Math.round((maxX - cols * 2) / 2), Math.round((maxY - rows * 2) / 2), cols, rows);
  }
  /* Узкий след: 4 столбца, чтобы на телефоне 360px кости оставались крупными.
     Лишние кости — новыми слоями, а не новыми рядами. */
  function layoutOf(level) {
    var base = rect(0, 0, 0, 4, 4);
    if (level === 1) return base.concat(rect(1, 0, 0, 4, 4), rect(2, 0, 0, 4, 4));
    if (level === 2) {
      return base.concat(
        rect(1, 0, 0, 4, 4),
        rect(2, 0, 0, 4, 4),
        rect(3, 0, 0, 4, 4),
        centerOn(base, 4, 4, 2)
      );
    }
    return base.concat(centerOn(base, 1, 4, 2));
  }

  function overlaps(a, b) {
    return a.x < b.x + 2 && b.x < a.x + 2 && a.y < b.y + 2 && b.y < a.y + 2;
  }
  function isFree(tile, tiles) {
    var covered = false, left = false, right = false;
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      if (t === tile) continue;
      if (t.z > tile.z && overlaps(t, tile)) covered = true;
      if (t.z === tile.z && t.y < tile.y + 2 && tile.y < t.y + 2) {
        if (t.x < tile.x && t.x + 2 >= tile.x) left = true;
        if (t.x > tile.x && t.x <= tile.x + 2) right = true;
      }
    }
    return !covered && (!left || !right);
  }

  /* Снимаем пары только со свободных мест. Случайный порядок, если зашёл в тупик — прежний надёжный. */
  function removalOrder(positions) {
    function run(random) {
      var alive = positions.map(function (_, i) { return i; });
      var order = [];
      while (alive.length) {
        var present = alive.map(function (i) { return positions[i]; });
        var free = [];
        for (var k = 0; k < present.length; k++) if (isFree(present[k], present)) free.push(alive[k]);
        if (free.length < 2) return null;
        if (random) free = shuffle(free);
        else free.sort(function (a, b) {
          var pa = positions[a], pb = positions[b];
          return pb.z - pa.z || pa.x - pb.x || pa.y - pb.y;
        });
        var ia = free[0], ib = free[1];
        order.push([ia, ib]);
        alive = alive.filter(function (i) { return i !== ia && i !== ib; });
      }
      return order;
    }
    var order = null;
    for (var t = 0; t < 16 && !order; t++) order = run(true);
    return order || run(false);
  }

  var seq = 1;
  function makeTile(pos, type) {
    return { id: seq++, x: pos.x, y: pos.y, z: pos.z, type: type };
  }
  function pairsOf(list) {
    var free = [], out = [];
    for (var i = 0; i < list.length; i++) if (isFree(list[i], list)) free.push(list[i]);
    for (i = 0; i < free.length; i++) for (var j = i + 1; j < free.length; j++) {
      if (free[i].type === free[j].type) out.push([free[i], free[j]]);
    }
    return out;
  }
  /* Случайная партия до конца: так отсекаем расклады, которые часто заходят в тупик. */
  function playout(tiles) {
    var alive = tiles.slice();
    while (alive.length) {
      var pairs = pairsOf(alive);
      if (!pairs.length) return false;
      var p = pairs[Math.floor(Math.random() * pairs.length)];
      alive = alive.filter(function (t) { return t !== p[0] && t !== p[1]; });
    }
    return true;
  }
  function friendly(tiles) {
    var trials = tiles.length > 50 ? 6 : 12;
    for (var i = 0; i < trials; i++) if (!playout(tiles)) return false;
    return true;
  }
  function assign(positions, types) {
    var order = removalOrder(positions);
    if (!order || order.length !== types.length) return null;
    var tiles = new Array(positions.length);
    order.forEach(function (pair, i) {
      tiles[pair[0]] = makeTile(positions[pair[0]], types[i]);
      tiles[pair[1]] = makeTile(positions[pair[1]], types[i]);
    });
    return tiles;
  }
  function typeBag(n) {
    var types = [];
    for (var i = 0; i < n; i++) types.push(TILES[i % TILES.length].id);
    return types;
  }
  function build(level) {
    var positions = layoutOf(level);
    var types = typeBag(positions.length / 2);
    var best = null, tries = level === 0 ? 30 : 16;
    for (var i = 0; i < tries; i++) {
      var tiles = assign(positions, shuffle(types));
      if (!tiles) continue;
      best = tiles;
      if (friendly(tiles)) return tiles;
    }
    return best;
  }
  /* Те же рисунки, новые места: порядок снятия снова решаемый. */
  function reshuffle(tiles) {
    var positions = tiles.map(function (t) { return { x: t.x, y: t.y, z: t.z }; });
    var bag = {};
    tiles.forEach(function (t) { (bag[t.type] = bag[t.type] || []).push(t.type); });
    var types = [];
    Object.keys(bag).forEach(function (k) {
      for (var i = 0; i + 1 < bag[k].length; i += 2) types.push(k);
    });
    if (types.length * 2 !== tiles.length) return false;
    var best = null, tries = tiles.length > 40 ? 8 : 14;
    for (var n = 0; n < tries; n++) {
      var order = removalOrder(positions);
      if (!order || order.length !== types.length) continue;
      var face = shuffle(types);
      order.forEach(function (pair, i) {
        tiles[pair[0]].type = face[i];
        tiles[pair[1]].type = face[i];
      });
      best = true;
      if (friendly(tiles)) return true;
    }
    return !!best;
  }

  /* ---------- Звания: без гонки со временем ---------- */
  function title() {
    var b0 = BR().best(ID, 0), b1 = BR().best(ID, 1), b2 = BR().best(ID, 2);
    if (!b0 && !b1 && !b2) return null;
    var i = 0;
    if (b0 && b1) i = 1;
    if (b2) i = 2;
    if (b2 && !b2.m) i = 3;
    var R = BR().RANKS, next = null;
    if (i === 0) next = "Следующее звание «" + R[1] + "»: соберите лёгкий и средний расклады.";
    else if (i === 1) next = "Следующее звание «" + R[2] + "»: соберите сложный расклад.";
    else if (i === 2) next = "Следующее звание «" + R[3] + "»: сложный расклад без подсказки.";
    return { i: i, name: R[i], next: next };
  }
  function status() {
    var n = 0;
    [0, 1, 2].forEach(function (lv) { if (BR().best(ID, lv)) n++; });
    return n ? "Собрано раскладов: " + n + " из 3" : "Находите пары одинаковых костей";
  }
  function fmtEntry(e) {
    return clock(e.t) + ' <small>· ' + e.sc + " " + L().plural(e.sc, "очко", "очка", "очков") + "</small>";
  }
  function levelPref() {
    var v = +BR().pref("mahjongLevel");
    return LEVELS[v] ? v : 0;
  }

  /* ---------- Состояние ---------- */
  var G = null, R = null, timer = null;
  function alive() { return G ? G.tiles.filter(function (t) { return !t.gone; }) : []; }
  function tileById(id) {
    for (var i = 0; i < G.tiles.length; i++) if (G.tiles[i].id === id) return G.tiles[i];
    return null;
  }
  function freePairs() {
    var list = alive(), free = list.filter(function (t) { return isFree(t, list); }), out = [];
    for (var i = 0; i < free.length; i++) for (var j = i + 1; j < free.length; j++) {
      if (free[i].type === free[j].type) out.push([free[i], free[j]]);
    }
    return out;
  }
  function elapsed() {
    if (!G) return 0;
    return G.acc + (G.paused || G.done ? 0 : Date.now() - G.t0);
  }

  /* ---------- Вступление ---------- */
  function renderIntro() {
    var root = $("mahjong-intro-root"); if (!root) return;
    var lv = levelPref();
    var farm = window.LZFarm && LZFarm.brainStatus ? LZFarm.brainStatus("mj" + lv) : "";
    root.innerHTML =
      '<div class="card center"><span class="pill">Разминка для ума</span>' +
      '<h2 id="mj-intro-title">Маджонг</h2><div class="gold-line"></div>' +
      '<p class="mj-rules">Находите две одинаковые свободные кости. Кость свободна, если на ней ничего не лежит и открыта хотя бы одна сторона — слева или справа.</p>' +
      '<p class="mj-rules muted">Спешить не нужно. Время только для вас, на результат оно не влияет.</p>' +
      '<h3>Расклад</h3><div class="sch-sizes mj-levels" role="radiogroup" aria-label="Сложность">' +
      LEVELS.map(function (L) {
        return '<button type="button" class="seg-btn sch-size" role="radio" data-mj-level="' + L.id + '" aria-checked="' + (L.id === lv) + '"><b>' + L.n + "</b><span>" + L.about + "</span></button>";
      }).join("") + "</div>" +
      '<button type="button" class="btn btn-primary btn-big" data-mj-start>Начать</button>' +
      (farm ? '<p class="br-farm">🌿 ' + farm + "</p>" : "") +
      "</div>" +
      '<div class="card">' + BR().progressHTML(ID, lv, fmtEntry, "Расклад «" + LEVELS[lv].n + "»") + ranksHTML() + "</div>";
  }
  function ranksHTML() {
    var Rk = BR().RANKS, cur = title();
    var rows = [
      [3, "сложный расклад без подсказки"],
      [2, "собрать сложный расклад"],
      [1, "собрать лёгкий и средний"],
      [0, "собрать любой расклад"]
    ];
    return '<h3>Звания</h3><ul class="sch-ranks">' + rows.map(function (r) {
      var on = cur && cur.i === r[0];
      return '<li' + (on ? ' class="on"' : "") + "><b>" + Rk[r[0]] + "</b><span>" + r[1] + (on ? " · ваше звание" : "") + "</span></li>";
    }).join("") + "</ul>";
  }

  /* ---------- Игра ---------- */
  function start() {
    var lv = levelPref();
    var tiles = build(lv);
    if (!tiles) return;
    G = { lv: lv, tiles: tiles, sel: 0, hint: [], undo: [], moves: 0, hints: 0, shuffles: 0, note: "", t0: Date.now(), acc: 0, paused: false, done: false };
    L().go("mahjong");
    renderPlay();
    startTimer();
  }
  function bounds(list) {
    var maxX = 2, maxY = 2, maxZ = 0;
    list.forEach(function (t) {
      if (t.x + 2 > maxX) maxX = t.x + 2;
      if (t.y + 2 > maxY) maxY = t.y + 2;
      if (t.z > maxZ) maxZ = t.z;
    });
    return { cols: maxX / 2, rows: maxY / 2, maxZ: maxZ };
  }
  /* Кости масштабируются под свободное место: и в ширину, и в высоту, без прокрутки. */
  function metrics(list, availW, availH) {
    var b = bounds(list);
    var sxR = 0.3, syR = 0.18, ratio = 1.14;
    availW = Math.max(80, availW - 4);
    availH = Math.max(80, availH - 4);
    var tw = availW / (b.cols + b.maxZ * sxR);
    var th = availH / (b.rows + b.maxZ * syR);
    if (th / tw > ratio) th = tw * ratio;
    else tw = th / ratio;
    var boardW = b.cols * tw + b.maxZ * tw * sxR;
    var boardH = b.rows * th + b.maxZ * th * syR;
    var fit = Math.min(1, availW / boardW, availH / boardH);
    tw *= fit; th *= fit;
    if (tw > 104) { var k = 104 / tw; tw = 104; th *= k; }
    return { tw: tw, th: th, sx: tw * sxR, sy: th * syR, showLabel: tw >= 46 };
  }
  function boardHTML(list, m) {
    var minL = 0, minT = 0, maxL = 0, maxT = 0;
    list.forEach(function (t) {
      var left = t.x * (m.tw / 2) + t.z * m.sx;
      var top = t.y * (m.th / 2) - t.z * m.sy;
      if (left < minL) minL = left;
      if (top < minT) minT = top;
      if (left + m.tw > maxL) maxL = left + m.tw;
      if (top + m.th > maxT) maxT = top + m.th;
    });
    var padL = Math.ceil(-minL + 2), padT = Math.ceil(-minT + 2);
    var bw = Math.ceil(maxL + padL + 4), bh = Math.ceil(maxT + padT + 4);
    var maxZ = 0;
    list.forEach(function (t) { if (t.z > maxZ) maxZ = t.z; });
    return '<div class="mj-board' + (m.showLabel ? "" : " mj-nolabel") + '" id="mj-board" style="width:' + bw + "px;height:" + bh + 'px">' +
      list.map(function (t) {
        var info = BY_TYPE[t.type];
        var left = t.x * (m.tw / 2) + t.z * m.sx + padL;
        var top = t.y * (m.th / 2) - t.z * m.sy + padT;
        var free = isFree(t, list);
        var cls = "mj-tile" + (free ? " is-free" : " is-locked") + (t.z > 0 ? " is-raised" : "") + (t.z === maxZ && t.z > 0 ? " is-top" : "") +
          (G.sel === t.id ? " is-sel" : "") + (G.hint.indexOf(t.id) >= 0 ? " is-hint" : "");
        var z = t.z * 30 + t.y + (G.hint.indexOf(t.id) >= 0 ? 200 : 0);
        var name = m.showLabel ? '<span class="mj-name">' + esc(info.n) + "</span>" : "";
        return '<button type="button" class="' + cls + '" data-mj-id="' + t.id + '" style="width:' + m.tw.toFixed(1) + "px;height:" + m.th.toFixed(1) + "px;left:" + left.toFixed(1) + "px;top:" + top.toFixed(1) + "px;z-index:" + z + '" aria-label="' + esc(info.n) + (free ? ", свободна" : ", закрыта") + '">' +
          '<span class="mj-ico">' + info.svg + "</span>" + name + "</button>";
      }).join("") + "</div>";
  }
  function renderPlay() {
    var root = $("mahjong-root"); if (!root || !G) return;
    var list = alive();
    var stuck = list.length && !freePairs().length;
    var note = G.note || (stuck ? "Свободных пар нет — нажмите «Перемешать»." : "Две одинаковые свободные кости.");
    root.innerHTML =
      '<div class="mj-hud">' +
      '<span class="mj-chip">Время <b id="mj-time">' + clock(elapsed()) + "</b></span>" +
      '<span class="mj-chip">Ходы <b id="mj-moves">' + G.moves + "</b></span>" +
      '<span class="mj-chip">Осталось <b id="mj-left">' + list.length + "</b></span></div>" +
      '<p class="mj-note" id="mj-note" aria-live="polite">' + esc(note) + "</p>" +
      '<div class="mj-fit" id="mj-fit"></div>' +
      '<div class="mj-actions">' +
      '<button type="button" class="btn btn-secondary" data-mj-hint>Подсказка</button>' +
      '<button type="button" class="btn btn-ghost" data-mj-shuffle>Перемешать</button>' +
      '<button type="button" class="btn btn-ghost" data-mj-undo' + (G.undo.length ? "" : " disabled") + ">Отменить ход</button>" +
      '<button type="button" class="btn btn-ghost" data-mj-restart>Начать заново</button></div>';
    var fit = $("mj-fit");
    var m = metrics(list, fit.clientWidth || window.innerWidth - 28, fit.clientHeight || Math.round(window.innerHeight * 0.55));
    fit.innerHTML = boardHTML(list, m);
  }
  function updateHud() {
    var t = $("mj-time"); if (t) t.textContent = clock(elapsed());
    var mv = $("mj-moves"); if (mv) mv.textContent = G ? G.moves : "0";
    var left = $("mj-left"); if (left && G) left.textContent = alive().length;
  }
  function startTimer() {
    stopTimer();
    timer = setInterval(function () { if (G && L().current() === "mahjong") updateHud(); }, 500);
  }
  function stopTimer() { if (timer) clearInterval(timer); timer = null; }

  function tap(id) {
    if (!G || G.done) return;
    var list = alive();
    var tile = tileById(id);
    if (!tile || tile.gone) return;
    G.hint = [];
    if (!isFree(tile, list)) {
      G.sel = 0;
      G.note = "Эта кость ещё закрыта. Снимите то, что сверху, или откройте бок.";
      L().tone(false);
      renderPlay();
      return;
    }
    if (G.sel === tile.id) { G.sel = 0; G.note = ""; renderPlay(); return; }
    var prev = G.sel ? tileById(G.sel) : null;
    if (!prev || prev.gone) {
      G.sel = tile.id;
      G.note = "Выбрана: " + BY_TYPE[tile.type].n + ". Найдите такую же свободную.";
      renderPlay();
      return;
    }
    if (prev.type !== tile.type || !isFree(prev, list)) {
      G.sel = tile.id;
      G.note = "Выбрана: " + BY_TYPE[tile.type].n + ". Найдите такую же свободную.";
      renderPlay();
      return;
    }
    prev.gone = true;
    tile.gone = true;
    G.undo.push([prev, tile]);
    G.moves++;
    G.sel = 0;
    G.note = "";
    L().tone(true);
    renderPlay();
    if (!alive().length) finish();
  }
  function hint() {
    if (!G || G.done) return;
    var pairs = shuffle(freePairs());
    if (!pairs.length) { G.note = ""; G.hint = []; renderPlay(); return; }
    G.hints++;
    G.hint = [pairs[0][0].id, pairs[0][1].id];
    G.sel = 0;
    G.note = "Подсказка: пара «" + BY_TYPE[pairs[0][0].type].n + "» подсвечена.";
    renderPlay();
  }
  function doShuffle() {
    if (!G || G.done) return;
    var list = alive();
    if (list.length < 2) return;
    if (!reshuffle(list)) { G.note = "Сейчас перемешать не вышло. Нажмите ещё раз."; renderPlay(); return; }
    G.shuffles++;
    G.sel = 0;
    G.hint = [];
    G.note = "Кости перемешаны. Расклад по-прежнему можно собрать.";
    renderPlay();
  }
  function undo() {
    if (!G || G.done || !G.undo.length) return;
    var pair = G.undo.pop();
    pair[0].gone = false;
    pair[1].gone = false;
    G.sel = 0;
    G.hint = [];
    G.note = "Ход отменён.";
    renderPlay();
  }
  function finish() {
    G.acc += Date.now() - G.t0;
    G.done = true;
    G.t0 = Date.now();
    stopTimer();
    var lv = G.lv, time = G.acc, sc = LEVELS[lv].base + (G.hints ? 0 : 10);
    var res = BR().record(ID, lv, { score: sc, time: time, mis: G.hints, adj: time });
    R = { lv: lv, time: time, moves: G.moves, hints: G.hints, shuffles: G.shuffles, sc: sc, res: res };
    setTimeout(function () { if (L().current() === "mahjong") L().go("mahjong-result"); }, 420);
  }

  /* ---------- Итог ---------- */
  function message(r) {
    var res = r.res;
    if (res.first) return "Первый результат для расклада «" + LEVELS[r.lv].n + "» записан. Можно вернуться в любой день.";
    if (res.isBest) return "Это ваш новый лучший результат. Прошлый счёт — " + res.prev.sc + ".";
    return "Расклад собран. Хорошая спокойная разминка.";
  }
  function renderResult() {
    var root = $("mahjong-result-root"); if (!root) return;
    if (!R) {
      root.innerHTML = '<div class="card center"><p>Результатов пока нет.</p><button type="button" class="btn btn-primary btn-big" data-go="mahjong-intro">К маджонгу</button></div>';
      return;
    }
    var r = R, rw = r.res.reward || {};
    root.innerHTML =
      '<div class="card center mj-res"><span class="pill">' + LEVELS[r.lv].n + "</span>" +
      '<h2 id="mj-res-title">' + (r.res.isBest && !r.res.first ? "Новый лучший результат" : "Расклад собран") + '</h2><div class="gold-line"></div>' +
      '<p class="big-result">' + clock(r.time) + "</p>" +
      '<p class="mj-res-line">Ходов: ' + r.moves + " · подсказок: " + r.hints + (r.shuffles ? " · перемешиваний: " + r.shuffles : "") + "</p>" +
      '<p class="mj-res-score"><b>' + r.sc + "</b> " + L().plural(r.sc, "очко", "очка", "очков") + "</p>" +
      '<p class="mj-msg">' + message(r) + "</p>" +
      (rw.coins ? '<p class="br-farm">🌿 В огород: +' + rw.coins + " " + L().plural(rw.coins, "монета", "монеты", "монет") + " (бонус дня за расклад «" + LEVELS[r.lv].n + "»)</p>"
        : rw.already ? '<p class="br-farm muted">Бонус для огорода за этот расклад сегодня уже получен — завтра будет новый.</p>' : "") +
      '<button type="button" class="btn btn-primary btn-big" data-mj-again>Ещё раз</button>' +
      '<button type="button" class="btn btn-ghost btn-big" data-mj-other>Другой расклад</button>' +
      '<button type="button" class="btn btn-ghost btn-big" data-brain-back="brain">Ко всем играм</button></div>' +
      '<div class="card">' + BR().progressHTML(ID, r.lv, fmtEntry, "Ваш прогресс · " + LEVELS[r.lv].n) + "</div>";
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t.closest) return;
    var el;
    if ((el = t.closest("[data-mj-id]"))) { tap(+el.getAttribute("data-mj-id")); return; }
    if ((el = t.closest("[data-mj-level]"))) {
      BR().pref("mahjongLevel", +el.getAttribute("data-mj-level"));
      renderIntro();
      return;
    }
    if (t.closest("[data-mj-start]") || t.closest("[data-mj-again]")) { start(); return; }
    if (t.closest("[data-mj-hint]")) { hint(); return; }
    if (t.closest("[data-mj-shuffle]")) { doShuffle(); return; }
    if (t.closest("[data-mj-undo]")) { undo(); return; }
    if (t.closest("[data-mj-restart]")) { start(); return; }
    if (t.closest("[data-mj-other]")) { L().go("mahjong-intro"); return; }
  });
  document.addEventListener("visibilitychange", function () {
    if (!G || G.done || !L || L().current() !== "mahjong") return;
    if (document.hidden) { G.acc += Date.now() - G.t0; G.paused = true; }
    else if (G.paused) { G.paused = false; G.t0 = Date.now(); }
  });
  window.addEventListener("resize", function () {
    if (G && !G.done && L && L().current() === "mahjong") renderPlay();
  });

  function onShow(name) {
    if (name === "mahjong") document.body.classList.add("mj-play");
    else document.body.classList.remove("mj-play");
    if (name !== "mahjong") stopTimer();
    if (name === "mahjong-intro") renderIntro();
    if (name === "mahjong-result") { G = null; renderResult(); }
    if (name === "mahjong") {
      if (!G || G.done) {
        setTimeout(function () { if (L().current() === "mahjong" && (!G || G.done)) L().go("mahjong-intro", true); }, 0);
      } else { renderPlay(); startTimer(); }
    }
  }

  if (window.LZBrain) LZBrain.register({ id: ID, n: "Маджонг", screen: "mahjong-intro", status: status, title: title, onShow: onShow });

  var api = {
    TILES: TILES, LEVELS: LEVELS, layoutOf: layoutOf, isFree: isFree, removalOrder: removalOrder,
    build: build, reshuffle: reshuffle, title: title,
    _game: function () { return G; }
  };
  if (typeof window !== "undefined") window.LZMahjong = api;
})();
