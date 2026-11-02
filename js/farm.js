/* Лаборатория здоровья — «Аптекарский огород» (основной режим) */
(function () {
  "use strict";
  var FD = window.LZ_FARM_DATA;
  var KEY = "lz_farm_v1";
  var MIN = 60000;
  var MAX_BEDS = 12, RACK_SLOTS = 3, BATCH = 5, HONEY_EVERY = 20 * MIN, HONEY_MAX = 3;
  var $ = function (id) { return document.getElementById(id); };
  var OLD_G = { can: "Огород", fastdry: "Амбар", rack2: "Амбар", beehive: "Двор", bench: "Двор", fence: "Двор", birdhouse: "Двор" };
  FD.upgrades.forEach(function (u) { u.g = u.g || OLD_G[u.id] || "Двор"; });
  if (FD.recipes2) { FD.recipes = FD.recipes.concat(FD.recipes2); FD.recipes2 = null; }
  if (FD.upgrades2) { FD.upgrades = FD.upgrades.concat(FD.upgrades2); FD.upgrades2 = null; }
  var P = {}; FD.plants.forEach(function (p) { P[p.id] = p; });
  var R = {}; FD.recipes.forEach(function (r) { R[r.id] = r; });
  var U = {}; FD.upgrades.forEach(function (u) { U[u.id] = u; });
  var T = {}; FD.trees.forEach(function (x) { T[x.id] = x; });
  var W = {}; FD.forest.forEach(function (x) { W[x.id] = x; });
  var HN = {}; FD.honey.forEach(function (x) { HN[x.id] = x; });
  var BG = {}; FD.beeGoods.forEach(function (x) { BG[x.id] = x; });
  var AR = {}; FD.areas.forEach(function (x) { AR[x.id] = x; });
  var EV = {}; FD.events.forEach(function (x) { EV[x.id] = x; });
  var SETS = {}; FD.sets.forEach(function (x) { SETS[x.id] = x; });
  var AREA_SCREENS = ["orchard", "apiary", "forest"];
  var FARM_SCREENS = ["farm", "barn", "shop", "upgrades", "guide", "plant", "orchard", "apiary", "forest", "collection"];

  /* ---------- Состояние ---------- */
  function fresh() {
    var beds = []; for (var i = 0; i < 4; i++) beds.push(null);
    return { coins: 30, xp: 0, beds: beds, store: {}, racks: [[null, null, null]], up: {},
      giftDay: null, giftStreak: 0, orders: [], tut: 0, quizDay: null, tipDay: null, hiveAt: 0,
      harvested: 0, sold: 0, teas: 0, ordersDone: 0, started: Date.now(),
      /* v4 */
      v: 4, news: false, areas: {}, orchard: [], hives: [], forest: {}, seen: {}, sets: {}, ach: {}, deco: {}, stars: 0,
      st: freshStats(), daily: null, contract: null, fair: null, convoy: null, evo: null };
  }
  function freshStats() { return { orchard: 0, honey: 0, forest: 0, jams: 0, contracts: 0, fairs: 0, convoys: 0, events: 0, chests: 0, weekChests: 0, dried: 0 }; }
  /* Перенос сохранений v1–v3: ничего не удаляем, только добавляем новое */
  function migrate(raw) {
    var st = freshStats(); for (var s in st) if (!(s in raw.st)) raw.st[s] = st[s];
    ["areas", "forest", "seen", "sets", "ach", "deco", "up", "store"].forEach(function (k) { if (!raw[k] || typeof raw[k] !== "object") raw[k] = {}; });
    ["orchard", "hives", "orders", "beds", "racks"].forEach(function (k) { if (!Array.isArray(raw[k])) raw[k] = k === "beds" ? [null, null, null, null] : k === "racks" ? [[null, null, null]] : []; });
    if (raw.v !== 4) {
      var lv = 1; while (lv < FD.levelXp.length && raw.xp >= FD.levelXp[lv]) lv++;
      Object.keys(raw.store).forEach(function (k) { if (raw.store[k] > 0) raw.seen[k] = 1; });
      if (raw.harvested > 0) FD.plants.forEach(function (p) { if (p.lvl <= lv) raw.seen["f:" + p.id] = 1; });
      raw.beds.forEach(function (b) { if (b && b.p) raw.seen["f:" + b.p] = 1; });
      raw.racks.forEach(function (r) { (r || []).forEach(function (s) { if (s && s.h) raw.seen["d:" + s.h] = 1; }); });
      raw.news = (raw.xp || 0) > 0;
      raw.v = 4;
    }
    return raw;
  }
  var F = load();
  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!raw) return fresh();
      var oldV = raw.v || 1;
      var d = fresh(); for (var k in d) if (!(k in raw)) raw[k] = d[k];
      raw.v = oldV;
      return migrate(raw);
    } catch (e) { return fresh(); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(F)); } catch (e) {} }
  function reset() { F = fresh(); save(); }

  /* ---------- Утилиты ---------- */
  function L() { return window.LZ; }
  function now() { return Date.now(); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmtTime(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000)), m = Math.floor(s / 60), h = Math.floor(m / 60);
    if (h > 0) return h + " ч " + String(m % 60).padStart(2, "0") + " мин";
    return m + ":" + String(s % 60).padStart(2, "0");
  }
  function minutesText(t) {
    if (t < 1) return Math.round(t * 60) + " сек";
    return t + " " + L().plural(t, "минута", "минуты", "минут");
  }
  function coin(n) { return '<span class="coins-inline"><span class="coin" aria-hidden="true"></span>' + n + '</span>'; }
  function coinsWord(n) { return n + " " + L().plural(n, "монета", "монеты", "монет"); }
  function level() { var l = 1; while (l < FD.levelXp.length && F.xp >= FD.levelXp[l]) l++; return l; }
  function levelName(l) { return FD.levelNames[Math.min(l - 1, FD.levelNames.length - 1)]; }


  /* ---------- Предметы ---------- */
  // ключи: f:mint (свежая), d:mint (сушёная), t:calm (чай/сбор), honey
  // ключи: f:mint (свежая), d:mint (сушёная), t:calm (рецепт), honey (мёд из улья во дворе),
  // v4: o:apple (сад), w:lingonberry (лес), h:linden (мёд пасеки), x:wax (воск, перга)
  function itemName(key, q) {
    if (key === "honey") return "Мёд";
    var a = key.split(":"), id = a[1];
    switch (a[0]) {
      case "f": return P[id].n + ", свежий пучок";
      case "d": return P[id].n + ", сушёный пучок";
      case "o": return T[id].fruit;
      case "w": return W[id].n;
      case "h": return HN[id].n;
      case "x": return BG[id].n;
    }
    return R[id].n;
  }
  function itemPrice(key) {
    if (key === "honey") return 25;
    var a = key.split(":"), id = a[1], b;
    switch (a[0]) {
      case "f": b = P[id].sell; break;
      case "d": b = Math.round(P[id].sell * 2.2); break;
      case "o": b = T[id].sell; break;
      case "w": b = W[id].sell; break;
      case "h": b = HN[id].sell; break;
      case "x": b = BG[id].sell; break;
      default: b = R[id].price;
    }
    return Math.round(b * priceMult(key));
  }
  function have(key) { return F.store[key] || 0; }
  function add(key, q) { F.store[key] = have(key) + q; if (q > 0) F.seen[key] = 1; if (F.store[key] <= 0) delete F.store[key]; }
  function itemIcon(key, size) {
    size = size || 44;
    if (key === "honey") return svgJar("#e8a92a", size);
    var a = key.split(":");
    switch (a[0]) {
      case "f": return plantImg(P[a[1]], 3, size);
      case "d": return plantImg(P[a[1]], 3, size, "dried");
      case "o": return plantImg(T[a[1]], 3, size, "fruit");
      case "w": return plantImg(W[a[1]], 3, size);
      case "h": return svgJar(HN[a[1]].col, size);
      case "x": return a[1] === "wax" ? svgComb(size) : svgJar(BG[a[1]].col, size);
    }
    var r = R[a[1]];
    return recipeIcon(r, size);
  }
  function recipeIcon(r, size) {
    var c = r.cat || "tea", col = r.col || itemIconColor(r);
    if (c === "jam" || c === "honeymix" || c === "mush") return svgJar(col, size);
    if (c === "mors") return svgGlass(col, size);
    if (c === "pastila") return svgPastila(col, size);
    if (c === "candle") return svgCandle(size);
    return svgTea(col, size);
  }

  /* ---------- Рисунки (SVG) ---------- */
  function svg(inner, size, cls) {
    return '<svg class="' + (cls || "pic") + '" viewBox="0 0 100 100" width="' + size + '" height="' + size + '" aria-hidden="true">' + inner + "</svg>";
  }
  function leaf(x, y, rx, ry, rot, col) {
    return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + col + '" transform="rotate(' + rot + " " + x + " " + y + ')"/>';
  }
  function daisyHead(x, y, r, petal, center, n) {
    var s = ""; n = n || 10;
    for (var i = 0; i < n; i++) s += leaf(x, y - r * 0.9, r * 0.32, r * 0.62, 0, petal).replace('transform="rotate(0', 'transform="rotate(' + (360 / n * i));
    // поворачиваем лепестки вокруг центра цветка
    s = s.replace(/rotate\((\d+(?:\.\d+)?) [\d.]+ [\d.]+\)/g, function (m, a) { return "rotate(" + a + " " + x + " " + y + ")"; });
    return s + '<circle cx="' + x + '" cy="' + y + '" r="' + (r * 0.42) + '" fill="' + center + '"/>';
  }
  function plantSVG(p, stage, size, cls) {
    size = size || 90;
    var s = "", g = p.leaf, base = 92;
    if (stage === 0) {
      s = '<path d="M50 92 C50 82 50 76 50 70" stroke="#4f7d2e" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
        leaf(42, 70, 9, 5, -25, "#7fb24e") + leaf(58, 68, 9, 5, 25, "#8cc057");
      return svg(s, size, cls);
    }
    var k = stage === 1 ? 0.55 : stage === 2 ? 0.82 : 1;
    if (p.kind === "leafy") {
      [[-14, 0.85], [0, 1], [14, 0.8]].forEach(function (st, i) {
        if (stage === 1 && i !== 1) return;
        var x = 50 + st[0] * k, h = 66 * k * st[1], top = base - h;
        s += '<path d="M50 ' + base + " Q" + (50 + st[0] * k * 0.4) + " " + (base - h * 0.5) + " " + x + " " + top + '" stroke="#4f7d2e" stroke-width="2.6" fill="none"/>';
        for (var j = 1; j <= 3; j++) {
          var yy = base - h * (j / 3.4), xx = 50 + (x - 50) * (j / 3.4);
          s += leaf(xx - 7 * k, yy, 8 * k + 2, 4.5 * k + 1.5, -30, g) + leaf(xx + 7 * k, yy - 2, 8 * k + 2, 4.5 * k + 1.5, 30, g);
        }
        if (stage === 2) s += '<circle cx="' + x + '" cy="' + (top - 2) + '" r="3" fill="#8fbf5f"/>';
        if (stage === 3) for (var f = 0; f < 4; f++) s += '<circle cx="' + (x + (f % 2 ? 2.5 : -2.5)) + '" cy="' + (top - 2 - f * 4) + '" r="3.4" fill="' + p.fl + '"/>';
      });
    } else if (p.kind === "daisy") {
      s += leaf(40, 86, 12 * k, 4.5 * k, -20, g) + leaf(60, 86, 12 * k, 4.5 * k, 20, g);
      var heads = p.small ? [[-18, 0.75], [-6, 0.95], [8, 1], [19, 0.8]] : [[-16, 0.8], [0, 1], [16, 0.88]];
      heads.forEach(function (hd, i) {
        if (stage === 1 && i % 2) return;
        var x = 50 + hd[0] * k, h = 62 * k * hd[1], top = base - h;
        s += '<path d="M50 ' + base + " Q" + (50 + hd[0] * 0.3) + " " + (base - h * 0.6) + " " + x + " " + top + '" stroke="#4f7d2e" stroke-width="2.4" fill="none"/>';
        s += leaf(x - 5, top + h * 0.45, 6, 2.6, -35, g);
        if (stage === 2) s += '<circle cx="' + x + '" cy="' + top + '" r="4" fill="#9cc46a"/>';
        if (stage === 3) s += daisyHead(x, top, p.small ? 7 : 10, p.fl, p.c, p.small ? 5 : 11);
      });
    } else if (p.kind === "sprig") {
      var w = 34 * k;
      for (var i = 0; i < 26; i++) {
        var a = i / 26 * Math.PI, rr = (i % 3) * 0.25 + 0.6;
        var x2 = 50 + Math.cos(a) * w * rr, y2 = base - Math.sin(a) * w * 0.8 * rr - 2;
        s += '<circle cx="' + x2.toFixed(1) + '" cy="' + y2.toFixed(1) + '" r="' + (4 * k + 1).toFixed(1) + '" fill="' + (i % 2 ? g : "#79a861") + '"/>';
        if (stage === 3 && i % 2 === 0) s += '<circle cx="' + x2.toFixed(1) + '" cy="' + (y2 - 4).toFixed(1) + '" r="2.8" fill="' + p.fl + '"/>';
      }
    } else if (p.kind === "rosette") {
      for (var r2 = -60; r2 <= 60; r2 += 30) s += leaf(50 + r2 * 0.25 * k, base - 16 * k, 7 * k, 19 * k, r2, g) +
        '<path d="M50 ' + base + ' l' + (Math.sin(r2 * Math.PI / 180) * 30 * k).toFixed(1) + " -" + (Math.cos(r2 * Math.PI / 180) * 30 * k).toFixed(1) + '" stroke="#a9cf86" stroke-width="1.2"/>';
      if (stage >= 2) [-8, 8].forEach(function (dx) {
        s += '<path d="M' + (50 + dx) + " " + (base - 10) + " L" + (50 + dx * 1.4) + ' 22" stroke="#6b8a3a" stroke-width="2"/>';
        if (stage === 3) s += '<rect x="' + (50 + dx * 1.4 - 3) + '" y="14" width="6" height="22" rx="3" fill="' + p.fl + '"/>';
      });
    } else if (p.kind === "bush") {
      s += '<path d="M50 92 L40 50 M50 92 L60 48 M50 92 L50 40" stroke="#7a5a32" stroke-width="' + (3 * k + 1) + '" fill="none" stroke-linecap="round"/>';
      var pts = [[32, 56], [44, 44], [58, 42], [68, 56], [38, 70], [62, 70], [50, 56], [50, 34]];
      pts.forEach(function (pt, i) {
        var x = 50 + (pt[0] - 50) * k, y = base - (base - pt[1]) * k;
        s += leaf(x, y, (p.cluster ? 9 : 10) * k + 2, (p.cluster ? 3 : 6) * k + 1.5, i * 47, g);
      });
      if (stage === 3) [[38, 58], [52, 50], [64, 60], [44, 72], [58, 70], [48, 40], [66, 46], [34, 46]].forEach(function (b) {
        if (p.cluster) s += [0, 4, 8].map(function (d) { return '<circle cx="' + (b[0] + d / 2) + '" cy="' + (b[1] + d - 4) + '" r="2.8" fill="' + p.fl + '"/>'; }).join("");
        else if (p.oval) s += '<ellipse cx="' + b[0] + '" cy="' + b[1] + '" rx="3.4" ry="5" fill="' + p.fl + '"/>';
        else s += '<circle cx="' + b[0] + '" cy="' + b[1] + '" r="4.3" fill="' + p.fl + '"/><circle cx="' + (b[0] - 1.3) + '" cy="' + (b[1] - 1.4) + '" r="1.2" fill="#fff" opacity=".55"/>';
      });
    } else if (p.kind === "mush") {
      var mk = 0.6 + 0.4 * k;
      [[-14, 0.8], [6, 1]].forEach(function (m) {
        var x = 50 + m[0], r = 20 * m[1] * mk, top = base - 30 * m[1] * mk;
        s += '<rect x="' + (x - r * 0.3) + '" y="' + top + '" width="' + r * 0.6 + '" height="' + (base - top) + '" rx="' + r * 0.25 + '" fill="#efe4cc"/>' +
          '<path d="M' + (x - r) + " " + (top + 4) + " Q" + x + " " + (top - r * 1.2) + " " + (x + r) + " " + (top + 4) + 'Z" fill="' + p.fl + '"/>';
      });
    } else if (p.kind === "tree") {
      s += '<path d="M50 92 L50 ' + (base - 40 * k) + '" stroke="#7a5a32" stroke-width="' + (6 * k + 1) + '" stroke-linecap="round"/>';
      var cy = base - 50 * k, cr = 26 * k;
      s += '<circle cx="' + (50 - cr * 0.5) + '" cy="' + (cy + 4) + '" r="' + cr * 0.75 + '" fill="#4f8a3a"/><circle cx="' + (50 + cr * 0.5) + '" cy="' + (cy + 4) + '" r="' + cr * 0.75 + '" fill="#4f8a3a"/><circle cx="50" cy="' + cy + '" r="' + cr + '" fill="' + g + '"/>';
      if (stage === 3) [[38, 0], [50, -12], [62, -2], [44, 10], [58, 12], [50, 2]].forEach(function (b) {
        s += '<circle cx="' + b[0] + '" cy="' + (cy + b[1]) + '" r="3.6" fill="' + p.fl + '"/><circle cx="' + (b[0] + 3) + '" cy="' + (cy + b[1] + 3) + '" r="2.6" fill="' + p.fl + '"/>';
      });
    }
    return svg(s, size, cls);
  }
  /* Реалистичные акварельные рисунки (img/plants/<id>.svg — WebP внутри SVG, грузятся лениво).
     Росток (стадия 0) рисуем сами; молодое растение — уменьшенный рисунок, взрослое — целиком.
     Если картинка не загрузилась — показываем нарисованный вариант. */
  var STAGE_H = [0, 62, 82, 100];
  function plantImg(p, stage, size, cls) {
    size = size || 90;
    if (!p) return "";
    if (stage === 0) return plantSVG(p, 0, size);
    return '<span class="pimg st' + stage + (cls ? " " + cls : "") + '" style="width:' + size + "px;height:" + size + 'px">' +
      '<img src="img/plants/' + (p.img || p.id) + '.svg" alt="" loading="lazy" decoding="async" style="height:' + STAGE_H[stage] + '%" onerror="this.parentNode.classList.add(\'fail\')">' +
      plantSVG(p, stage, size, "pic pfb") + "</span>";
  }
  function custImg(o) {
    var c = null;
    for (var i = 0; i < FD.customers.length; i++) if (FD.customers[i].n === o.c) c = FD.customers[i];
    var letter = esc(String(o.c).split(" ").pop().charAt(0));
    if (!c || !c.img) return '<div class="avatar" aria-hidden="true">' + letter + "</div>";
    return '<div class="avatar has-img" aria-hidden="true"><img src="img/people/' + c.img + '.svg" alt="" loading="lazy" decoding="async" onerror="this.parentNode.classList.remove(\'has-img\');this.replaceWith(\'' + letter + '\')"></div>';
  }
  function svgBundle(p, size) {
    var c = p.kind === "bush" ? p.fl : p.leaf, s = "";
    for (var i = -2; i <= 2; i++) s += '<path d="M50 62 L' + (50 + i * 9) + ' 14" stroke="#8a7a4a" stroke-width="2.4"/>' + leaf(50 + i * 9, 18, 6, 9, i * 12, c) + leaf(50 + i * 7, 34, 5, 8, i * 14, c);
    s += '<rect x="40" y="58" width="20" height="8" rx="2" fill="#c49a3c"/><path d="M46 66 L42 88 M54 66 L58 88" stroke="#8a7a4a" stroke-width="3"/>';
    return svg('<g opacity=".92" filter="saturate(.6)">' + s + "</g>", size);
  }
  function svgTea(col, size) {
    return svg('<rect x="24" y="22" width="52" height="66" rx="8" fill="#fbf6e9" stroke="#8a6a1f" stroke-width="3"/>' +
      '<rect x="24" y="22" width="52" height="14" rx="6" fill="#2e5b2b"/><rect x="34" y="46" width="32" height="30" rx="15" fill="' + col + '"/>' +
      '<path d="M50 52 C44 58 44 66 50 70 C56 66 56 58 50 52Z" fill="#2e5b2b" opacity=".75"/>', size);
  }
  function svgJar(col, size) {
    return svg('<rect x="30" y="16" width="40" height="12" rx="3" fill="#8a6a1f"/><path d="M28 30 h44 v48 a10 10 0 0 1 -10 10 h-24 a10 10 0 0 1 -10 -10z" fill="' + col + '" stroke="#8a6a1f" stroke-width="3"/>' +
      '<rect x="36" y="46" width="28" height="18" rx="4" fill="#fbf6e9"/><path d="M42 55 h16" stroke="#8a6a1f" stroke-width="3"/>', size);
  }
  function svgGlass(col, size) {
    return svg('<path d="M28 18 h44 l-6 66 a6 6 0 0 1 -6 5 h-20 a6 6 0 0 1 -6 -5z" fill="#fbf6e9" stroke="#8a6a1f" stroke-width="3"/><path d="M31 36 h38 l-4.6 46 a4 4 0 0 1 -4 3.4 h-20.8 a4 4 0 0 1 -4 -3.4z" fill="' + col + '"/><circle cx="62" cy="26" r="6" fill="' + col + '"/><path d="M60 14 l6 -8" stroke="#4f7d2e" stroke-width="3"/>', size);
  }
  function svgPastila(col, size) {
    return svg('<rect x="14" y="40" width="72" height="26" rx="6" fill="' + col + '" stroke="#8a5a32" stroke-width="3"/><path d="M14 50 h72 M14 58 h72" stroke="#fbf6e9" stroke-width="2.5" opacity=".75"/><rect x="22" y="28" width="56" height="14" rx="5" fill="' + col + '" opacity=".75" stroke="#8a5a32" stroke-width="2"/>', size);
  }
  function svgCandle(size) {
    return svg('<rect x="38" y="34" width="24" height="52" rx="4" fill="#f0d080" stroke="#a8761e" stroke-width="3"/><path d="M38 46 h24 M38 58 h24 M38 70 h24" stroke="#d8b050" stroke-width="2"/><path d="M50 34 v-8" stroke="#3a2a12" stroke-width="2.5"/><path d="M50 8 C58 18 56 26 50 27 C44 26 42 18 50 8Z" fill="#f39a1e"/><rect x="30" y="84" width="40" height="6" rx="3" fill="#a8761e"/>', size);
  }
  function svgComb(size) {
    var s = "", pts = [[36, 30], [56, 30], [26, 47], [46, 47], [66, 47], [36, 64], [56, 64], [46, 81]];
    pts.forEach(function (p) { s += '<path d="M' + p[0] + " " + (p[1] - 10) + " l9 5 v10 l-9 5 l-9 -5 v-10z" + '" fill="#f0c860" stroke="#a8761e" stroke-width="2.5"/>'; });
    return svg(s, size);
  }
  var ICONS = {
    can: '<path d="M22 44 h40 v36 a6 6 0 0 1 -6 6 h-28 a6 6 0 0 1 -6 -6z" fill="#c07a3a"/><path d="M62 52 L86 34" stroke="#c07a3a" stroke-width="7" stroke-linecap="round"/><path d="M30 44 C30 26 54 26 54 44" stroke="#8a5a2a" stroke-width="5" fill="none"/><circle cx="88" cy="30" r="4" fill="#5aa0d8"/>',
    net: '<rect x="14" y="20" width="72" height="56" rx="6" fill="none" stroke="#8a6a1f" stroke-width="5"/><path d="M14 38 h72 M14 56 h72 M32 20 v56 M50 20 v56 M68 20 v56" stroke="#c49a3c" stroke-width="2.5"/>',
    rack: '<path d="M18 86 L30 16 M82 86 L70 16" stroke="#8a5a2a" stroke-width="6" stroke-linecap="round"/><path d="M24 36 h52 M21 58 h58" stroke="#8a5a2a" stroke-width="4"/><path d="M34 36 v14 M46 36 v18 M58 36 v14 M68 36 v16" stroke="#6c9c3c" stroke-width="5" stroke-linecap="round"/>',
    hive: '<path d="M50 14 C74 14 82 34 82 52 C82 74 70 88 50 88 C30 88 18 74 18 52 C18 34 26 14 50 14Z" fill="#e8b84a" stroke="#a8761e" stroke-width="3"/><path d="M22 36 h56 M19 54 h62 M22 72 h56" stroke="#a8761e" stroke-width="3"/><ellipse cx="50" cy="80" rx="7" ry="5" fill="#5a3a12"/><circle cx="80" cy="22" r="5" fill="#f2c230"/><path d="M76 22 h8" stroke="#2b2a24" stroke-width="2"/>',
    bench: '<rect x="12" y="44" width="76" height="9" rx="3" fill="#a0703a"/><rect x="12" y="28" width="76" height="9" rx="3" fill="#b4834a"/><path d="M20 53 v26 M80 53 v26 M22 37 v7 M78 37 v7" stroke="#7a5a32" stroke-width="6" stroke-linecap="round"/>',
    fence: '<path d="M10 46 h80 M10 66 h80" stroke="#a0703a" stroke-width="5"/>' + [18, 36, 54, 72, 88].map(function (x) { return '<path d="M' + x + ' 86 V30 l-6 -8" stroke="#b4834a" stroke-width="7" stroke-linecap="round" fill="none"/>'; }).join(""),
    birdhouse: '<path d="M50 10 L84 38 H16Z" fill="#9a3b1e"/><rect x="24" y="38" width="52" height="40" fill="#d8b47a" stroke="#8a5a2a" stroke-width="3"/><circle cx="50" cy="54" r="8" fill="#3a2a12"/><path d="M50 78 v14" stroke="#7a5a32" stroke-width="6"/>',
    greenhouse: '<path d="M12 50 L50 18 L88 50 V86 H12Z" fill="#dff0f4" stroke="#5a8aa0" stroke-width="4" stroke-linejoin="round"/><path d="M50 18 V86 M12 50 H88 M31 34 V86 M69 34 V86" stroke="#5a8aa0" stroke-width="2.5"/><path d="M22 86 v-12 M40 86 v-16 M60 86 v-14 M78 86 v-10" stroke="#4f9a45" stroke-width="5" stroke-linecap="round"/>',
    cellar: '<path d="M10 54 Q50 6 90 54 V88 H10Z" fill="#a0703a" stroke="#6b4426" stroke-width="4"/><path d="M30 88 V60 Q50 40 70 60 V88" fill="#5c3a1e"/><rect x="36" y="66" width="10" height="14" rx="2" fill="#d8442a"/><rect x="52" y="66" width="10" height="14" rx="2" fill="#f08a1a"/>',
    extractor: '<rect x="24" y="22" width="52" height="62" rx="8" fill="#c8ccd0" stroke="#6a7078" stroke-width="4"/><circle cx="50" cy="50" r="16" fill="#e8a92a" stroke="#6a7078" stroke-width="3"/><path d="M50 22 V10 M40 10 H60" stroke="#6a7078" stroke-width="5" stroke-linecap="round"/><path d="M76 72 h10 v10" stroke="#e8a92a" stroke-width="5" fill="none"/>',
    buckwheat: '<path d="M8 84 H92" stroke="#6b8a3a" stroke-width="6"/>' + [18, 34, 50, 66, 82].map(function (x) { return '<path d="M' + x + ' 84 V44" stroke="#9a5a4a" stroke-width="3"/><circle cx="' + x + '" cy="40" r="7" fill="#fff"/><circle cx="' + (x + 4) + '" cy="34" r="5" fill="#f4d8e0"/>'; }).join(""),
    bigtable: '<rect x="8" y="40" width="84" height="12" rx="3" fill="#b4834a"/><path d="M16 52 V86 M84 52 V86" stroke="#7a5a32" stroke-width="7" stroke-linecap="round"/><rect x="18" y="24" width="14" height="16" rx="3" fill="#e07a2a"/><rect x="40" y="20" width="16" height="20" rx="3" fill="#2e5b2b"/><rect x="64" y="26" width="14" height="14" rx="3" fill="#e8a92a"/>',
    basket: '<path d="M14 46 H86 L76 86 H24Z" fill="#c49a5a" stroke="#8a5a32" stroke-width="4" stroke-linejoin="round"/><path d="M26 46 C26 14 74 14 74 46" stroke="#8a5a32" stroke-width="6" fill="none"/><path d="M18 60 H82 M21 73 H79" stroke="#8a5a32" stroke-width="2.5"/><circle cx="38" cy="42" r="6" fill="#c0202a"/><circle cx="50" cy="40" r="6" fill="#2a2a5a"/><circle cx="62" cy="42" r="6" fill="#c0202a"/>',
    helper: '<circle cx="50" cy="28" r="14" fill="#f0c8a0"/><path d="M34 22 Q50 6 66 22 Z" fill="#7a5a32"/><path d="M26 88 V62 Q26 46 50 46 Q74 46 74 62 V88Z" fill="#2e5b2b"/><path d="M74 62 L90 52" stroke="#c07a3a" stroke-width="7" stroke-linecap="round"/><circle cx="92" cy="48" r="4" fill="#5aa0d8"/>',
    ladder: '<path d="M30 92 L42 8 M70 92 L58 8" stroke="#a0703a" stroke-width="6" stroke-linecap="round"/><path d="M33 74 H67 M36 56 H64 M38 38 H61 M41 20 H59" stroke="#b4834a" stroke-width="5"/><circle cx="78" cy="22" r="7" fill="#d8442a"/>',
    kitchen: '<path d="M10 40 L50 14 L90 40Z" fill="#9a3b1e"/><rect x="18" y="40" width="64" height="46" fill="#f4ecd6" stroke="#8a5a2a" stroke-width="3"/><rect x="30" y="56" width="40" height="30" fill="#5c3a1e"/><path d="M38 52 C38 46 44 46 44 40 M56 52 C56 46 62 46 62 40" stroke="#a0a0a0" stroke-width="3" fill="none"/>',
    gazebo: '<path d="M8 44 L50 12 L92 44Z" fill="#2e5b2b"/><path d="M18 44 V86 M82 44 V86 M50 44 V86" stroke="#a0703a" stroke-width="6"/><path d="M18 66 H82" stroke="#b4834a" stroke-width="4"/><rect x="10" y="84" width="80" height="6" rx="2" fill="#7a5a32"/>',
    pond: '<ellipse cx="50" cy="62" rx="42" ry="24" fill="#5aa0d8" stroke="#3a6a90" stroke-width="3"/><ellipse cx="36" cy="60" rx="10" ry="5" fill="#4f9a45"/><ellipse cx="62" cy="68" rx="9" ry="4.5" fill="#4f9a45"/><circle cx="38" cy="56" r="4" fill="#f4d8e0"/><circle cx="60" cy="64" r="4" fill="#fff"/>',
    bed: '<rect x="8" y="40" width="84" height="40" rx="8" fill="#8a5a32"/><rect x="14" y="46" width="72" height="28" rx="5" fill="#5c3a1e"/><path d="M30 46 v-14 M50 46 v-20 M70 46 v-14" stroke="#4f7d2e" stroke-width="4"/><circle cx="30" cy="30" r="5" fill="#fff"/><circle cx="50" cy="24" r="5" fill="#f39a1e"/><circle cx="70" cy="30" r="5" fill="#b9a0d8"/>'
  };
  function icon(name, size) { return svg(ICONS[name], size || 48); }
  var NAV_ICONS = {
    farm: '<path d="M10 70 h80 v18 h-80z" fill="currentColor" opacity=".35"/><path d="M30 70 V48 M50 70 V36 M70 70 V48" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><circle cx="30" cy="42" r="8" fill="currentColor"/><circle cx="50" cy="28" r="9" fill="currentColor"/><circle cx="70" cy="42" r="8" fill="currentColor"/>',
    barn: '<path d="M10 44 L50 14 L90 44 V88 H10Z" fill="none" stroke="currentColor" stroke-width="7" stroke-linejoin="round"/><rect x="36" y="56" width="28" height="32" fill="currentColor"/>',
    shop: '<path d="M14 40 h72 l-6 -22 h-60z" fill="currentColor"/><rect x="20" y="40" width="60" height="46" fill="none" stroke="currentColor" stroke-width="7"/><rect x="42" y="58" width="16" height="28" fill="currentColor"/>',
    upgrades: '<path d="M50 12 L74 42 H60 V86 H40 V42 H26Z" fill="currentColor"/>',
    guide: '<path d="M14 20 h30 a8 8 0 0 1 6 4 a8 8 0 0 1 6 -4 h30 v62 h-30 a8 8 0 0 0 -6 4 a8 8 0 0 0 -6 -4 h-30z" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/><path d="M50 24 v58" stroke="currentColor" stroke-width="5"/>'
  };

  /* ---------- Грядки ---------- */
  function bedState(b) {
    if (!b) return { st: "empty" };
    var t = now(), left = b.end - t;
    if (left <= 0) return { st: "ready", stage: 3, left: 0, pct: 100 };
    var pct = Math.min(99, Math.max(0, (1 - left / b.total) * 100));
    return { st: "grow", stage: pct < 30 ? 0 : pct < 70 ? 1 : 2, left: left, pct: pct };
  }
  function seedCost(p) {
    if (p.id === "mint" && F.coins < p.seed && !anyItems() && !anyGrowing()) return 0; // помощь соседа
    return p.seed;
  }
  function anyItems() { return Object.keys(F.store).length > 0; }
  function anyGrowing() { return F.beds.some(function (b) { return !!b; }); }
  function plant(i, id) {
    var p = P[id], cost = seedCost(p);
    if (F.coins < cost) { L().toast("Не хватает монет. Продайте урожай в Лавке."); return; }
    F.coins -= cost;
    var dur = p.t * MIN * speedFor(p.id, "bed");
    if (F.harvested === 0 && F.tut <= 1) dur = 20000; // первая мята для обучения — 20 секунд
    F.beds[i] = { p: id, start: now(), end: now() + dur, total: dur, water: false };
    if (F.up.helper && F.tut > 2) { var hb = F.beds[i]; hb.end = now() + dur * (1 - (F.up.can ? 0.5 : 0.25)); hb.water = true; }
    if (F.tut === 0) F.tut = 1;
    save(); closeSheet(); L().tone(true);
    L().toast("Посажено: " + p.n.toLowerCase() + (cost ? " · −" + coinsWord(cost) : " · семена подарил сосед") + ".");
    renderFarm();
  }
  function water(i) {
    var b = F.beds[i]; if (!b || b.water) return;
    var left = b.end - now(); if (left <= 0) return;
    var k = F.up.can ? 0.5 : 0.25;
    b.end = now() + left * (1 - k); b.water = true; track("water");
    if (F.tut === 1) F.tut = 2;
    save(); L().tone(true);
    L().toast("Полито! Созреет на " + Math.round(k * 100) + "% быстрее.");
    closeSheet(); renderFarm();
  }
  function harvest(i) {
    var b = F.beds[i]; if (!b || bedState(b).st !== "ready") return;
    var p = P[b.p], q = 2;
    add("f:" + p.id, q); F.beds[i] = null; F.harvested++; track("harvest");
    var msg = "Собрано: " + p.n.toLowerCase() + " × " + q + " пучка — в амбаре. +" + p.xp + " опыта";
    if (F.tut <= 2) F.tut = 3;
    gainXp(p.xp, msg);
    save(); L().tone(true); renderFarm();
    var el = document.querySelector('.bed[data-bed="' + i + '"]'); if (el) { el.classList.add("pop"); }
    // мягкое разовое предложение установить игру — после первых урожаев, если не мешает другим окнам
    if (F.harvested <= 5 && window.LZInstall) setTimeout(function () { if (current() === "farm") LZInstall.offer(); }, 3500);
  }
  function gainXp(x, msg) {
    var before = level(); F.xp += x; var after = level();
    if (after > before) {
      var inLv = function (x) { return x.lvl > before && x.lvl <= after; };
      var opened = FD.plants.filter(inLv).map(function (p) { return p.n; });
      var more = FD.areas.filter(inLv).map(function (a) { return "угодье «" + a.n + "»"; })
        .concat(FD.trees.filter(inLv).map(function (t) { return t.n.toLowerCase(); }), FD.forest.filter(inLv).map(function (w) { return w.n.toLowerCase(); }),
          FD.upgrades.filter(inLv).map(function (u) { return "«" + u.n + "»"; }));
      save();
      setTimeout(function () {
        openSheet("Новый уровень!", '<div class="center">' + icon("bed", 90) + '<p class="big-line">Уровень ' + after + ": «" + levelName(after) + "»</p>" +
          (opened.length ? "<p>Открыты новые семена: <b>" + opened.join(", ") + "</b>.</p>" : "") +
          (more.length ? "<p>Теперь доступно: <b>" + more.join(", ") + "</b>.</p>" : "") +
          (!opened.length && !more.length ? "<p>Загляните в «Улучшения» — там появилось новое.</p>" : "") +
          (after >= FD.levelXp.length ? "<p>Это высший уровень! Дальше за опыт вы получаете звёзды «Мастер-травник».</p>" : "") +
          '<button class="btn btn-primary btn-big" data-close>Отлично!</button></div>');
      }, 400);
    }
    var sNow = stars();
    if (sNow > (F.stars || 0)) {
      var gift = FD.starReward * (sNow - (F.stars || 0)); F.stars = sNow; F.coins += gift; save();
      setTimeout(function () { openSheet("Звезда мастера!", '<div class="center"><div class="deco-big" aria-hidden="true">★</div><p class="big-line">Мастер-травник ' + "★".repeat(Math.min(sNow, 10)) + (sNow > 10 ? " × " + sNow : "") + "</p><p>Награда: +" + coinsWord(gift) + '.</p><button class="btn btn-primary btn-big" data-close>Отлично!</button></div>'); }, 400);
    }
    if (msg) L().toast(msg);
  }

  /* ---------- Сушилка ---------- */
  function dryDur(p) { return Math.max(0.5, p.t * 0.5) * MIN * (F.up.fastdry ? 0.6 : 1); }
  function ensureRacks() { if (F.up.rack2 && F.racks.length < 2) F.racks.push([null, null, null]); }
  function slotState(s) { if (!s) return "empty"; return now() >= s.end ? "done" : "dry"; }
  function putDry(r, k, id) {
    var q = Math.min(BATCH, have("f:" + id)); if (!q) return;
    var d = dryDur(P[id]);
    if (F.tut <= 5 && !F.driedOnce) d = Math.min(d, 20000);
    F.racks[r][k] = { h: id, q: q, start: now(), end: now() + d };
    add("f:" + id, -q); F.driedOnce = true; F.st.dried += q; track("dry", q);
    if (F.tut === 4 || F.tut === 5) F.tut = 6;
    save(); closeSheet(); L().tone(true);
    L().toast(P[id].n + " × " + q + " сушится — " + fmtTime(d) + ".");
    renderBarn();
  }
  function takeDry(r, k) {
    var s = F.racks[r][k]; if (slotState(s) !== "done") return;
    add("d:" + s.h, s.q); F.racks[r][k] = null;
    gainXp(2 * s.q, "Сушёные пучки: " + P[s.h].n.toLowerCase() + " × " + s.q + " — в амбаре. +" + (2 * s.q) + " опыта");
    save(); L().tone(true); renderBarn();
  }

  /* ---------- Рецепты ---------- */
  function recipeKey(id) { return id.indexOf(":") > 0 ? id : id === "honey" ? "honey" : "d:" + id; }
  function recipeOpen(r) {
    return Object.keys(r.need).every(function (id) { var k = recipeKey(id); return k.charAt(0) === "t" ? false : keyAvailable(k); });
  }
  function canMake(r) { return Object.keys(r.need).every(function (id) { return have(recipeKey(id)) >= r.need[id]; }); }
  function make(id, times) {
    var r = R[id], done = 0; times = times || 1;
    while (done < times && canMake(r)) { Object.keys(r.need).forEach(function (h) { add(recipeKey(h), -r.need[h]); }); add("t:" + id, 1); done++; }
    if (!done) return;
    F.teas += done; track("make", done);
    var c = r.cat || "tea"; if (c === "jam" || c === "mors" || c === "pastila") { F.st.jams += done; track("jam", done); }
    var xp = Math.round(r.xp * recipeXpMult()) * done;
    gainXp(xp, "Готово: " + r.n + (done > 1 ? " × " + done : "") + "! +" + xp + " опыта");
    save(); L().tone(true); renderBarn();
  }

  /* ---------- Улей ---------- */
  function honeyReady() {
    if (!F.up.beehive) return 0;
    return Math.min(HONEY_MAX, Math.floor((now() - F.hiveAt) / HONEY_EVERY));
  }
  function takeHoney() {
    var n = honeyReady(); if (!n) return;
    add("honey", n); F.st.honey += n; track("honey", n);
    F.hiveAt = n >= HONEY_MAX ? now() : F.hiveAt + n * HONEY_EVERY;
    save(); L().tone(true); L().toast("Мёд × " + n + " — в амбаре.");
    renderFarm();
  }

  /* ---------- Заказы ---------- */
  function orderCandidates(seasonal) {
    var c = availableKeys().map(function (k) { var p = k.charAt(0); return { key: k, w: p === "f" ? 3 : p === "d" || p === "t" ? 2 : p === "honey".charAt(0) && k === "honey" ? 1 : 2 }; });
    if (seasonal) {
      var s = c.filter(function (x) { return isSeasonKey(x.key); });
      if (s.length) return s;
    }
    return c;
  }
  function isSeasonKey(k) {
    var a = k.split(":"), id = a[1];
    if (season().id === "winter" && a[0] === "t") return true;
    if (a[0] === "t") return Object.keys(R[id].need).some(function (n) { return inSeason(recipeKey(n).split(":")[1]); });
    return !!id && inSeason(id);
  }
  function newOrder(slot) {
    var c = orderCandidates(slot === 3), pick;
    if (F.ordersDone === 0 && slot === 0) pick = "f:mint";
    else if (F.ordersDone === 0 && slot === 1) pick = "f:chamomile";
    else if (F.ordersDone === 0 && slot === 2) pick = "d:mint";
    else {
      var used = F.orders.map(function (o) { return o && o.key; });
      var pool = c.filter(function (x) { return used.indexOf(x.key) < 0; });
      var total = pool.reduce(function (a, x) { return a + x.w; }, 0), r = Math.random() * total;
      for (var i = 0; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) { pick = pool[i].key; break; } }
      pick = pick || (pool[0] || c[0]).key;
    }
    var q = qtyFor(pick, 0);
    if (F.ordersDone === 0) q = 2;
    var sea = slot === 3 && isSeasonKey(pick);
    var reward = Math.round(itemPrice(pick) * q * 1.5 * (sea ? FD.seasonBonus : 1) + 5);
    var cust = FD.customers[(slot + F.ordersDone + new Date().getDate()) % FD.customers.length];
    return { key: pick, q: q, reward: reward, xp: Math.max(4, Math.round(reward / 5)), c: cust.n, say: cust.say, next: 0, sea: sea };
  }
  function refreshOrders() {
    var changed = false;
    var slots = F.ordersDone > 0 || F.tut > 3 ? 4 : 3;
    for (var i = 0; i < slots; i++) {
      var o = F.orders[i];
      if (!o || (o.next && now() >= o.next)) { F.orders[i] = newOrder(i); changed = true; }
    }
    if (changed) save();
  }
  function orderPhrase(o) {
    var a = o.key.split(":"), what;
    if (o.key === "honey") what = "мёд";
    else if (a[0] === "f") what = (o.q > 1 ? "свежие пучки " : "свежий пучок ") + P[a[1]].gen;
    else if (a[0] === "d") what = (o.q > 1 ? "сушёные пучки " : "сушёный пучок ") + P[a[1]].gen;
    else if (a[0] === "t") what = R[a[1]].n.replace(/^Чай /, "чай ");
    else what = itemName(o.key).toLowerCase();
    return o.c + " просит: " + what + (o.q > 1 ? " × " + o.q : "");
  }
  function giveOrder(i) {
    var o = F.orders[i]; if (!o || o.next || have(o.key) < o.q) return;
    add(o.key, -o.q);
    var reward = Math.round(o.reward * orderMult());
    F.coins += reward; F.ordersDone++; track("order");
    o.next = now() + 10 * MIN;
    if (F.tut === 3) F.tut = 4;
    gainXp(o.xp, o.c + " благодарит вас! +" + coinsWord(reward) + ", +" + o.xp + " опыта");
    save(); L().tone(true); renderShop();
  }
  function sell(key, all) {
    var q = all ? have(key) : 1; if (!q) return;
    var sum = itemPrice(key) * q;
    add(key, -q); F.coins += sum; F.sold += q; track("sell", q);
    save(); L().tone(true); L().toast("Продано: " + itemName(key) + " × " + q + " · +" + coinsWord(sum));
    renderShop();
  }

  /* ---------- Улучшения ---------- */
  function bedPrice() { var n = F.beds.length - 4; return n >= 0 && n < FD.bedPrices.length ? FD.bedPrices[n] : null; }
  function buyBed() {
    var pr = bedPrice(); if (pr === null) return;
    if (F.coins < pr) { L().toast("Нужно " + coinsWord(pr) + ". Продайте урожай в Лавке."); return; }
    F.coins -= pr; F.beds.push(null); save(); L().tone(true);
    L().toast("Новая грядка готова! Теперь их " + F.beds.length + ".");
    if (current() === "farm") renderFarm(); else renderUpgrades();
  }
  function buyUp(id) {
    var u = U[id]; if (F.up[id]) return;
    if (level() < u.lvl) return;
    if (F.coins < u.price) { L().toast("Нужно " + coinsWord(u.price) + "."); return; }
    F.coins -= u.price; F.up[id] = true;
    if (id === "beehive") F.hiveAt = now();
    if (id === "plot2" || id === "plot3") for (var j = 0; j < 4; j++) F.beds.push(null);
    if (id === "helper") F.beds.forEach(function (b) { if (b && !b.water && b.end > now()) { b.end = now() + (b.end - now()) * (1 - (F.up.can ? 0.5 : 0.25)); b.water = true; } });
    ensureRacks(); save(); L().tone(true);
    L().toast("Куплено: " + u.n + "!");
    renderUpgrades();
  }

  /* ---------- Ежедневное ---------- */
  function checkGift() {
    var today = L().dayKey();
    if (F.giftDay === today || F.tut < 3) return;
    F.giftStreak = F.giftDay === L().yesterdayKey() ? F.giftStreak + 1 : 1;
    F.giftDay = today;
    var sum = 15 + 5 * Math.min(F.giftStreak - 1, 5) + (F.up.bench ? 10 : 0) + (F.sets.warm ? 10 : 0);
    F.coins += sum; save();
    openSheet("Подарок дня", '<div class="center"><div class="gift" aria-hidden="true"></div><p class="big-line">+' + coinsWord(sum) + "</p>" +
      "<p>Вы заходите " + F.giftStreak + " " + L().plural(F.giftStreak, "день", "дня", "дней") + " подряд. Чем дольше серия, тем больше подарок (до 6 дней).</p>" +
      '<button class="btn btn-primary btn-big" data-close>Спасибо!</button></div>');
  }
  function onQuizDone(right) {
    var today = L().dayKey(); if (F.quizDay === today) return 0;
    var sum = 20 + 5 * right; F.quizDay = today; F.coins += sum; track("quiz"); save();
    return sum;
  }
  function onTip() {
    var today = L().dayKey(); if (F.tipDay === today) return;
    F.tipDay = today; F.coins += 5; save();
    L().toast("За совет дня в огород: +5 монет");
  }

  /* ---------- Нижнее окно (лист) ---------- */
  var sheetReturn = null;
  function openSheet(title, html) {
    sheetReturn = document.activeElement;
    $("sheet-title").textContent = title; $("sheet-body").innerHTML = html;
    $("sheet").hidden = false; document.body.classList.add("sheet-open");
    $("sheet-title").focus({ preventScroll: true });
    $("sheet-body").scrollTop = 0;
  }
  function closeSheet() {
    if ($("sheet").hidden) return;
    $("sheet").hidden = true; document.body.classList.remove("sheet-open");
    if (sheetReturn && sheetReturn.focus && document.contains(sheetReturn)) sheetReturn.focus({ preventScroll: true });
  }

  function seedSheet(i) {
    var lv = level(), rows = FD.plants.map(function (p) {
      var cost = seedCost(p), locked = p.lvl > lv, poor = F.coins < cost;
      return '<div class="row-item' + (locked ? " locked" : "") + '">' + plantImg(p, 3, 64) +
        '<div class="row-text"><b>' + p.n + (inSeason(p.id) ? ' <span class="tag">сезон</span>' : "") + "</b><span>Растёт " + (F.harvested === 0 && p.id === "mint" && F.tut <= 1 ? "20 сек (первый урожай)" : fmtTime(p.t * MIN * speedFor(p.id, "bed"))) +
        " · продажа " + coin(p.sell) + "</span>" +
        (locked ? '<span class="lock">Откроется на уровне ' + p.lvl + "</span>" : "") + "</div>" +
        (locked ? '<button class="btn btn-ghost btn-sm" data-card="' + p.id + '">О растении</button>'
          : '<button class="btn btn-primary btn-sm" data-plant="' + p.id + '" data-bed="' + i + '"' + (poor ? " disabled" : "") + ">Посадить<small>" + (cost ? coin(cost) : "бесплатно") + "</small></button>") +
        "</div>";
    }).join("");
    openSheet("Что посадить?", '<p class="muted">У вас ' + coin(F.coins) + ". Нажмите «Посадить» рядом с растением.</p>" + rows);
  }
  function bedSheet(i) {
    var b = F.beds[i], p = P[b.p], st = bedState(b);
    openSheet(p.n, '<div class="center">' + plantImg(p, st.stage, 170) +
      '<p class="big-line">Созреет через <span data-timer="bed" data-i="' + i + '">' + fmtTime(st.left) + "</span></p>" +
      '<div class="progress big"><div class="progress-fill" style="width:' + st.pct.toFixed(0) + '%"></div></div>' +
      "<p class=\"muted\">Растение растёт само, даже когда игра закрыта.</p>" +
      (b.water ? '<p class="ok-line">Уже полито ✓</p>' : '<button class="btn btn-water btn-big" data-water="' + i + '"><span class="drop" aria-hidden="true"></span>Полить (быстрее на ' + (F.up.can ? 50 : 25) + "%)</button>") +
      '<button class="btn btn-ghost btn-big" data-card="' + p.id + '">О растении</button>' +
      '<button class="btn btn-ghost btn-big" data-close>Закрыть</button></div>');
  }
  function drySheet(r, k) {
    var keys = Object.keys(F.store).filter(function (x) { return x.indexOf("f:") === 0; });
    if (!keys.length) {
      openSheet("Сушилка", '<p>Пока нечего сушить. Соберите урожай на грядках — свежие травы появятся в амбаре.</p><button class="btn btn-primary btn-big" data-tab="farm">В огород</button>');
      return;
    }
    openSheet("Что высушить?", '<p class="muted">На одно место помещается до ' + BATCH + " пучков одной травы. Сушёные травы стоят дороже.</p>" + keys.map(function (key) {
      var id = key.slice(2), q = Math.min(BATCH, have(key));
      return '<div class="row-item">' + plantImg(P[id], 3, 56) + '<div class="row-text"><b>' + P[id].n + "</b><span>Есть: " + have(key) + " · сохнет " + fmtTime(dryDur(P[id])) +
        "</span><span>Сушёная: " + coin(itemPrice("d:" + id)) + " за пучок</span></div>" +
        '<button class="btn btn-primary btn-sm" data-dry="' + id + '" data-r="' + r + '" data-k="' + k + '">Сушить × ' + q + "</button></div>";
    }).join(""));
  }

  /* ---------- Отрисовка ---------- */
  function current() { return L() ? L().current() : "home"; }
  function headerHTML() {
    var lv = level(), lo = FD.levelXp[lv - 1], hi = FD.levelXp[lv], st = 0;
    if (hi === undefined) { st = stars(); lo = FD.levelXp[lv - 1] + st * FD.starXp; hi = lo + FD.starXp; }
    var pct = Math.round((F.xp - lo) / (hi - lo) * 100);
    return '<div class="farm-head">' +
      '<div class="fh-coins" aria-label="' + coinsWord(F.coins) + '"><span class="coin big" aria-hidden="true"></span><b>' + F.coins + "</b><span>" + L().plural(F.coins, "монета", "монеты", "монет") + "</span></div>" +
      '<div class="fh-level"><b>Уровень ' + lv + "</b><span>" + (FD.levelXp[lv] === undefined ? "Мастер-травник" : levelName(lv)) + '</span><div class="progress" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="Опыт до следующего уровня"><div class="progress-fill" style="width:' + pct + '%"></div></div><span class="xp-left">' + (FD.levelXp[lv] === undefined ? (st ? "★".repeat(Math.min(st, 5)) + (st > 5 ? "×" + st : "") + " · " : "") + "До звезды мастера" : "До уровня " + (lv + 1)) + ": " + Math.max(0, hi - F.xp) + " опыта</span></div></div>";
  }
  function tutorialText() {
    switch (F.tut) {
      case 0: return { t: "Добро пожаловать в огород! Нажмите на пустую грядку, чтобы посадить семена.", target: "bed-empty" };
      case 1: return { t: "Растение растёт само — даже когда игра закрыта. Нажмите на грядку и полейте его: так оно вырастет быстрее.", target: "bed-grow" };
      case 2: return { t: "Когда на грядке появится надпись «Собрать!», нажмите на неё — урожай отправится в амбар.", target: "bed-ready" };
      case 3: return { t: "Урожай в амбаре! Откройте «Лавку» внизу экрана — " + ((F.orders[0] && F.orders[0].c) || "покупатель") + " ждёт свежие пучки мяты.", target: "tab-shop" };
      case 4: return { t: "Монеты тратьте на семена и улучшения. В «Амбаре» травы можно высушить — сушёные стоят дороже.", target: "tab-barn" };
      case 5: return { t: "В «Амбаре» нажмите на свободное место сушилки и выберите траву.", target: "slot-empty" };
      default: return null;
    }
  }
  function hintHTML(where) {
    var h = tutorialText(); if (!h) return "";
    if (where === "barn" && F.tut === 4) { F.tut = 5; save(); h = tutorialText(); }
    if (where === "shop" && F.tut !== 3) return "";
    if (where === "shop") h = { t: "Нажмите «Отдать» у заказа со свежей мятой — получите монеты и опыт. Лишнее можно продать ниже." };
    if (where === "barn" && F.tut !== 5) return "";
    if (where === "farm" && F.tut === 5) return "";
    return '<div class="tut" role="note"><span class="tut-icon" aria-hidden="true">💡</span><p>' + h.t + '</p>' +
      (F.tut >= 3 ? '<button class="btn-link" data-skiptut>Больше не подсказывать</button>' : "") + "</div>";
  }
  function bedHTML(i) {
    var b = F.beds[i], st = bedState(b), tut = tutorialText(), cls = "bed", inner;
    if (st.st === "empty") {
      inner = '<span class="bed-plus" aria-hidden="true">+</span><span class="bed-label">Посадить</span>';
      cls += " empty"; if (tut && tut.target === "bed-empty" && firstIdx("empty") === i) cls += " pulse";
    } else {
      var p = P[b.p];
      inner = '<span class="bed-plant">' + plantImg(p, st.stage, 118) + "</span>";
      if (st.st === "ready") { cls += " ready"; inner += '<span class="bed-name">' + p.n + '</span><span class="bed-label harvest">Собрать!</span>'; if (tut && tut.target === "bed-ready") cls += " pulse"; }
      else {
        cls += " grow" + (b.water ? " watered" : "");
        inner += '<span class="bed-name">' + p.n + '</span><span class="bed-label"><span data-timer="bed" data-i="' + i + '">' + fmtTime(st.left) + "</span></span>" +
          '<span class="bed-bar"><span style="width:' + st.pct.toFixed(0) + '%"></span></span>' + (b.water ? "" : '<span class="water-chip"><span class="drop" aria-hidden="true"></span>полить</span>');
        if (tut && tut.target === "bed-grow" && !b.water) cls += " pulse";
      }
    }
    var label = st.st === "empty" ? "Пустая грядка — посадить" : st.st === "ready" ? P[b.p].n + " — урожай готов, собрать" : P[b.p].n + " растёт";
    return '<button class="' + cls + '" data-bed="' + i + '" data-sig="' + sig(i) + '" aria-label="Грядка ' + (i + 1) + ": " + label + '">' + inner + "</button>";
  }
  function firstIdx(kind) { for (var i = 0; i < F.beds.length; i++) if (bedState(F.beds[i]).st === kind) return i; return -1; }
  function sig(i) { var b = F.beds[i], st = bedState(b); return st.st + (st.stage || 0) + (b && b.water ? "w" : "") + F.tut; }

  function renderFarm() {
    if (!$("farm-root")) return;
    refreshOrders();
    var beds = F.beds.map(function (_, i) { return bedHTML(i); }).join("");
    var bp = bedPrice();
    if (bp !== null) beds += '<button class="bed buy" data-buybed><span class="bed-plus" aria-hidden="true">+</span><span class="bed-label">Новая грядка</span><span class="bed-price">' + coin(bp) + "</span></button>";
    var readyOrders = F.orders.filter(function (o) { return o && !o.next && have(o.key) >= o.q; }).length;
    var today = L().dayKey();
    var decor = ["bench", "fence", "birdhouse", "beehive", "gazebo", "pond"].filter(function (id) { return F.up[id]; });
    var decos = Object.keys(F.deco).map(function (id) { var d = null; FD.events.concat(FD.sets).forEach(function (x) { if (x.deco.id === id) d = x.deco; }); return d; }).filter(Boolean);
    var yard = decor.length || decos.length ? '<div class="card yard"><h3>Ваш двор</h3><div class="yard-row">' + decor.map(function (id) {
      if (id === "beehive") {
        var n = honeyReady();
        return '<div class="yard-item">' + icon("hive", 64) + "<span>Улей</span>" + (n ? '<button class="btn btn-secondary btn-sm" data-honey>Собрать мёд × ' + n + "</button>" : '<span class="muted small">Мёд через <span data-timer="hive">' + fmtTime(HONEY_EVERY - ((now() - F.hiveAt) % HONEY_EVERY)) + "</span></span>") + "</div>";
      }
      return '<div class="yard-item">' + icon(U[id].icon, 64) + "<span>" + U[id].n + "</span></div>";
    }).join("") + decos.map(function (d) { return '<div class="yard-item"><span class="deco-ic" aria-hidden="true">' + d.ic + "</span><span>" + d.n + "</span></div>"; }).join("") + "</div></div>" : "";
    var vet = F.tut >= 3 || F.harvested > 2;
    $("farm-root").innerHTML = headerHTML() + (vet ? areaTabs("farm") + bannerHTML() : "") + hintHTML("farm") +
      (vet ? goalsHTML() : "") +
      '<h2 class="farm-title">Аптекарский огород</h2>' +
      '<div class="beds" id="beds">' + beds + "</div>" +
      (readyOrders ? '<button class="notice" data-tab="shop">Можно выполнить заказ' + (readyOrders > 1 ? "ы" : "") + " в Лавке (" + readyOrders + ") →</button>" : "") +
      (vet ? dailyHTML() : "") +
      yard +
      '<div class="bonus-list">' +
      '<button class="bonus" data-go="quiz-intro"><span class="bonus-ic" aria-hidden="true">❓</span><span><b>Правда или миф</b><span>' +
      (F.quizDay === today ? "Бонус дня получен ✓" : "Ответьте на 5 вопросов — до +45 монет") + "</span></span></button>" +
      '<button class="bonus" data-go="tip"><span class="bonus-ic" aria-hidden="true">🌿</span><span><b>Совет дня</b><span>' + (F.tipDay === today ? "Прочитан ✓" : "Прочитайте — +5 монет") + "</span></span></button>" +
      "</div>" +
      '<p class="doctor-note">Игра носит познавательный характер. Перед применением трав посоветуйтесь с врачом.</p>';
  }
  function updateFarmLive() {
    var beds = document.querySelectorAll("#beds .bed[data-bed]");
    var needFull = false;
    beds.forEach(function (el) {
      var i = +el.getAttribute("data-bed");
      if (el.getAttribute("data-sig") !== sig(i)) { needFull = true; return; }
      var st = bedState(F.beds[i]);
      var t = el.querySelector("[data-timer]"); if (t) t.textContent = fmtTime(st.left);
      var bar = el.querySelector(".bed-bar span"); if (bar) bar.style.width = st.pct.toFixed(0) + "%";
    });
    var hv = document.querySelector('[data-timer="hive"]');
    if (hv) { if (honeyReady()) needFull = true; else hv.textContent = fmtTime(HONEY_EVERY - ((now() - F.hiveAt) % HONEY_EVERY)); }
    if (document.activeElement && document.activeElement.closest && document.activeElement.closest(".goals, .daily")) needFull = false;
    if (needFull) {
      var focusBed = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute("data-bed");
      renderFarm();
      if (focusBed !== null && focusBed !== undefined) { var f = document.querySelector('.bed[data-bed="' + focusBed + '"]'); if (f) f.focus({ preventScroll: true }); }
    }
  }

  function storeRows(prefix, title, empty) {
    var keys = Object.keys(F.store).filter(function (k) { return prefix === "honey" ? k === "honey" : k.indexOf(prefix) === 0; });
    if (!keys.length) return empty ? "<h3>" + title + '</h3><p class="muted">' + empty + "</p>" : "";
    return "<h3>" + title + '</h3><div class="store-grid">' + keys.map(function (k) {
      return '<div class="store-item">' + itemIcon(k, 48) + '<span class="si-name">' + itemName(k) + '</span><span class="si-count">× ' + have(k) + "</span></div>";
    }).join("") + "</div>";
  }
  function renderBarn() {
    if (!$("barn-root")) return;
    ensureRacks();
    var racks = F.racks.map(function (rack, r) {
      return '<div class="rack"><div class="rack-title">' + icon("rack", 40) + "<b>Сушилка " + (F.racks.length > 1 ? "№" + (r + 1) : "") + '</b></div><div class="slots">' +
        rack.map(function (s, k) {
          var st = slotState(s);
          if (st === "empty") return '<button class="slot empty' + (F.tut === 5 && r === 0 && k === firstEmptySlot() ? " pulse" : "") + '" data-slot="' + r + "-" + k + '"><span class="bed-plus" aria-hidden="true">+</span><span>Положить траву</span></button>';
          var p = P[s.h];
          if (st === "done") return '<button class="slot done" data-slot="' + r + "-" + k + '">' + plantImg(p, 3, 56, "dried") + "<span><b>" + p.n + " × " + s.q + '</b></span><span class="harvest">Снять</span></button>';
          var pct = Math.min(99, (now() - s.start) / (s.end - s.start) * 100);
          return '<div class="slot dry" data-slotdry="' + r + "-" + k + '">' + plantImg(p, 3, 56, "dried") + "<span><b>" + p.n + " × " + s.q + '</b></span><span data-timer="slot" data-r="' + r + '" data-k="' + k + '">' + fmtTime(s.end - now()) + '</span><span class="bed-bar"><span style="width:' + pct.toFixed(0) + '%"></span></span></div>';
        }).join("") + "</div></div>";
    }).join("");
    var CATS = [["tea", "Чаи и сборы"], ["jam", "Варенье"], ["mors", "Морсы и напитки"], ["pastila", "Пастила"], ["honeymix", "Медовые сборы"], ["candle", "Из воска"], ["mush", "Грибные заготовки"]];
    var recipes = CATS.map(function (cat) {
      var list = FD.recipes.filter(function (r) { return (r.cat || "tea") === cat[0] && recipeOpen(r); });
      if (!list.length) return "";
      return '<h4 class="rcat">' + cat[1] + "</h4>" + list.map(function (r) {
        var ok = canMake(r);
        return '<div class="recipe' + (ok ? " can" : "") + '">' + recipeIcon(r, 52) + '<div class="row-text"><b>' + r.n + '</b><span class="need">' +
          Object.keys(r.need).map(function (id) {
            var key = recipeKey(id), h = have(key), n = r.need[id];
            return '<span class="' + (h >= n ? "have" : "miss") + '">' + itemShort(key) + " " + Math.min(h, n) + "/" + n + "</span>";
          }).join("") + "</span><span>Цена: " + coin(itemPrice("t:" + r.id)) + "</span></div>" +
          '<button class="btn btn-primary btn-sm" data-make="' + r.id + '"' + (ok ? "" : " disabled") + ">Собрать</button>" +
          (F.up.bigtable ? '<button class="btn btn-ghost btn-sm" data-make3="' + r.id + '"' + (ok ? "" : " disabled") + ">Собрать × 3</button>" : "") + "</div>";
      }).join("");
    }).join("");
    var lockedRecipes = FD.recipes.length - FD.recipes.filter(recipeOpen).length;
    $("barn-root").innerHTML = headerHTML() + hintHTML("barn") +
      '<h2 class="farm-title">Амбар</h2>' +
      '<div class="card"><h3 class="first">Сушилка</h3><p class="muted">Свежие травы сохнут здесь и потом стоят дороже.</p>' + racks + "</div>" +
      '<div class="card"><h3 class="first">' + (F.up.bigtable ? "Большой стол рецептов" : "Стол рецептов") + '</h3><p class="muted">Чаи — из сушёных трав, варенье и морсы — из ягод и плодов сада и леса.</p>' + (recipes || "<p>Скоро здесь появятся рецепты.</p>") +
      (lockedRecipes ? '<p class="muted small">Ещё ' + lockedRecipes + " " + L().plural(lockedRecipes, "рецепт откроется", "рецепта откроются", "рецептов откроются") + " с новыми растениями.</p>" : "") + "</div>" +
      '<div class="card"><h3 class="first">Запасы</h3>' +
      storeRows("f:", "Свежие травы", "Пока пусто — соберите урожай на грядках.") + storeRows("d:", "Сушёные травы", "Положите свежие травы в сушилку.") +
      storeRows("o:", "Плоды сада", "") + storeRows("w:", "Дары леса", "") + storeRows("h:", "Мёд пасеки", "") + storeRows("x:", "Воск и перга", "") +
      storeRows("t:", "Чаи, варенье и заготовки", "") + storeRows("honey", "Мёд", "") + "</div>" +
      '<p class="doctor-note">Названия чаёв — игровые. Перед применением трав посоветуйтесь с врачом.</p>';
  }
  function itemIconColor(r) { var f = Object.keys(r.need)[0]; return r.col ? r.col : f === "honey" ? "#e8a92a" : (P[f].fl === "#ffffff" ? "#f2c230" : P[f].fl); }
  function firstEmptySlot() { var r = F.racks[0]; for (var k = 0; k < r.length; k++) if (!r[k]) return k; return -1; }
  function updateBarnLive() {
    var need = false;
    document.querySelectorAll('[data-timer="slot"]').forEach(function (el) {
      var s = F.racks[+el.getAttribute("data-r")][+el.getAttribute("data-k")];
      if (!s || now() >= s.end) { need = true; return; }
      el.textContent = fmtTime(s.end - now());
      var bar = el.parentNode.querySelector(".bed-bar span"); if (bar) bar.style.width = Math.min(99, (now() - s.start) / (s.end - s.start) * 100).toFixed(0) + "%";
    });
    if (need) renderBarn();
  }

  var shopTab = "orders";
  function renderShop() {
    if (!$("shop-root")) return;
    refreshOrders();
    var lv = level(), tabs = [["orders", "Покупатели", 1], ["pharmacy", "Аптека", 5], ["fair", "Ярмарка", 4], ["convoy", "Обоз", 7]];
    if (F.tut < 3 && F.ordersDone === 0) shopTab = "orders";
    var tabHTML = F.ordersDone > 0 || F.tut > 3 ? '<div class="seg shop-seg" role="tablist" aria-label="Разделы Лавки">' + tabs.map(function (t) {
      return '<button class="seg-b' + (shopTab === t[0] ? " on" : "") + '" role="tab" aria-selected="' + (shopTab === t[0]) + '" data-shoptab2="' + t[0] + '">' + t[1] + (lv < t[2] ? "<small>🔒 ур. " + t[2] + "</small>" : "") + "</button>";
    }).join("") + "</div>" : "";
    if (shopTab !== "orders") {
      $("shop-root").innerHTML = headerHTML() + '<h2 class="farm-title">Лавка</h2>' + tabHTML + (shopTab === "pharmacy" ? contractHTML() : shopTab === "fair" ? fairHTML() : convoyHTML());
      return;
    }
    var orders = F.orders.map(function (o, i) {
      if (o.next) return '<div class="order waiting"><div class="avatar" aria-hidden="true">…</div><div class="row-text"><b>Следующий покупатель</b><span>придёт через <span data-timer="order" data-i="' + i + '">' + fmtTime(o.next - now()) + "</span></span></div></div>";
      var h = have(o.key), ok = h >= o.q;
      return '<div class="order' + (ok ? " can" : "") + (o.sea ? " sea" : "") + '">' + custImg(o) + '<div class="row-text">' + (o.sea ? '<span class="tag sea-tag">' + season().ic + " Сезонный заказ · +25%</span>" : "") + "<b>" + esc(orderPhrase(o)) + '</b><span class="say">«' + esc(o.say) + "»</span>" +
        '<span class="order-need">' + itemIcon(o.key, 34) + " У вас: " + h + " из " + o.q + "</span><span>Награда: " + coin(Math.round(o.reward * orderMult())) + " и " + o.xp + " опыта</span></div>" +
        '<button class="btn btn-secondary btn-sm" data-order="' + i + '"' + (ok ? "" : " disabled") + ">Отдать</button></div>";
    }).join("");
    var keys = Object.keys(F.store).sort();
    var sellRows = keys.length ? keys.map(function (k) {
      return '<div class="row-item">' + itemIcon(k, 52) + '<div class="row-text"><b>' + itemName(k) + "</b><span>Есть: " + have(k) + " · " + coin(itemPrice(k)) + ' за штуку</span></div><div class="sell-btns">' +
        '<button class="btn btn-ghost btn-sm" data-sell="' + k + '">Продать 1</button>' + (have(k) > 1 ? '<button class="btn btn-primary btn-sm" data-sellall="' + k + '">Все: ' + coin(itemPrice(k) * have(k)) + "</button>" : "") + "</div></div>";
    }).join("") : '<p class="muted">Пока нечего продавать. Соберите урожай в огороде.</p>';
    $("shop-root").innerHTML = headerHTML() + hintHTML("shop") +
      '<h2 class="farm-title">Лавка</h2>' + tabHTML + eventOrderHTML() +
      '<div class="card"><h3 class="first">Заказы покупателей</h3><p class="muted">За заказ платят больше, чем при обычной продаже, и дают опыт.</p>' + orders + "</div>" +
      '<div class="card"><h3 class="first">Продать</h3>' + sellRows + "</div>";
  }
  function updateShopLive() {
    var need = false;
    document.querySelectorAll('[data-timer="order"]').forEach(function (el) {
      var o = F.orders[+el.getAttribute("data-i")]; if (!o || !o.next || now() >= o.next) { need = true; return; }
      el.textContent = fmtTime(o.next - now());
    });
    if (need) renderShop();
  }

  function renderUpgrades() {
    if (!$("upgrades-root")) return;
    var lv = level(), bp = bedPrice();
    var areas = FD.areas.map(function (a) {
      var owned = F.areas[a.id], locked = lv < a.lvl;
      return '<div class="row-item' + (locked ? " locked" : "") + '"><img class="row-img" src="img/plants/' + a.img + '.svg" alt="" loading="lazy" decoding="async"><div class="row-text"><b>' + a.n + "</b><span>" + a.d + "</span>" +
        (locked ? '<span class="lock">Откроется на уровне ' + a.lvl + "</span>" : "") + "</div>" +
        (owned ? '<button class="btn btn-ghost btn-sm" data-tab="' + a.id + '">Перейти</button>' : locked ? "" : '<button class="btn btn-primary btn-sm" data-area="' + a.id + '"' + (F.coins < a.price ? " disabled" : "") + ">Открыть<small>" + coin(a.price) + "</small></button>") + "</div>";
    }).join("");
    var op = orchardSlotPrice(), hp = hivePrice();
    if (F.areas.orchard) areas += '<div class="row-item">' + plantImg(T.apple, 3, 56) + '<div class="row-text"><b>Место в саду</b><span>Сейчас мест: ' + F.orchard.length + " из " + (FD.orchardSlots.start + FD.orchardSlots.prices.length) + "</span></div>" +
      (op === null ? '<span class="owned">Все места ✓</span>' : '<button class="btn btn-primary btn-sm" data-buyoslot' + (F.coins < op ? " disabled" : "") + ">Купить<small>" + coin(op) + "</small></button>") + "</div>";
    if (F.areas.apiary) areas += '<div class="row-item"><img class="row-img" src="img/plants/hive.svg" alt="" loading="lazy" decoding="async"><div class="row-text"><b>Ещё один улей</b><span>Сейчас ульев: ' + F.hives.length + " из " + (FD.hiveSlots.start + FD.hiveSlots.prices.length) + "</span></div>" +
      (hp === null ? '<span class="owned">Все ульи ✓</span>' : '<button class="btn btn-primary btn-sm" data-buyhive' + (F.coins < hp ? " disabled" : "") + ">Купить<small>" + coin(hp) + "</small></button>") + "</div>";
    var rows = '<div class="row-item">' + icon("bed", 56) + '<div class="row-text"><b>Новая грядка</b><span>Сейчас грядок: ' + F.beds.length + " из " + maxBeds() + (F.up.plot3 ? "" : " · ещё 4 + 4 — «Второй» и «Третий участок»") + "</span></div>" +
      (bp === null ? '<span class="owned">' + (F.beds.length >= 20 ? "Все грядки ✓" : "Купите участок ↓") + "</span>" : '<button class="btn btn-primary btn-sm" data-buybed' + (F.coins < bp ? " disabled" : "") + ">Купить<small>" + coin(bp) + "</small></button>") + "</div>";
    var groups = ["Огород", "Амбар", "Кухня", "Сад", "Пасека", "Лес", "Двор"];
    var byG = groups.map(function (g) {
      var list = FD.upgrades.filter(function (u) { return u.g === g; }).sort(function (a, b) { return a.lvl - b.lvl; });
      if (!list.length) return "";
      return '<h3 class="upg">' + g + "</h3>" + (g === "Огород" ? rows : "") + list.map(function (u) {
        var owned = F.up[u.id], locked = lv < u.lvl;
        return '<div class="row-item' + (locked ? " locked" : "") + (!owned && !locked ? " new" : "") + '">' + icon(u.icon, 56) + '<div class="row-text"><b>' + u.n + (u.decor ? ' <span class="tag">украшение</span>' : "") + "</b><span>" + u.d + "</span>" +
          (locked ? '<span class="lock">Откроется на уровне ' + u.lvl + "</span>" : "") + "</div>" +
          (owned ? '<span class="owned">Куплено ✓</span>' : locked ? "" : '<button class="btn btn-primary btn-sm" data-up="' + u.id + '"' + (F.coins < u.price ? " disabled" : "") + ">Купить<small>" + coin(u.price) + "</small></button>") + "</div>";
      }).join("");
    }).join("");
    $("upgrades-root").innerHTML = headerHTML() + '<h2 class="farm-title">Улучшения</h2><div class="card"><h3 class="first">Угодья</h3>' + areas + "</div><div class=\"card\">" + byG + "</div>";
  }
  function renderGuide() {
    if (!$("guide-root")) return;
    var lv = level();
    $("guide-root").innerHTML = headerHTML() + '<h2 class="farm-title">Справочник растений</h2><p class="muted center">Нажмите на растение, чтобы прочитать о нём.</p><div class="guide-grid">' +
      FD.plants.map(function (p) {
        return '<button class="guide-item' + (p.lvl > lv ? " locked" : "") + '" data-card="' + p.id + '">' + plantImg(p, 3, 84) + "<b>" + p.n + "</b>" + (p.lvl > lv ? "<span>с уровня " + p.lvl + "</span>" : "") + "</button>";
      }).join("") + '</div><p class="doctor-note">Перед применением любых трав посоветуйтесь с врачом.</p>';
  }
  var cardId = "mint";
  function renderPlant() {
    var p = P[cardId]; if (!$("plant-root") || !p) return;
    $("plant-root").innerHTML = '<div class="card center plant-card"><span class="pill">Карточка растения</span>' +
      '<div class="plant-stages">' + [0, 1, 2, 3].map(function (s) { return plantImg(p, s, s === 3 ? 150 : 72); }).join("") + "</div>" +
      "<h2>" + p.n + '</h2><div class="gold-line"></div>' +
      '<div class="chips"><span>Растёт ' + minutesText(p.t) + "</span><span>Семена " + coin(p.seed) + "</span><span>Урожай " + coin(p.sell) + "</span><span>С уровня " + p.lvl + "</span></div>" +
      '<ul class="facts">' + p.facts.map(function (f) { return "<li>" + f + "</li>"; }).join("") + "</ul>" +
      '<p class="doctor-note">Сведения даны для знакомства с растением. Перед применением посоветуйтесь с врачом.</p>' +
      '<button class="btn btn-primary btn-big" data-back="prev">← Назад</button></div>';
  }

  function renderHomeCard() {
    var el = $("farm-status"); if (!el) return;
    var ready = F.beds.filter(function (b) { return bedState(b).st === "ready"; }).length;
    var empty = F.beds.filter(function (b) { return !b; }).length;
    el.textContent = F.tut === 0 ? "Посадите первую мяту!" : ready ? "Урожай готов на " + ready + " " + L().plural(ready, "грядке", "грядках", "грядках") + "!" :
      empty ? "Есть свободные грядки: " + empty : "Растения растут · " + coinsWord(F.coins);
    var t = $("farm-thumb"); if (t && !t.innerHTML) t.innerHTML = '<span class="thumb-bed">' + plantImg(P.chamomile, 3, 50) + plantImg(P.mint, 3, 50) + plantImg(P.calendula, 3, 50) + "</span>";
  }

  /* ---------- Навигация внутри огорода ---------- */
  function onShow(name) {
    var inFarm = FARM_SCREENS.indexOf(name) >= 0;
    document.body.classList.toggle("farm-mode", inFarm);
    closeSheet();
    document.querySelectorAll("#farm-nav [data-tab]").forEach(function (b) {
      var t = b.getAttribute("data-tab"), on = t === name || ((name === "plant" || name === "guide") && t === "collection") || (AREA_SCREENS.indexOf(name) >= 0 && t === "farm");
      b.classList.toggle("on", on); if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
      b.classList.toggle("pulse", !!(tutorialText() && tutorialText().target === "tab-" + t && name !== t));
    });
    if (name === "farm") { renderFarm(); setTimeout(function () { if (current() !== "farm") return; if (F.news) showNews(); else checkGift(); }, 500); }
    if (name === "orchard") renderOrchard();
    if (name === "apiary") renderApiary();
    if (name === "forest") renderForest();
    if (name === "collection") renderCollection();
    if (name === "barn") renderBarn();
    if (name === "shop") renderShop();
    if (name === "upgrades") renderUpgrades();
    if (name === "guide") renderGuide();
    if (name === "plant") renderPlant();
    if (name === "home") renderHomeCard();
    if (name === "tip") onTip();
  }
  function navPulse() {
    var name = current();
    document.querySelectorAll("#farm-nav [data-tab]").forEach(function (b) {
      var t = b.getAttribute("data-tab");
      b.classList.toggle("pulse", !!(tutorialText() && tutorialText().target === "tab-" + t && name !== t));
    });
  }

  var tickN = 0;
  function tick() {
    var c = current();
    if (c === "farm") updateFarmLive();
    else if (c === "barn") updateBarnLive();
    else if (c === "shop") updateShopLive();
    if (AREA_SCREENS.indexOf(c) >= 0 || c === "shop") updateEnds();
    else if (!$("sheet").hidden) updateEnds();
    if (++tickN % 3 === 0 && FARM_SCREENS.indexOf(c) >= 0 && !F.news && checkAch(false).length) { if ($("sheet").hidden) rerender(); }
    if (!$("sheet").hidden) {
      var t = $("sheet-body").querySelector('[data-timer="bed"]');
      if (t) { var b = F.beds[+t.getAttribute("data-i")]; if (!b || bedState(b).st === "ready") closeSheet(); else { t.textContent = fmtTime(b.end - now()); var pf = $("sheet-body").querySelector(".progress-fill"); if (pf) pf.style.width = bedState(b).pct.toFixed(0) + "%"; } }
    }
    navPulse();
  }

  function bind() {
    document.addEventListener("click", function (e) {
      var t = e.target, el;
      if ((el = t.closest("[data-shoptab2]"))) { shopTab = el.getAttribute("data-shoptab2"); renderShop(); var sb = document.querySelector('[data-shoptab2="' + shopTab + '"]'); if (sb) sb.focus({ preventScroll: true }); return; }
      if ((el = t.closest("[data-tab]"))) {
        e.preventDefault(); closeSheet();
        var tab = el.getAttribute("data-tab"), anchor = el.getAttribute("data-anchor");
        if (el.getAttribute("data-shoptab")) shopTab = el.getAttribute("data-shoptab"); else if (tab === "shop" && el.closest("#farm-nav")) shopTab = shopTab || "orders";
        if (tab === current()) { rerender(); } else L().go(tab, FARM_SCREENS.indexOf(current()) >= 0 && current() !== "plant");
        if (anchor) setTimeout(function () { var a = $(anchor); if (a) a.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
        return;
      }
      if ((el = t.closest("[data-close]")) || t === $("sheet")) { closeSheet(); return; }
      if ((el = t.closest("[data-card]"))) { cardId = el.getAttribute("data-card"); closeSheet(); L().go("plant"); return; }
      if ((el = t.closest("[data-plant]"))) { plant(+el.getAttribute("data-bed"), el.getAttribute("data-plant")); return; }
      if ((el = t.closest("[data-water]"))) { water(+el.getAttribute("data-water")); return; }
      if ((el = t.closest("[data-buybed]"))) { buyBed(); return; }
      if ((el = t.closest(".bed[data-bed]"))) {
        var i = +el.getAttribute("data-bed"), st = bedState(F.beds[i]).st;
        if (st === "empty") seedSheet(i); else if (st === "ready") harvest(i); else bedSheet(i);
        return;
      }
      if ((el = t.closest("[data-slot]"))) {
        var a = el.getAttribute("data-slot").split("-").map(Number);
        if (slotState(F.racks[a[0]][a[1]]) === "done") takeDry(a[0], a[1]); else drySheet(a[0], a[1]);
        return;
      }
      if ((el = t.closest("[data-dry]"))) { putDry(+el.getAttribute("data-r"), +el.getAttribute("data-k"), el.getAttribute("data-dry")); return; }
      if ((el = t.closest("[data-make]"))) { make(el.getAttribute("data-make")); return; }
      if ((el = t.closest("[data-make3]"))) { make(el.getAttribute("data-make3"), 3); return; }
      if ((el = t.closest("[data-area]"))) { buyArea(el.getAttribute("data-area")); return; }
      if ((el = t.closest("[data-otree]"))) {
        var oi = +el.getAttribute("data-otree"), ost = treeState(F.orchard[oi]).st;
        if (ost === "empty") treeSheet(oi); else if (ost === "ready") harvestTree(oi); else treeInfoSheet(oi);
        return;
      }
      if ((el = t.closest("[data-tree]"))) { plantTree(+el.getAttribute("data-slot-o"), el.getAttribute("data-tree")); return; }
      if ((el = t.closest("[data-wtree]"))) { waterTree(+el.getAttribute("data-wtree")); return; }
      if ((el = t.closest("[data-cleartree]"))) { clearTree(+el.getAttribute("data-cleartree")); return; }
      if ((el = t.closest("[data-buyoslot]"))) { buyOrchardSlot(); return; }
      if ((el = t.closest("[data-buyhive]"))) { buyHive(); return; }
      if ((el = t.closest("[data-takehive]"))) { takeHive(+el.getAttribute("data-takehive")); return; }
      if ((el = t.closest("[data-htype]"))) { setHiveType(+el.getAttribute("data-hive"), el.getAttribute("data-htype")); return; }
      if ((el = t.closest("[data-gather]"))) { gather(el.getAttribute("data-gather")); return; }
      if ((el = t.closest("[data-wcard]"))) { wildSheet(el.getAttribute("data-wcard")); return; }
      if ((el = t.closest("[data-chest]"))) { claimChest(); return; }
      if ((el = t.closest("[data-weekchest]"))) { claimWeekChest(); return; }
      if ((el = t.closest("[data-evgive]"))) { giveEvent(); return; }
      if ((el = t.closest("[data-cline]"))) { deliverLine(+el.getAttribute("data-cline")); return; }
      if ((el = t.closest("[data-fair]"))) { fairSell(+el.getAttribute("data-fair"), el.getAttribute("data-n")); return; }
      if ((el = t.closest("[data-crate]"))) { fillSlot(+el.getAttribute("data-crate")); return; }
      if ((el = t.closest("[data-sendconvoy]"))) { sendConvoy(); return; }
      if ((el = t.closest("[data-set]"))) { claimSet(el.getAttribute("data-set")); return; }
      if ((el = t.closest("[data-order]"))) { giveOrder(+el.getAttribute("data-order")); return; }
      if ((el = t.closest("[data-sell]"))) { sell(el.getAttribute("data-sell"), false); return; }
      if ((el = t.closest("[data-sellall]"))) { sell(el.getAttribute("data-sellall"), true); return; }
      if ((el = t.closest("[data-up]"))) { buyUp(el.getAttribute("data-up")); return; }
      if ((el = t.closest("[data-honey]"))) { takeHoney(); return; }
      if ((el = t.closest("[data-skiptut]"))) { F.tut = 9; save(); L().show(current()); return; }
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });
    setInterval(tick, 1000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) tick(); });
    var nav = $("farm-nav");
    if (nav) nav.innerHTML = [["farm", "Угодья"], ["barn", "Амбар"], ["shop", "Лавка"], ["upgrades", "Улучшения"], ["collection", "Травник"]].map(function (x) {
      return '<button data-tab="' + x[0] + '">' + svg(NAV_ICONS[x[0] === "collection" ? "guide" : x[0]], 30, "nav-ic") + "<span>" + x[1] + "</span></button>";
    }).join("");
  }

  /* ======================= v4: сезоны, праздники, угодья, Травник, большие заказы ======================= */
  var DAY = 864e5;
  function today() { return window.LZ_FAKE_DATE ? new Date(window.LZ_FAKE_DATE) : new Date(); }
  function dayNum(d) { d = d || today(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY); }
  function weekNum() { return Math.floor((dayNum() + 3) / 7); }
  function daysLeftInWeek() { return 7 - ((dayNum() + 3) % 7); }
  function daysWord(n) { return n + " " + L().plural(n, "день", "дня", "дней"); }
  /* Сезоны по настоящему календарю: дек–фев зима, мар–май весна, июн–авг лето, сен–ноя осень */
  function seasonIdx(m) { return Math.floor(((m + 10) % 12) / 3); }
  function season() { return FD.seasons[seasonIdx(today().getMonth())]; }
  function nextSeason() { return FD.seasons[(seasonIdx(today().getMonth()) + 1) % 4]; }
  function daysLeftInSeason() {
    var d = today(), m = d.getMonth(), y = d.getFullYear(), nm = m + 1;
    while (nm % 3 !== 2) nm++;
    return Math.max(1, Math.round((Date.UTC(y, nm, 1) - Date.UTC(y, m, d.getDate())) / DAY));
  }
  function inSeason(id) { return season().fast.indexOf(id) >= 0; }
  function stars() { return level() >= FD.levelXp.length ? Math.floor((F.xp - FD.levelXp[FD.levelXp.length - 1]) / FD.starXp) : 0; }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var x = seed || 1; return function () { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; }; }
  function pickN(arr, n, rnd) { var a = arr.slice(), out = []; rnd = rnd || Math.random; while (a.length && out.length < n) out.push(a.splice(Math.floor(rnd() * a.length), 1)[0]); return out; }
  function rint(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  /* ---------- Праздники (реальный календарь) ---------- */
  function orthodoxEaster(y) {
    var a = y % 4, b = y % 7, c = y % 19, d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
    var m = Math.floor((d + e + 114) / 31), day = ((d + e + 114) % 31) + 1;
    return dayNum(new Date(y, m - 1, day)) + 13; /* юлианская дата → григорианская (1900–2099) */
  }
  function eventWindows(y) {
    var e = orthodoxEaster(y), dn = function (m, d) { return dayNum(new Date(y, m - 1, d)); };
    return [
      { id: "newyear", from: dn(1, 1) - 7, to: dn(1, 8) }, { id: "mar8", from: dn(3, 5), to: dn(3, 9) },
      { id: "maslenitsa", from: e - 55, to: e - 49 }, { id: "easter", from: e - 3, to: e + 3 },
      { id: "honeyspas", from: dn(8, 12), to: dn(8, 16) }, { id: "applespas", from: dn(8, 17), to: dn(8, 21) },
      { id: "elders", from: dn(9, 28), to: dn(10, 3) }, { id: "pokrov", from: dn(10, 12), to: dn(10, 16) },
      { id: "newyear", from: dn(12, 25), to: dn(12, 31) + 8 }
    ];
  }
  function activeEvent() {
    var t = dayNum(), w = eventWindows(today().getFullYear());
    for (var i = 0; i < w.length; i++) if (t >= w[i].from && t <= w[i].to) return { ev: EV[w[i].id], key: w[i].id + ":" + w[i].from, left: w[i].to - t + 1 };
    return null;
  }
  function nextEvent() {
    var t = dayNum(), y = today().getFullYear(), w = eventWindows(y).concat(eventWindows(y + 1)), best = null;
    w.forEach(function (x) { if (x.from > t && (!best || x.from < best.from)) best = x; });
    return best ? { ev: EV[best.id], days: best.from - t } : null;
  }

  /* ---------- Доступность предметов ---------- */
  function keyAvailable(key) {
    var lv = level();
    if (key === "honey") return !!F.up.beehive;
    var a = key.split(":"), id = a[1];
    switch (a[0]) {
      case "f": case "d": return !!P[id] && P[id].lvl <= lv;
      case "o": return !!F.areas.orchard && !!T[id] && T[id].lvl <= lv;
      case "w": return !!F.areas.forest && !!W[id] && W[id].lvl <= lv;
      case "h": return !!F.areas.apiary && (id !== "buckwheat" || !!F.up.buckwheat);
      case "x": return !!F.areas.apiary && (!BG[id].lvl || BG[id].lvl <= lv);
      case "t": return !!R[id] && recipeOpen(R[id]);
    }
    return false;
  }
  function availableKeys() {
    var c = [];
    FD.plants.forEach(function (p) { c.push("f:" + p.id, "d:" + p.id); });
    FD.trees.forEach(function (t) { c.push("o:" + t.id); });
    FD.forest.forEach(function (w) { c.push("w:" + w.id); });
    FD.honey.forEach(function (h) { c.push("h:" + h.id); });
    FD.beeGoods.forEach(function (h) { c.push("x:" + h.id); });
    FD.recipes.forEach(function (r) { c.push("t:" + r.id); });
    c.push("honey");
    return c.filter(keyAvailable);
  }
  function qtyFor(key, big) {
    var p = key.charAt(0);
    if (big === 2) return p === "f" ? rint(8, 12) : p === "d" ? rint(5, 8) : p === "t" ? rint(2, 3) : rint(4, 6);
    if (big === 1) return p === "f" ? rint(5, 8) : p === "d" ? rint(3, 5) : p === "t" ? rint(1, 2) : rint(3, 4);
    return p === "f" ? rint(2, 4) : p === "d" ? rint(1, 3) : p === "t" ? 1 : (p === "o" || p === "w") ? rint(3, 5) : rint(1, 2);
  }
  function itemShort(key) {
    var a = key.split(":"), id = a[1];
    if (key === "honey") return "мёд";
    if (a[0] === "d") return P[id].n.toLowerCase() + " суш.";
    if (a[0] === "f") return P[id].n.toLowerCase();
    return itemName(key).toLowerCase();
  }
  function seen(key) { return !!F.seen[key]; }

  /* ---------- Скорость роста и множители ---------- */
  function speedFor(id, where) {
    var k = 1;
    if (where === "bed") { if (F.up.birdhouse) k *= 0.9; if (F.up.greenhouse) k *= 0.85; }
    if (where === "orchard" && F.sets.summer) k *= 0.9;
    if (where === "forest" && F.sets.woods) k *= 0.9;
    if (F.up.pond) k *= 0.95;
    if (inSeason(id)) k *= FD.seasonFast;
    return k;
  }
  function catOf(key) { var a = key.split(":"); return a[0] === "t" ? (R[a[1]].cat || "tea") : a[0]; }
  function priceMult(key) {
    var a = key.split(":"), k = 1, c;
    if ((a[0] === "f" || a[0] === "d") && F.sets.pharmacy) k *= 1.05;
    if (a[0] === "t") {
      c = catOf(key);
      if (c === "tea" && F.sets.tea) k *= 1.05;
      if ((c === "jam" || c === "mors" || c === "pastila") && F.sets.jams) k *= 1.1;
      if ((c === "jam" || c === "mors" || c === "pastila" || c === "mush") && F.up.cellar) k *= 1.15;
    }
    return k;
  }
  function orderMult() { var k = 1; if (F.up.fence) k *= 1.1; if (F.up.gazebo) k *= 1.1; if (F.sets.autumn) k *= 1.05; return k; }
  function recipeXpMult() { var k = 1; if (F.up.bigtable) k *= 1.1; if (F.up.kitchen) k *= 1.2; return k; }
  function maxBeds() { return MAX_BEDS + (F.up.plot2 ? 4 : 0) + (F.up.plot3 ? 4 : 0); }

  /* ---------- Задания дня ---------- */
  var chestToast = false;
  function ensureDaily() {
    var d = L().dayKey(), w = weekNum();
    if (!F.daily) F.daily = {};
    if (F.daily.week !== w) { F.daily.week = w; F.daily.days = 0; F.daily.weekChest = false; }
    if (F.daily.day !== d) {
      var pool = FD.dailyTasks.filter(function (t) {
        if (t.area && !F.areas[t.area]) return !!(t.id === "honey" && F.up.beehive) || !!(t.id === "jam" && F.areas.forest);
        if (t.noHelper && F.up.helper) return false;
        if (t.id === "make") return FD.recipes.some(recipeOpen);
        return true;
      });
      F.daily.day = d; F.daily.chest = false; chestToast = false;
      F.daily.tasks = pickN(pool, 3, rng(hashStr(d))).map(function (t) { return { id: t.id, n: t.n, p: 0 }; });
    }
  }
  function track(type, n) {
    if (!L()) return;
    ensureDaily(); n = n || 1;
    F.daily.tasks.forEach(function (t) { if (t.id === type) t.p = Math.min(t.n, t.p + n); });
    if (dailyDone() && !F.daily.chest && !chestToast) { chestToast = true; setTimeout(function () { L().toast("Задания дня выполнены — откройте сундучок в огороде!"); }, 2600); }
  }
  function dailyDone() { return F.daily && F.daily.tasks && F.daily.tasks.every(function (t) { return t.p >= t.n; }); }
  function taskText(t) { var d = null; FD.dailyTasks.forEach(function (x) { if (x.id === t.id) d = x; }); return d.t.replace("{n}", t.n); }
  function claimChest() {
    ensureDaily(); if (!dailyDone() || F.daily.chest) return;
    var lv = level(), sum = 40 + 8 * lv, xp = 15 + 2 * lv;
    var gifts = availableKeys().filter(function (k) { return k.charAt(0) === "f" || k.charAt(0) === "o" || k.charAt(0) === "w"; });
    var g = gifts[Math.floor(Math.random() * gifts.length)] || "f:mint";
    add(g, 2); F.coins += sum; F.daily.chest = true; F.daily.days = (F.daily.days || 0) + 1; F.st.chests++;
    gainXp(xp); save(); L().tone(true);
    openSheet("Сундучок дня", '<div class="center"><div class="chest" aria-hidden="true"></div><p class="big-line">+' + coinsWord(sum) + ", +" + xp + " опыта</p>" +
      '<p class="gift-item">' + itemIcon(g, 56) + "<span>И в подарок: " + esc(itemName(g)) + " × 2</span></p>" +
      "<p>Сундучков на этой неделе: " + Math.min(F.daily.days, FD.weekChestDays) + " из " + FD.weekChestDays + ".</p>" +
      '<button class="btn btn-primary btn-big" data-close>Спасибо!</button></div>');
    rerender();
  }
  function claimWeekChest() {
    ensureDaily(); if (F.daily.days < FD.weekChestDays || F.daily.weekChest) return;
    var sum = 300 + 20 * level();
    F.coins += sum; F.daily.weekChest = true; F.st.weekChests++; gainXp(60); save(); L().tone(true);
    openSheet("Большой сундук недели", '<div class="center"><div class="chest big" aria-hidden="true"></div><p class="big-line">+' + coinsWord(sum) + ", +60 опыта</p><p>Спасибо за старания всю неделю! Новый сундук — в следующий понедельник.</p>" +
      '<button class="btn btn-primary btn-big" data-close>Отлично!</button></div>');
    rerender();
  }
  function dailyHTML() {
    ensureDaily();
    var done = dailyDone(), d = F.daily;
    var rows = d.tasks.map(function (t) {
      var ok = t.p >= t.n;
      return '<li class="task' + (ok ? " ok" : "") + '"><span class="task-mark" aria-hidden="true">' + (ok ? "✓" : "") + '</span><span class="task-t">' + taskText(t) +
        '</span><span class="task-p">' + t.p + " / " + t.n + "</span></li>";
    }).join("");
    var week = Math.min(d.days || 0, FD.weekChestDays);
    return '<div class="card daily" id="daily"><h3 class="first">Задания дня</h3><ul class="tasks">' + rows + "</ul>" +
      (d.chest ? '<p class="ok-line">Сундучок дня получен ✓ Новые задания — завтра.</p>'
        : '<button class="btn btn-primary btn-big" data-chest' + (done ? "" : " disabled") + ">" + (done ? "Открыть сундучок!" : "Сундучок — после 3 заданий") + "</button>") +
      '<div class="week-line"><span>Неделя: ' + week + " из " + FD.weekChestDays + ' сундучков</span><div class="week-dots">' +
      Array.apply(null, Array(FD.weekChestDays)).map(function (_, i) { return '<span class="' + (i < week ? "on" : "") + '"></span>'; }).join("") + "</div></div>" +
      (week >= FD.weekChestDays && !d.weekChest ? '<button class="btn btn-secondary btn-big" data-weekchest>Открыть большой сундук недели</button>' : "") +
      (d.weekChest ? '<p class="ok-line small">Большой сундук этой недели получен ✓</p>' : "") + "</div>";
  }

  /* ---------- Угодья ---------- */
  function buyArea(id) {
    var a = AR[id]; if (F.areas[id] || level() < a.lvl) return;
    if (F.coins < a.price) { L().toast("Нужно " + coinsWord(a.price) + "."); return; }
    F.coins -= a.price; F.areas[id] = true;
    if (id === "orchard") { while (F.orchard.length < FD.orchardSlots.start) F.orchard.push(null); }
    if (id === "apiary" && !F.hives.length) F.hives.push({ at: now(), type: "flower", got: 0 });
    save(); L().tone(true); L().toast("Открыто: «" + a.n + "»!");
    rerender();
  }
  function lockedAreaHTML(a) {
    var lv = level(), can = lv >= a.lvl;
    return '<div class="card center area-lock">' + '<img class="area-big" src="img/plants/' + a.img + '.svg" alt="" loading="lazy" decoding="async">' +
      "<h3>" + a.n + "</h3><p>" + a.d + "</p>" +
      (can ? '<button class="btn btn-primary btn-big" data-area="' + a.id + '"' + (F.coins < a.price ? " disabled" : "") + ">Открыть за " + coin(a.price) + "</button>" +
        (F.coins < a.price ? '<p class="muted">У вас ' + coin(F.coins) + ". Продайте урожай в Лавке или выполните заказы.</p>" : "")
        : '<p class="lock">Откроется на уровне ' + a.lvl + " · стоит " + coin(a.price) + "</p>") + "</div>";
  }
  function areaTabs(cur) {
    var lv = level();
    return '<nav class="area-tabs" aria-label="Угодья">' + [["farm", "Огород", "mint"]].concat(FD.areas.map(function (a) { return [a.id, a.n, a.img]; })).map(function (x) {
      var a = AR[x[0]], owned = !a || F.areas[x[0]], sub = owned ? "" : (lv >= a.lvl ? coin(a.price) : "ур. " + a.lvl);
      return '<button class="area-tab' + (cur === x[0] ? " on" : "") + (owned ? "" : " locked") + '" data-tab="' + x[0] + '"' + (cur === x[0] ? ' aria-current="page"' : "") + ">" +
        '<img src="img/plants/' + x[2] + '.svg" alt="" loading="lazy" decoding="async"><span>' + x[1] + "</span>" + (sub ? "<small>" + (lv >= (a ? a.lvl : 0) ? "" : "🔒 ") + sub + "</small>" : "") + "</button>";
    }).join("") + "</nav>";
  }
  function bannerHTML() {
    var ev = activeEvent(), s = season();
    if (ev) return '<button class="ev-banner on" data-tab="shop" data-shoptab="orders"><span class="ev-ic" aria-hidden="true">' + ev.ev.ic + "</span><span><b>" + ev.ev.n + "</b> — праздничный заказ в Лавке<small>Ещё " + daysWord(ev.left) +
      " · награда — украшение «" + ev.ev.deco.n + "» · в игре " + s.n.toLowerCase() + "</small></span></button>";
    var nx = nextEvent();
    return '<div class="ev-banner"><span class="ev-ic" aria-hidden="true">' + s.ic + "</span><span><b>В игре " + s.n.toLowerCase() + "</b> (ещё " + daysWord(daysLeftInSeason()) + ", потом " + nextSeason().n.toLowerCase() + "). " + s.d +
      (nx ? "<small>Следующий праздник: " + nx.ev.ic + " " + nx.ev.n + " — через " + daysWord(nx.days) + "</small>" : "") + "</span></div>";
  }

  /* ---------- Сад ---------- */
  function treeState(s) {
    if (!s) return { st: "empty" };
    var left = s.next - now();
    if (left <= 0) return { st: "ready", stage: 3, left: 0, pct: 100 };
    var pct = Math.min(99, Math.max(0, (1 - left / s.total) * 100));
    return { st: "grow", stage: s.n ? 2 : (pct < 40 ? 1 : 2), left: left, pct: pct };
  }
  function waterTreeNow(s, quiet) {
    if (!s || s.w) return; var left = s.next - now(); if (left <= 0) return;
    var k = F.up.can ? 0.5 : 0.25; s.next = now() + left * (1 - k); s.w = true;
  }
  function plantTree(i, id) {
    var t = T[id]; if (F.orchard[i] || t.lvl > level()) return;
    if (F.coins < t.sapling) { L().toast("Нужно " + coinsWord(t.sapling) + "."); return; }
    F.coins -= t.sapling;
    var dur = t.first * MIN * speedFor(id, "orchard");
    F.orchard[i] = { t: id, total: dur, next: now() + dur, n: 0, w: false };
    if (F.up.helper) waterTreeNow(F.orchard[i]);
    save(); closeSheet(); L().tone(true); L().toast("Посажено: " + t.n.toLowerCase() + ". Первый урожай — через " + fmtTime(F.orchard[i].next - now()) + ".");
    rerender();
  }
  function waterTree(i) {
    var s = F.orchard[i]; if (!s || s.w) return; waterTreeNow(s); track("water");
    save(); L().tone(true); L().toast("Полито! Урожай созреет быстрее."); closeSheet(); rerender();
  }
  function harvestTree(i) {
    var s = F.orchard[i]; if (treeState(s).st !== "ready") return;
    var t = T[s.t], q = t.q + (F.up.ladder ? 1 : 0) + (inSeason(t.id) ? 1 : 0);
    add("o:" + t.id, q); s.n++;
    var dur = t.re * MIN * speedFor(t.id, "orchard"); s.total = dur; s.next = now() + dur; s.w = false;
    if (F.up.helper) waterTreeNow(s);
    F.st.orchard++; track("orchard");
    gainXp(t.xp, "Собрано: " + t.fruit.toLowerCase() + " × " + q + " — в амбаре. +" + t.xp + " опыта");
    save(); L().tone(true); rerender();
  }
  function clearTree(i) { F.orchard[i] = null; save(); closeSheet(); rerender(); }
  function orchardSlotPrice() { var n = F.orchard.length - FD.orchardSlots.start; return n >= 0 && n < FD.orchardSlots.prices.length ? FD.orchardSlots.prices[n] : null; }
  function buyOrchardSlot() {
    var pr = orchardSlotPrice(); if (pr === null || !F.areas.orchard) return;
    if (F.coins < pr) { L().toast("Нужно " + coinsWord(pr) + "."); return; }
    F.coins -= pr; F.orchard.push(null); save(); L().tone(true); L().toast("Новое место в саду!"); rerender();
  }
  function treeSheet(i) {
    var lv = level();
    openSheet("Что посадить в саду?", '<p class="muted">Дерево или куст сажают один раз — потом он плодоносит снова и снова. У вас ' + coin(F.coins) + ".</p>" + FD.trees.map(function (t) {
      var locked = t.lvl > lv;
      return '<div class="row-item' + (locked ? " locked" : "") + '">' + plantImg(t, 3, 64) + '<div class="row-text"><b>' + t.n + (inSeason(t.id) ? ' <span class="tag">сезон</span>' : "") + "</b><span>Первый урожай через " + fmtTime(t.first * MIN * speedFor(t.id, "orchard")) +
        ", потом каждые " + fmtTime(t.re * MIN * speedFor(t.id, "orchard")) + "</span><span>Урожай: " + t.fruit.toLowerCase() + " × " + t.q + " · " + coin(t.sell) + " за штуку</span>" +
        (locked ? '<span class="lock">Откроется на уровне ' + t.lvl + "</span>" : "") + "</div>" +
        (locked ? "" : '<button class="btn btn-primary btn-sm" data-tree="' + t.id + '" data-slot-o="' + i + '"' + (F.coins < t.sapling ? " disabled" : "") + ">Посадить<small>" + coin(t.sapling) + "</small></button>") + "</div>";
    }).join(""));
  }
  function treeInfoSheet(i) {
    var s = F.orchard[i], t = T[s.t], st = treeState(s);
    openSheet(t.n, '<div class="center">' + plantImg(t, st.stage, 170) + '<p class="big-line">Урожай через <span data-end="' + s.next + '">' + fmtTime(st.left) + "</span></p>" +
      "<p class=\"muted\">Собрано урожаев: " + s.n + ". Дерево плодоносит без конца.</p>" +
      (s.w ? '<p class="ok-line">Уже полито ✓</p>' : '<button class="btn btn-water btn-big" data-wtree="' + i + '"><span class="drop" aria-hidden="true"></span>Полить</button>') +
      '<ul class="facts">' + t.facts.map(function (f) { return "<li>" + f + "</li>"; }).join("") + "</ul>" +
      '<button class="btn btn-ghost btn-big" data-cleartree="' + i + '">Освободить место (без возврата монет)</button>' +
      '<button class="btn btn-ghost btn-big" data-close>Закрыть</button></div>');
  }
  function renderOrchard() {
    if (!$("orchard-root")) return;
    var body;
    if (!F.areas.orchard) body = lockedAreaHTML(AR.orchard);
    else {
      var slots = F.orchard.map(function (s, i) {
        var st = treeState(s);
        if (st.st === "empty") return '<button class="bed tree-bed empty" data-otree="' + i + '" aria-label="Пустое место в саду — посадить"><span class="bed-plus" aria-hidden="true">+</span><span class="bed-label">Посадить</span></button>';
        var t = T[s.t];
        return '<button class="bed tree-bed ' + (st.st === "ready" ? "ready" : "grow" + (s.w ? " watered" : "")) + '" data-otree="' + i + '" aria-label="' + t.n + (st.st === "ready" ? " — урожай готов" : " растёт") + '">' +
          '<span class="bed-plant">' + plantImg(t, st.stage, 150) + '</span><span class="bed-name">' + t.n.replace(/ \(куст\)/, "") + "</span>" +
          (st.st === "ready" ? '<span class="bed-label harvest">Собрать!</span>' : '<span class="bed-label"><span data-end="' + s.next + '">' + fmtTime(st.left) + '</span></span><span class="bed-bar"><span style="width:' + st.pct.toFixed(0) + '%"></span></span>' +
            (s.w ? "" : '<span class="water-chip"><span class="drop" aria-hidden="true"></span>полить</span>')) + "</button>";
      }).join("");
      var pr = orchardSlotPrice();
      if (pr !== null) slots += '<button class="bed tree-bed buy" data-buyoslot><span class="bed-plus" aria-hidden="true">+</span><span class="bed-label">Новое место</span><span class="bed-price">' + coin(pr) + "</span></button>";
      body = '<div class="beds orchard" id="orchard">' + slots + "</div>" +
        '<p class="muted center">Деревья и кусты плодоносят снова и снова. Сезонные — быстрее и щедрее на 1 плод.</p>';
    }
    $("orchard-root").innerHTML = headerHTML() + areaTabs("orchard") + bannerHTML() + '<h2 class="farm-title">Сад</h2>' + body;
  }

  /* ---------- Пасека ---------- */
  function flowerList() {
    var out = [];
    F.beds.forEach(function (b) { if (b && FD.honeyPlants.indexOf(b.p) >= 0 && out.indexOf(b.p) < 0) out.push(b.p); });
    return out;
  }
  function flowerBonus() { return Math.min(0.3, 0.05 * flowerList().length); }
  function hiveEvery() { var k = 1 - flowerBonus(); if (F.up.extractor) k *= 0.85; if (F.sets.bees) k *= 0.9; return FD.hiveEvery * MIN * k; }
  function hiveCap() { return F.up.extractor ? 5 : FD.hiveCap; }
  function hiveReady(h) { return Math.min(hiveCap(), Math.max(0, Math.floor((now() - h.at) / hiveEvery()))); }
  function honeyTypeOk(id) {
    var h = HN[id]; if (h.needUp && !F.up[h.needUp]) return false;
    if (h.needPlant) return F.beds.some(function (b) { return b && b.p === h.needPlant; });
    return true;
  }
  function hiveType(h) { return honeyTypeOk(h.type) ? h.type : "flower"; }
  function takeHive(i) {
    var h = F.hives[i], n = hiveReady(h); if (!n) return;
    var type = hiveType(h), lv = level();
    add("h:" + type, n);
    var wax = Math.floor((h.got + n) / 3) - Math.floor(h.got / 3), perga = lv >= 12 ? Math.floor((h.got + n) / 5) - Math.floor(h.got / 5) : 0;
    if (wax) add("x:wax", wax); if (perga) add("x:perga", perga);
    h.at = n >= hiveCap() ? now() : h.at + n * hiveEvery(); h.got += n;
    F.st.honey += n; track("honey", n);
    gainXp(3 * n, HN[type].n + " × " + n + (wax ? ", воск × " + wax : "") + (perga ? ", перга × " + perga : "") + " — в амбаре. +" + 3 * n + " опыта");
    save(); L().tone(true); rerender();
  }
  function setHiveType(i, type) { var h = F.hives[i]; if (!h || !honeyTypeOk(type)) return; h.type = type; save(); rerender(); }
  function hivePrice() { var n = F.hives.length - FD.hiveSlots.start; return n >= 0 && n < FD.hiveSlots.prices.length ? FD.hiveSlots.prices[n] : null; }
  function buyHive() {
    var pr = hivePrice(); if (pr === null || !F.areas.apiary) return;
    if (F.coins < pr) { L().toast("Нужно " + coinsWord(pr) + "."); return; }
    F.coins -= pr; F.hives.push({ at: now(), type: "flower", got: 0 }); save(); L().tone(true); L().toast("Новый улей на пасеке!"); rerender();
  }
  function renderApiary() {
    if (!$("apiary-root")) return;
    var body;
    if (!F.areas.apiary) body = lockedAreaHTML(AR.apiary);
    else {
      var fl = flowerList(), every = hiveEvery();
      var hives = F.hives.map(function (h, i) {
        var n = hiveReady(h), type = hiveType(h);
        return '<div class="hive-card"><img class="hive-img" src="img/plants/hive.svg" alt="" loading="lazy" decoding="async"><div class="hive-body"><b>Улей № ' + (i + 1) + "</b>" +
          '<div class="seg small-seg" role="group" aria-label="Сорт мёда">' + FD.honey.map(function (x) {
            var ok = honeyTypeOk(x.id);
            return '<button class="seg-b' + (type === x.id ? " on" : "") + '" data-htype="' + x.id + '" data-hive="' + i + '"' + (ok ? "" : " disabled") + ' aria-pressed="' + (type === x.id) + '">' + x.n.replace("Мёд ", "") + "</button>";
          }).join("") + "</div>" +
          '<span class="jars">' + Array.apply(null, Array(hiveCap())).map(function (_, k) { return '<span class="jar' + (k < n ? " on" : "") + '" style="--c:' + HN[type].col + '"></span>'; }).join("") + "</span>" +
          (n ? '<button class="btn btn-secondary btn-big" data-takehive="' + i + '">Собрать мёд × ' + n + "</button>"
            : '<span class="muted">Следующая баночка через <span data-end="' + (h.at + every) + '">' + fmtTime(h.at + every - now()) + "</span></span>") +
          (n >= hiveCap() ? '<span class="muted small">Улей полон — соберите мёд.</span>' : "") + "</div></div>";
      }).join("");
      var pr = hivePrice();
      body = '<div class="card flower-card"><h3 class="first">Цветы рядом с пасекой</h3>' +
        (fl.length ? "<p>На грядках цветут медоносы: <b>" + fl.map(function (id) { return P[id].n; }).join(", ") + "</b>. Пчёлы работают на " + Math.round(flowerBonus() * 100) + "% быстрее.</p>"
          : "<p>Посадите на грядках медоносы — мяту, мелиссу, чабрец, липу, душицу. Каждый вид ускоряет пчёл на 5% (до 30%).</p>") +
        '<p class="muted small">Липовый мёд — когда на грядке растёт Липа. Гречишный — после покупки «Гречишного поля».</p></div>' +
        '<div class="hives">' + hives + "</div>" +
        (pr !== null ? '<button class="btn btn-primary btn-big" data-buyhive>Ещё один улей — ' + coin(pr) + "</button>" : '<p class="ok-line center">Все ульи поставлены ✓</p>') +
        '<div class="card"><h3 class="first">Что даёт пасека</h3>' + FD.honey.concat(FD.beeGoods).map(function (x) {
          var key = (FD.honey.indexOf(x) >= 0 ? "h:" : "x:") + x.id;
          return '<div class="row-item">' + itemIcon(key, 44) + '<div class="row-text"><b>' + x.n + "</b><span>" + x.d + "</span></div><span>" + coin(itemPrice(key)) + "</span></div>";
        }).join("") + '<p class="doctor-note">' + FD.beeNote + "</p></div>";
    }
    $("apiary-root").innerHTML = headerHTML() + areaTabs("apiary") + bannerHTML() + '<h2 class="farm-title">Пасека</h2>' + body;
  }

  /* ---------- Лес ---------- */
  function spotLeft(id) { return Math.max(0, (F.forest[id] || 0) - now()); }
  function gather(id) {
    var w = W[id]; if (!F.areas.forest || w.lvl > level() || spotLeft(id) > 0) return;
    var q = w.q + (F.up.basket ? 1 : 0) + (inSeason(id) ? 1 : 0);
    add("w:" + id, q); F.forest[id] = now() + w.cd * MIN * speedFor(id, "forest");
    F.st.forest++; track("forest");
    gainXp(w.xp, "В лукошке: " + w.n.toLowerCase() + " × " + q + ". +" + w.xp + " опыта");
    save(); L().tone(true); rerender();
  }
  function renderForest() {
    if (!$("forest-root")) return;
    var body, lv = level();
    if (!F.areas.forest) body = lockedAreaHTML(AR.forest);
    else {
      body = '<div class="spots">' + FD.forest.map(function (w) {
        var locked = w.lvl > lv, left = spotLeft(w.id);
        return '<div class="spot' + (locked ? " locked" : left ? "" : " ready") + '">' + plantImg(w, 3, 120) + "<b>" + w.n + (inSeason(w.id) ? ' <span class="tag">сезон</span>' : "") + "</b>" +
          (locked ? '<span class="lock">С уровня ' + w.lvl + "</span>"
            : left ? '<span class="muted">Снова через <span data-end="' + (now() + left) + '">' + fmtTime(left) + "</span></span>"
              : '<button class="btn btn-secondary btn-big" data-gather="' + w.id + '">Собрать</button>') +
          '<button class="btn-link" data-wcard="' + w.id + '">О растении</button></div>';
      }).join("") + "</div>" +
        '<p class="doctor-note">🍄 ' + FD.mushNote + "</p>";
    }
    $("forest-root").innerHTML = headerHTML() + areaTabs("forest") + bannerHTML() + '<h2 class="farm-title">Лес</h2>' + body;
  }
  function wildSheet(id) {
    var w = W[id] || T[id];
    openSheet(w.n, '<div class="center">' + plantImg(w, 3, 160) + '<ul class="facts">' + w.facts.map(function (f) { return "<li>" + f + "</li>"; }).join("") + "</ul>" +
      (w.mush ? '<p class="doctor-note">' + FD.mushNote + "</p>" : "") + '<button class="btn btn-primary btn-big" data-close>Понятно</button></div>');
  }

  /* ---------- Праздничный заказ ---------- */
  function ensureEventOrder() {
    var ev = activeEvent();
    if (!ev) { if (F.evo && F.evo.done) return; F.evo = null; return; }
    if (F.evo && F.evo.key === ev.key) return;
    var keys = ev.ev.wants.filter(keyAvailable);
    if (keys.length < 2) keys = keys.concat(availableKeys().filter(function (k) { return keys.indexOf(k) < 0 && k.charAt(0) !== "f"; }).slice(-4));
    var items = pickN(keys, 2).map(function (k) { return { key: k, q: k.charAt(0) === "t" || k.charAt(0) === "x" ? 2 : 3 }; });
    var reward = Math.round(items.reduce(function (a, it) { return a + itemPrice(it.key) * it.q; }, 0) * 2 + 30);
    F.evo = { key: ev.key, id: ev.ev.id, items: items, reward: reward, xp: Math.round(reward / 5), done: false };
    save();
  }
  function giveEvent() {
    var o = F.evo; if (!o || o.done || !o.items.every(function (it) { return have(it.key) >= it.q; })) return;
    o.items.forEach(function (it) { add(it.key, -it.q); });
    var ev = EV[o.id], had = F.deco[ev.deco.id], sum = Math.round(o.reward * (had ? 1.5 : 1));
    F.coins += sum; F.deco[ev.deco.id] = true; o.done = true; F.st.events++; F.ordersDone++; track("order");
    gainXp(o.xp); save(); L().tone(true);
    openSheet(ev.n + "!", '<div class="center"><div class="deco-big" aria-hidden="true">' + ev.deco.ic + '</div><p class="big-line">+' + coinsWord(sum) + ", +" + o.xp + " опыта</p>" +
      (had ? "<p>Украшение «" + ev.deco.n + "» у вас уже есть — поэтому награда в полтора раза больше.</p>" : "<p>Новое украшение для двора: <b>" + ev.deco.n + "</b>. Его можно получить только в этот праздник.</p>") +
      '<button class="btn btn-primary btn-big" data-close>С праздником!</button></div>');
    rerender();
  }
  function eventOrderHTML() {
    ensureEventOrder();
    var o = F.evo, ev = activeEvent(); if (!o || !ev || o.key !== ev.key) return "";
    var e = EV[o.id];
    if (o.done) return '<div class="card ev-order done"><h3 class="first">' + e.ic + " " + e.n + '</h3><p class="ok-line">Праздничный заказ выполнен ✓ Украшение «' + e.deco.n + "» — во дворе.</p></div>";
    var ok = o.items.every(function (it) { return have(it.key) >= it.q; });
    return '<div class="card ev-order"><h3 class="first">' + e.ic + " Праздничный заказ: " + e.n + "</h3><p>" + e.d + " Ещё " + daysWord(ev.left) + ".</p>" +
      o.items.map(function (it) { var h = have(it.key); return '<div class="row-item">' + itemIcon(it.key, 44) + '<div class="row-text"><b>' + esc(itemName(it.key)) + "</b><span class=\"" + (h >= it.q ? "have" : "miss") + '">У вас: ' + h + " из " + it.q + "</span></div></div>"; }).join("") +
      "<p>Награда: " + coin(o.reward) + ", " + o.xp + " опыта и украшение <b>«" + e.deco.n + "»</b> " + e.deco.ic + "</p>" +
      '<button class="btn btn-primary btn-big" data-evgive' + (ok ? "" : " disabled") + ">Отдать праздничный заказ</button></div>";
  }

  /* ---------- Аптека: недельный контракт ---------- */
  var contractNote = "";
  function ensureContract() {
    if (level() < 5) return;
    var w = weekNum(); if (F.contract && F.contract.week === w) return;
    if (F.contract && !F.contract.done) {
      var part = Math.round(F.contract.lines.reduce(function (a, l) { return a + l.got * itemPrice(l.key) * 1.2; }, 0));
      if (part > 0) { F.coins += part; contractNote = "Прошлый контракт Аптеки закрыт: за привезённое вам заплатили " + coinsWord(part) + "."; }
    }
    var av = availableKeys(), groups = [["f"], ["d"], ["t"], ["o", "w", "h", "x"]], keys = [];
    groups.forEach(function (g) { var c = av.filter(function (k) { return g.indexOf(k.charAt(0)) >= 0 && keys.indexOf(k) < 0; }); if (c.length) keys.push(pickN(c, 1)[0]); });
    var extra = av.filter(function (k) { return keys.indexOf(k) < 0 && k.charAt(0) !== "f"; });
    while (keys.length < (level() >= 12 ? 5 : 4) && extra.length) keys.push(extra.splice(Math.floor(Math.random() * extra.length), 1)[0]);
    var lines = keys.map(function (k) { return { key: k, q: qtyFor(k, 2), got: 0 }; });
    var reward = Math.round(lines.reduce(function (a, l) { return a + itemPrice(l.key) * l.q; }, 0) * 1.8 * (F.up.kitchen ? 1.1 : 1) + 60);
    F.contract = { week: w, lines: lines, reward: reward, xp: Math.round(reward / 6), done: false };
    save();
  }
  function deliverLine(i) {
    var c = F.contract; if (!c || c.done) return; var l = c.lines[i];
    var give = Math.min(have(l.key), l.q - l.got); if (give <= 0) return;
    add(l.key, -give); l.got += give;
    if (c.lines.every(function (x) { return x.got >= x.q; })) {
      c.done = true; F.coins += c.reward; F.st.contracts++;
      gainXp(c.xp); save(); L().tone(true);
      openSheet("Контракт выполнен!", '<div class="center"><div class="chest big" aria-hidden="true"></div><p class="big-line">+' + coinsWord(c.reward) + ", +" + c.xp + " опыта</p><p>Аптека благодарит вас! Новый контракт — в понедельник.</p>" +
        '<button class="btn btn-primary btn-big" data-close>Отлично!</button></div>');
    } else { save(); L().tone(true); L().toast("Передано в Аптеку: " + itemName(l.key) + " × " + give + "."); }
    rerender();
  }
  function contractHTML() {
    if (level() < 5) return '<div class="card"><p class="lock">Контракты Аптеки откроются на уровне 5.</p></div>';
    ensureContract();
    var c = F.contract, doneN = c.lines.filter(function (l) { return l.got >= l.q; }).length;
    return (contractNote ? '<p class="notice">' + contractNote + "</p>" : "") +
      '<div class="card contract"><div class="contract-head"><span class="contract-ic" aria-hidden="true">⚕</span><div><h3 class="first">Большой заказ Аптеки</h3><p class="muted">Привозите товары частями, когда удобно. Срок — ' +
      daysWord(daysLeftInWeek()) + ". Не успеете — ничего страшного: за привезённое всё равно заплатят.</p></div></div>" +
      '<div class="progress big"><div class="progress-fill" style="width:' + Math.round(c.lines.reduce(function (a, l) { return a + l.got / l.q; }, 0) / c.lines.length * 100) + '%"></div></div>' +
      c.lines.map(function (l, i) {
        var h = have(l.key), ok = l.got >= l.q;
        return '<div class="row-item' + (ok ? " ok" : "") + '">' + itemIcon(l.key, 48) + '<div class="row-text"><b>' + esc(itemName(l.key)) + "</b><span>Привезено: " + l.got + " из " + l.q + " · у вас: " + h + "</span></div>" +
          (ok ? '<span class="owned">✓</span>' : '<button class="btn btn-secondary btn-sm" data-cline="' + i + '"' + (h ? "" : " disabled") + ">Привезти" + (h ? "<small>× " + Math.min(h, l.q - l.got) + "</small>" : "") + "</button>") + "</div>";
      }).join("") +
      (c.done ? '<p class="ok-line">Контракт этой недели выполнен ✓</p>' : "<p>Награда за весь контракт: <b>" + coin(c.reward) + "</b> и " + c.xp + " опыта (" + doneN + " из " + c.lines.length + " позиций готово).</p>") + "</div>";
  }

  /* ---------- Ярмарка: раз в 3 дня ---------- */
  function ensureFair() {
    if (level() < 4) return;
    var p = Math.floor(dayNum() / 3); if (F.fair && F.fair.p === p) return;
    var av = availableKeys(), inStore = av.filter(function (k) { return have(k) > 0; });
    var keys = pickN(inStore, 3); pickN(av.filter(function (k) { return keys.indexOf(k) < 0; }), 6 - keys.length).forEach(function (k) { keys.push(k); });
    F.fair = { p: p, any: false, deals: keys.map(function (k) { return { key: k, mult: 1.3 + 0.1 * rint(0, 5), cap: k.charAt(0) === "t" ? rint(4, 6) : rint(8, 15), sold: 0 }; }) };
    save();
  }
  function fairSell(i, n) {
    var d = F.fair.deals[i]; if (!d) return;
    var q = Math.min(have(d.key), d.cap - d.sold, n === "all" ? 999 : +n); if (q <= 0) return;
    var price = Math.round(itemPrice(d.key) * d.mult), sum = price * q;
    add(d.key, -q); d.sold += q; F.coins += sum; F.sold += q;
    if (!F.fair.any) { F.fair.any = true; F.st.fairs++; }
    track("sell", q); gainXp(Math.max(1, Math.round(q / 2)));
    save(); L().tone(true); L().toast("Ярмарка: " + itemName(d.key) + " × " + q + " · +" + coinsWord(sum)); rerender();
  }
  function fairHTML() {
    if (level() < 4) return '<div class="card"><p class="lock">Ярмарка откроется на уровне 4.</p></div>';
    ensureFair();
    var left = 3 - (dayNum() % 3);
    return '<div class="card fair"><div class="fair-head"><span class="fair-flags" aria-hidden="true"></span><h3 class="first">Ярмарка</h3><p class="muted">Здесь платят дороже обычного. Выберите сами, что и сколько привезти. Ярмарка открыта ещё ' + daysWord(left) + ", потом приедут другие покупатели.</p></div>" +
      F.fair.deals.map(function (d, i) {
        var h = have(d.key), room = d.cap - d.sold, price = Math.round(itemPrice(d.key) * d.mult), can = Math.min(h, room);
        return '<div class="row-item fair-row">' + itemIcon(d.key, 52) + '<div class="row-text"><b>' + esc(itemName(d.key)) + '</b><span><span class="up-price">' + coin(price) + "</span> вместо " + coin(itemPrice(d.key)) + " · +" + Math.round((d.mult - 1) * 100) + "%</span>" +
          "<span>Возьмут ещё: " + room + " · у вас: " + h + "</span></div>" +
          (room <= 0 ? '<span class="owned">Распродано ✓</span>' : '<div class="sell-btns"><button class="btn btn-ghost btn-sm" data-fair="' + i + '" data-n="1"' + (can ? "" : " disabled") + ">Продать 1</button>" +
            (can > 1 ? '<button class="btn btn-primary btn-sm" data-fair="' + i + '" data-n="all">Все ' + can + ": " + coin(price * can) + "</button>" : "") + "</div>") + "</div>";
      }).join("") + "</div>";
  }

  /* ---------- Обоз: несколько ящиков, без срока ---------- */
  function ensureConvoy() {
    if (level() < 7) return;
    if (F.convoy && (!F.convoy.sent || now() < F.convoy.next)) return;
    var keys = pickN(availableKeys(), level() >= 12 ? 6 : 4);
    var slots = keys.map(function (k) { return { key: k, q: qtyFor(k, 1), ok: false }; });
    var reward = Math.round(slots.reduce(function (a, s) { return a + itemPrice(s.key) * s.q; }, 0) * 1.6 + 40);
    F.convoy = { slots: slots, reward: reward, xp: Math.round(reward / 6), sent: false, next: 0 };
    save();
  }
  function fillSlot(i) {
    var s = F.convoy.slots[i]; if (!s || s.ok || have(s.key) < s.q) return;
    add(s.key, -s.q); s.ok = true; save(); L().tone(true); L().toast("Ящик уложен: " + itemName(s.key) + " × " + s.q + "."); rerender();
  }
  function sendConvoy() {
    var c = F.convoy; if (!c || c.sent || !c.slots.every(function (s) { return s.ok; })) return;
    c.sent = true; c.next = now() + 3 * 60 * MIN; F.coins += c.reward; F.st.convoys++;
    gainXp(c.xp, "Обоз отправлен! +" + coinsWord(c.reward) + ", +" + c.xp + " опыта"); save(); L().tone(true); rerender();
  }
  function convoyHTML() {
    if (level() < 7) return '<div class="card"><p class="lock">Обоз откроется на уровне 7.</p></div>';
    ensureConvoy();
    var c = F.convoy;
    if (c.sent) return '<div class="card convoy"><h3 class="first">Обоз в пути</h3><p>Возы уехали в город. Новый обоз приедет через <span data-end="' + c.next + '">' + fmtTime(c.next - now()) + "</span>.</p></div>";
    var all = c.slots.every(function (s) { return s.ok; });
    return '<div class="card convoy"><h3 class="first">Обоз в город</h3><p class="muted">Заполните все ящики, когда будет удобно, — обоз подождёт, срока нет.</p><div class="crates">' +
      c.slots.map(function (s, i) {
        var h = have(s.key);
        return '<div class="crate' + (s.ok ? " ok" : "") + '">' + itemIcon(s.key, 56) + "<b>" + esc(itemName(s.key)) + "</b><span>× " + s.q + (s.ok ? "" : " · у вас " + h) + "</span>" +
          (s.ok ? '<span class="owned">Уложено ✓</span>' : '<button class="btn btn-secondary btn-sm" data-crate="' + i + '"' + (h >= s.q ? "" : " disabled") + ">Уложить</button>") + "</div>";
      }).join("") + "</div><p>Награда: <b>" + coin(c.reward) + "</b> и " + c.xp + " опыта.</p>" +
      '<button class="btn btn-primary btn-big" data-sendconvoy' + (all ? "" : " disabled") + ">Отправить обоз</button></div>";
  }

  /* ---------- Травник: альбом, наборы, медали ---------- */
  function albumGroups() {
    return [
      { n: "Огород", items: FD.plants.map(function (p) { return { key: "f:" + p.id, alt: "d:" + p.id, n: p.n, img: plantImg(p, 3, 64), card: p.id }; }) },
      { n: "Сад", items: FD.trees.map(function (t) { return { key: "o:" + t.id, n: t.fruit, img: plantImg(t, 3, 64), wcard: t.id }; }) },
      { n: "Лес", items: FD.forest.map(function (w) { return { key: "w:" + w.id, n: w.n, img: plantImg(w, 3, 64), wcard: w.id }; }) },
      { n: "Пасека", items: FD.honey.map(function (h) { return { key: "h:" + h.id, n: h.n, img: itemIcon("h:" + h.id, 56) }; }).concat(FD.beeGoods.map(function (h) { return { key: "x:" + h.id, n: h.n, img: itemIcon("x:" + h.id, 56) }; })) },
      { n: "Кладовая: чаи, варенье, заготовки", items: FD.recipes.map(function (r) { return { key: "t:" + r.id, n: r.n, img: itemIcon("t:" + r.id, 56) }; }) }
    ];
  }
  function albumTotal() { return albumGroups().reduce(function (a, g) { return a + g.items.length; }, 0); }
  function albumSeen() { return albumGroups().reduce(function (a, g) { return a + g.items.filter(function (it) { return seen(it.key) || (it.alt && seen(it.alt)); }).length; }, 0); }
  function setProgress(s) { return s.items.filter(seen).length; }
  function claimSet(id) {
    var s = SETS[id]; if (F.sets[id] || setProgress(s) < s.items.length) return;
    F.sets[id] = true; F.deco[s.deco.id] = true; save(); L().tone(true);
    openSheet("Набор собран!", '<div class="center"><div class="deco-big" aria-hidden="true">' + s.deco.ic + '</div><p class="big-line">«' + s.n + "»</p><p><b>Навсегда:</b> " + s.bonus + "</p><p>Во дворе появилось украшение «" + s.deco.n + "».</p>" +
      '<button class="btn btn-primary btn-big" data-close>Отлично!</button></div>');
    rerender();
  }
  function statVal(s) {
    switch (s) {
      case "harvested": case "ordersDone": case "teas": case "sold": case "giftStreak": return F[s] || 0;
      case "level": return level();
      case "stars": return stars();
      case "beds": return F.beds.length;
      case "sets": return Object.keys(F.sets).length;
      case "album": return albumSeen();
    }
    return F.st[s] || 0;
  }
  function achTarget(a) { return a.id === "albumAll" ? albumTotal() : a.v; }
  function checkAch(silent) {
    var got = [];
    FD.achievements.forEach(function (a) { if (!F.ach[a.id] && statVal(a.s) >= achTarget(a)) { F.ach[a.id] = L() ? L().dayKey() : 1; F.coins += a.r; got.push(a); } });
    if (got.length) { save(); if (!silent) { L().toast("🏅 Новая медаль: «" + got[0].n + "»" + (got.length > 1 ? " и ещё " + (got.length - 1) : "") + " · +" + coinsWord(got.reduce(function (s, a) { return s + a.r; }, 0))); L().tone(true); } }
    return got;
  }
  function svgMedal(on, size) {
    return svg('<path d="M34 6 L46 40 L54 40 L42 6Z" fill="' + (on ? "#2e5b2b" : "#b8b0a0") + '"/><path d="M66 6 L54 40 L46 40 L58 6Z" fill="' + (on ? "#9a3b1e" : "#cfc8b8") + '"/>' +
      '<circle cx="50" cy="62" r="30" fill="' + (on ? "url(#mg)" : "#ddd6c6") + '" stroke="' + (on ? "#8a6a1f" : "#b8b0a0") + '" stroke-width="4"/>' +
      '<circle cx="50" cy="62" r="21" fill="none" stroke="' + (on ? "#fff3c0" : "#efe9dc") + '" stroke-width="2" opacity=".8"/>' +
      '<path d="M50 46 l5 10 11 1.5 -8 7.5 2 11 -10 -5.5 -10 5.5 2 -11 -8 -7.5 11 -1.5z" fill="' + (on ? "#fff3c0" : "#c8c0b0") + '"/>' +
      '<defs><radialGradient id="mg" cx="35%" cy="35%"><stop offset="0" stop-color="#ffe9a0"/><stop offset=".55" stop-color="#e0b33e"/><stop offset="1" stop-color="#a87a1e"/></radialGradient></defs>', size || 64, "pic medal");
  }
  function renderCollection() {
    if (!$("collection-root")) return;
    var sAll = albumTotal(), sSeen = albumSeen(), achN = Object.keys(F.ach).length;
    var sets = FD.sets.map(function (s) {
      var p = setProgress(s), full = p >= s.items.length, got = F.sets[s.id];
      return '<div class="set' + (got ? " got" : full ? " full" : "") + '"><div class="set-head"><span class="set-ic" aria-hidden="true">' + s.deco.ic + "</span><div><b>" + s.n + "</b><span>" + s.bonus + "</span></div></div>" +
        '<div class="set-items">' + s.items.map(function (k) { return '<span class="set-it' + (seen(k) ? " on" : "") + '" title="' + esc(itemName(k)) + '">' + itemIcon(k, 40) + "<small>" + esc(itemShort(k)) + "</small></span>"; }).join("") + "</div>" +
        (got ? '<p class="ok-line">Бонус действует ✓ · украшение «' + s.deco.n + "»</p>" : full ? '<button class="btn btn-primary btn-big" data-set="' + s.id + '">Получить бонус и «' + s.deco.n + "»</button>" : '<p class="muted small">Собрано ' + p + " из " + s.items.length + "</p>") + "</div>";
    }).join("");
    var album = albumGroups().map(function (g) {
      return "<h3>" + g.n + '</h3><div class="album">' + g.items.map(function (it) {
        var on = seen(it.key) || (it.alt && seen(it.alt));
        var attr = it.card ? ' data-card="' + it.card + '"' : it.wcard ? ' data-wcard="' + it.wcard + '"' : "";
        return '<button class="alb' + (on ? " on" : "") + '"' + (on ? attr : " disabled") + ">" + (on ? it.img : '<span class="alb-q" aria-hidden="true">?</span>') + "<span>" + (on ? esc(it.n) : "Ещё не найдено") + "</span></button>";
      }).join("") + "</div>";
    }).join("");
    var medals = FD.achievements.map(function (a) {
      var on = !!F.ach[a.id], v = Math.min(statVal(a.s), achTarget(a)), tg = achTarget(a);
      return '<div class="medal-tile' + (on ? " on" : "") + '">' + svgMedal(on, 60) + "<b>" + a.n + "</b><span>" + (on ? "Получена ✓" : v + " / " + tg) + "</span></div>";
    }).join("");
    $("collection-root").innerHTML = headerHTML() + '<h2 class="farm-title">Травник</h2>' +
      '<div class="card coll-sum"><div><b>' + sSeen + " из " + sAll + "</b><span>в альбоме</span></div><div><b>" + Object.keys(F.sets).length + " из " + FD.sets.length + "</b><span>наборов</span></div><div><b>" + achN + " из " + FD.achievements.length + "</b><span>медалей</span></div></div>" +
      '<button class="btn btn-ghost btn-big" data-tab="guide">📖 Справочник растений огорода</button>' +
      '<div class="card"><h3 class="first">Наборы</h3><p class="muted">Соберите каждый предмет набора хотя бы раз — получите постоянный бонус и украшение для двора.</p>' + sets + "</div>" +
      '<div class="card"><h3 class="first">Медали</h3><div class="medals">' + medals + "</div></div>" +
      '<div class="card"><h3 class="first">Альбом</h3>' + album + "</div>" +
      '<p class="doctor-note">Названия наборов и рецептов — игровые. Перед применением трав и продуктов пчеловодства посоветуйтесь с врачом.</p>';
  }

  /* ---------- Ближайшие цели ---------- */
  function goals() {
    var lv = level(), g = [];
    FD.areas.forEach(function (a) {
      if (F.areas[a.id]) return;
      if (lv >= a.lvl) g.push({ pr: 1, ty: "area", t: "Откройте угодье «" + a.n + "»", s: "Монеты: " + Math.min(F.coins, a.price) + " из " + a.price, pct: F.coins / a.price, tab: a.id, img: a.img });
      else if (a.lvl - lv <= 2) g.push({ pr: 4, ty: "area", t: "Уровень " + a.lvl + " — откроется «" + a.n + "»", s: "Ещё " + (FD.levelXp[a.lvl - 1] - F.xp) + " опыта", pct: (F.xp - FD.levelXp[lv - 1]) / (FD.levelXp[a.lvl - 1] - FD.levelXp[lv - 1]), tab: a.id, img: a.img });
    });
    FD.sets.forEach(function (s) { if (!F.sets[s.id] && setProgress(s) >= s.items.length) g.push({ pr: 0, ty: "set", t: "Набор «" + s.n + "» собран — заберите бонус", s: s.bonus, pct: 1, tab: "collection", ic: s.deco.ic }); });
    if (F.evo && !F.evo.done && activeEvent()) g.push({ pr: 2, ty: "event", t: "Праздничный заказ: " + EV[F.evo.id].n, s: "Награда — украшение «" + EV[F.evo.id].deco.n + "»", pct: F.evo.items.filter(function (it) { return have(it.key) >= it.q; }).length / F.evo.items.length, tab: "shop", shoptab: "orders", ic: EV[F.evo.id].ic });
    ensureDaily();
    if (!F.daily.chest) { var dn = F.daily.tasks.filter(function (t) { return t.p >= t.n; }).length; g.push({ pr: dailyDone() ? 0 : 3, ty: "daily", t: dailyDone() ? "Откройте сундучок дня" : "Задания дня", s: dn + " из 3 выполнено", pct: dn / 3, tab: "farm", anchor: "daily", ic: "🧰" }); }
    if (lv >= 5) { ensureContract(); var c = F.contract; if (!c.done) { var cd = c.lines.filter(function (l) { return l.got >= l.q; }).length; g.push({ pr: 3, ty: "contract", t: "Контракт Аптеки", s: cd + " из " + c.lines.length + " позиций · ещё " + daysWord(daysLeftInWeek()), pct: cd / c.lines.length, tab: "shop", shoptab: "pharmacy", ic: "⚕" }); } }
    var ups = FD.upgrades.filter(function (u) { return !F.up[u.id] && u.lvl <= lv; }).sort(function (a, b) { return a.price - b.price; });
    if (ups[0]) g.push({ pr: 5, ty: "up", t: "Купите «" + ups[0].n + "»", s: "Монеты: " + Math.min(F.coins, ups[0].price) + " из " + ups[0].price, pct: F.coins / ups[0].price, tab: "upgrades", icon: ups[0].icon });
    if (lv < FD.levelXp.length) g.push({ pr: 5, ty: "level", t: "Уровень " + (lv + 1) + ": «" + levelName(lv + 1) + "»", s: "Ещё " + (FD.levelXp[lv] - F.xp) + " опыта", pct: (F.xp - FD.levelXp[lv - 1]) / (FD.levelXp[lv] - FD.levelXp[lv - 1]), tab: "farm", ic: "⭐" });
    else { var base = FD.levelXp[FD.levelXp.length - 1] + stars() * FD.starXp; g.push({ pr: 5, ty: "level", t: "Звезда мастера № " + (stars() + 1), s: "Ещё " + (base + FD.starXp - F.xp) + " опыта", pct: (F.xp - base) / FD.starXp, tab: "farm", ic: "★" }); }
    var bestSet = null; FD.sets.forEach(function (s) { if (F.sets[s.id]) return; var p = setProgress(s) / s.items.length; if (p < 1 && (!bestSet || p > bestSet.p)) bestSet = { s: s, p: p }; });
    if (bestSet) g.push({ pr: 6, ty: "set", t: "Набор «" + bestSet.s.n + "»", s: "Собрано " + setProgress(bestSet.s) + " из " + bestSet.s.items.length, pct: bestSet.p, tab: "collection", ic: bestSet.s.deco.ic });
    var bestA = null; FD.achievements.forEach(function (a) { if (F.ach[a.id]) return; var p = statVal(a.s) / achTarget(a); if (!bestA || p > bestA.p) bestA = { a: a, p: p }; });
    if (bestA) g.push({ pr: 6, ty: "ach", t: "Медаль «" + bestA.a.n + "»", s: Math.min(statVal(bestA.a.s), achTarget(bestA.a)) + " из " + achTarget(bestA.a), pct: bestA.p, tab: "collection", ic: "🏅" });
    g.sort(function (a, b) { return a.pr - b.pr || b.pct - a.pct; });
    var out = [], per = {};
    g.forEach(function (x) { if (out.length < 3 && (per[x.ty] || 0) < 2) { out.push(x); per[x.ty] = (per[x.ty] || 0) + 1; } });
    return out;
  }
  function goalsHTML() {
    return '<div class="card goals" id="goals"><h3 class="first">Ближайшие цели</h3>' + goals().map(function (x) {
      var ic = x.img ? '<img src="img/plants/' + x.img + '.svg" alt="" loading="lazy" decoding="async">' : x.icon ? icon(x.icon, 44) : '<span aria-hidden="true">' + x.ic + "</span>";
      return '<button class="goal" data-tab="' + x.tab + '"' + (x.shoptab ? ' data-shoptab="' + x.shoptab + '"' : "") + (x.anchor ? ' data-anchor="' + x.anchor + '"' : "") + '><span class="goal-ic">' + ic + '</span><span class="goal-t"><b>' + x.t + "</b><span>" + x.s +
        '</span><span class="goal-bar"><span style="width:' + Math.round(Math.min(1, Math.max(0, x.pct)) * 100) + '%"></span></span></span><span class="goal-go" aria-hidden="true">›</span></button>';
    }).join("") + "</div>";
  }

  /* ---------- Новости v4 для прежних игроков ---------- */
  function showNews() {
    var got = checkAch(true), sum = got.reduce(function (s, a) { return s + a.r; }, 0);
    F.news = false; save(); rerender();
    var lv = level(), opn = FD.areas.filter(function (a) { return lv >= a.lvl; });
    openSheet("Новое в огороде!", '<ul class="facts news">' +
      "<li><b>Сад, Пасека и Лес</b> — новые угодья. " + (opn.length ? "Вам уже можно открыть: " + opn.map(function (a) { return "«" + a.n + "»"; }).join(", ") + "." : "Откроются с 8-го уровня.") + "</li>" +
      "<li><b>Сезоны и праздники</b>: время года в игре такое же, как за окном, а в настоящие праздники — особые заказы.</li>" +
      "<li><b>Травник</b>: альбом находок, 8 наборов с постоянными бонусами и " + FD.achievements.length + " " + L().plural(FD.achievements.length, "медаль", "медали", "медалей") + ".</li>" +
      "<li><b>Аптека, Ярмарка и Обоз</b> — большие заказы в Лавке, без спешки и штрафов.</li>" +
      "<li><b>Задания дня</b> с сундучком и уровни до 20 — а дальше звёзды «Мастер-травник».</li></ul>" +
      (got.length ? '<p class="big-line center">За прошлые заслуги: ' + got.length + " " + L().plural(got.length, "медаль", "медали", "медалей") + " и +" + coinsWord(sum) + "!</p>" : "") +
      '<p class="muted">Все ваши монеты, грядки, запасы и улучшения на месте.</p><button class="btn btn-primary btn-big" data-close>Посмотреть</button>');
  }

  function rerender() {
    var c = current();
    if (c === "farm") renderFarm(); else if (c === "barn") renderBarn(); else if (c === "shop") renderShop(); else if (c === "upgrades") renderUpgrades();
    else if (c === "orchard") renderOrchard(); else if (c === "apiary") renderApiary(); else if (c === "forest") renderForest(); else if (c === "collection") renderCollection();
  }
  function updateEnds() {
    var need = false;
    document.querySelectorAll(".screen.active [data-end], #sheet-body [data-end]").forEach(function (el) {
      var left = +el.getAttribute("data-end") - now();
      if (left <= 0) need = true; else el.textContent = fmtTime(left);
    });
    if (need) { var inSheet = !$("sheet").hidden && $("sheet-body").querySelector("[data-end]"); if (inSheet) closeSheet(); rerender(); }
  }

  window.LZFarm = {
    onShow: onShow, onQuizDone: onQuizDone, reset: reset, bind: bind,
    _state: function () { return F; }, _plantSVG: plantSVG, _plantImg: plantImg,
    _v4: { activeEvent: activeEvent, nextEvent: nextEvent, season: season, nextSeason: nextSeason, daysLeftInSeason: daysLeftInSeason, goals: goals, eventWindows: eventWindows, dayNum: dayNum, availableKeys: availableKeys, statVal: statVal, albumTotal: albumTotal, albumSeen: albumSeen, save: save }
  };
})();
