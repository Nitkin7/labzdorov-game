/* Лаборатория здоровья — «Аптекарский огород» (основной режим) */
(function () {
  "use strict";
  var FD = window.LZ_FARM_DATA;
  var KEY = "lz_farm_v1";
  var MIN = 60000;
  var MAX_BEDS = 12, RACK_SLOTS = 3, BATCH = 5, HONEY_EVERY = 20 * MIN, HONEY_MAX = 3;
  var $ = function (id) { return document.getElementById(id); };
  var P = {}; FD.plants.forEach(function (p) { P[p.id] = p; });
  var R = {}; FD.recipes.forEach(function (r) { R[r.id] = r; });
  var U = {}; FD.upgrades.forEach(function (u) { U[u.id] = u; });
  var FARM_SCREENS = ["farm", "barn", "shop", "upgrades", "guide", "plant"];

  /* ---------- Состояние ---------- */
  function fresh() {
    var beds = []; for (var i = 0; i < 4; i++) beds.push(null);
    return { coins: 30, xp: 0, beds: beds, store: {}, racks: [[null, null, null]], up: {},
      giftDay: null, giftStreak: 0, orders: [], tut: 0, quizDay: null, tipDay: null, hiveAt: 0,
      harvested: 0, sold: 0, teas: 0, ordersDone: 0, started: Date.now() };
  }
  var F = load();
  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!raw) return fresh();
      var d = fresh(); for (var k in d) if (!(k in raw)) raw[k] = d[k];
      return raw;
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
  function speed() { return F.up.birdhouse ? 0.9 : 1; }

  /* ---------- Предметы ---------- */
  // ключи: f:mint (свежая), d:mint (сушёная), t:calm (чай/сбор), honey
  function itemName(key, q) {
    if (key === "honey") return "Мёд";
    var a = key.split(":"), id = a[1];
    if (a[0] === "f") return P[id].n + ", свежий пучок";
    if (a[0] === "d") return P[id].n + ", сушёный пучок";
    return R[id].n;
  }
  function itemPrice(key) {
    if (key === "honey") return 25;
    var a = key.split(":");
    if (a[0] === "f") return P[a[1]].sell;
    if (a[0] === "d") return Math.round(P[a[1]].sell * 2.2);
    return R[a[1]].price;
  }
  function have(key) { return F.store[key] || 0; }
  function add(key, q) { F.store[key] = have(key) + q; if (F.store[key] <= 0) delete F.store[key]; }
  function itemIcon(key, size) {
    size = size || 44;
    if (key === "honey") return svgJar("#e8a92a", size);
    var a = key.split(":");
    if (a[0] === "f") return plantImg(P[a[1]], 3, size);
    if (a[0] === "d") return plantImg(P[a[1]], 3, size, "dried");
    var r = R[a[1]], first = Object.keys(r.need)[0];
    return svgTea(first === "honey" ? "#e8a92a" : (P[first].fl === "#ffffff" ? "#f2c230" : P[first].fl), size);
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
      '<img src="img/plants/' + p.id + '.svg" alt="" loading="lazy" decoding="async" style="height:' + STAGE_H[stage] + '%" onerror="this.parentNode.classList.add(\'fail\')">' +
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
  var ICONS = {
    can: '<path d="M22 44 h40 v36 a6 6 0 0 1 -6 6 h-28 a6 6 0 0 1 -6 -6z" fill="#c07a3a"/><path d="M62 52 L86 34" stroke="#c07a3a" stroke-width="7" stroke-linecap="round"/><path d="M30 44 C30 26 54 26 54 44" stroke="#8a5a2a" stroke-width="5" fill="none"/><circle cx="88" cy="30" r="4" fill="#5aa0d8"/>',
    net: '<rect x="14" y="20" width="72" height="56" rx="6" fill="none" stroke="#8a6a1f" stroke-width="5"/><path d="M14 38 h72 M14 56 h72 M32 20 v56 M50 20 v56 M68 20 v56" stroke="#c49a3c" stroke-width="2.5"/>',
    rack: '<path d="M18 86 L30 16 M82 86 L70 16" stroke="#8a5a2a" stroke-width="6" stroke-linecap="round"/><path d="M24 36 h52 M21 58 h58" stroke="#8a5a2a" stroke-width="4"/><path d="M34 36 v14 M46 36 v18 M58 36 v14 M68 36 v16" stroke="#6c9c3c" stroke-width="5" stroke-linecap="round"/>',
    hive: '<path d="M50 14 C74 14 82 34 82 52 C82 74 70 88 50 88 C30 88 18 74 18 52 C18 34 26 14 50 14Z" fill="#e8b84a" stroke="#a8761e" stroke-width="3"/><path d="M22 36 h56 M19 54 h62 M22 72 h56" stroke="#a8761e" stroke-width="3"/><ellipse cx="50" cy="80" rx="7" ry="5" fill="#5a3a12"/><circle cx="80" cy="22" r="5" fill="#f2c230"/><path d="M76 22 h8" stroke="#2b2a24" stroke-width="2"/>',
    bench: '<rect x="12" y="44" width="76" height="9" rx="3" fill="#a0703a"/><rect x="12" y="28" width="76" height="9" rx="3" fill="#b4834a"/><path d="M20 53 v26 M80 53 v26 M22 37 v7 M78 37 v7" stroke="#7a5a32" stroke-width="6" stroke-linecap="round"/>',
    fence: '<path d="M10 46 h80 M10 66 h80" stroke="#a0703a" stroke-width="5"/>' + [18, 36, 54, 72, 88].map(function (x) { return '<path d="M' + x + ' 86 V30 l-6 -8" stroke="#b4834a" stroke-width="7" stroke-linecap="round" fill="none"/>'; }).join(""),
    birdhouse: '<path d="M50 10 L84 38 H16Z" fill="#9a3b1e"/><rect x="24" y="38" width="52" height="40" fill="#d8b47a" stroke="#8a5a2a" stroke-width="3"/><circle cx="50" cy="54" r="8" fill="#3a2a12"/><path d="M50 78 v14" stroke="#7a5a32" stroke-width="6"/>',
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
    var dur = p.t * MIN * speed();
    if (F.harvested === 0 && F.tut <= 1) dur = 20000; // первая мята для обучения — 20 секунд
    F.beds[i] = { p: id, start: now(), end: now() + dur, total: dur, water: false };
    if (F.tut === 0) F.tut = 1;
    save(); closeSheet(); L().tone(true);
    L().toast("Посажено: " + p.n.toLowerCase() + (cost ? " · −" + coinsWord(cost) : " · семена подарил сосед") + ".");
    renderFarm();
  }
  function water(i) {
    var b = F.beds[i]; if (!b || b.water) return;
    var left = b.end - now(); if (left <= 0) return;
    var k = F.up.can ? 0.5 : 0.25;
    b.end = now() + left * (1 - k); b.water = true;
    if (F.tut === 1) F.tut = 2;
    save(); L().tone(true);
    L().toast("Полито! Созреет на " + Math.round(k * 100) + "% быстрее.");
    closeSheet(); renderFarm();
  }
  function harvest(i) {
    var b = F.beds[i]; if (!b || bedState(b).st !== "ready") return;
    var p = P[b.p], q = 2;
    add("f:" + p.id, q); F.beds[i] = null; F.harvested++;
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
      var opened = FD.plants.filter(function (p) { return p.lvl > before && p.lvl <= after; }).map(function (p) { return p.n; });
      save();
      setTimeout(function () {
        openSheet("Новый уровень!", '<div class="center">' + icon("bed", 90) + '<p class="big-line">Уровень ' + after + ": «" + levelName(after) + "»</p>" +
          (opened.length ? "<p>Открыты новые семена: <b>" + opened.join(", ") + "</b>.</p>" : "<p>Загляните в «Улучшения» — там появилось новое.</p>") +
          '<button class="btn btn-primary btn-big" data-close>Отлично!</button></div>');
      }, 400);
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
    add("f:" + id, -q); F.driedOnce = true;
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
  function recipeKey(id) { return id === "honey" ? "honey" : "d:" + id; }
  function recipeOpen(r) {
    var lv = level();
    return Object.keys(r.need).every(function (id) { return id === "honey" ? !!F.up.beehive : P[id].lvl <= lv; });
  }
  function canMake(r) { return Object.keys(r.need).every(function (id) { return have(recipeKey(id)) >= r.need[id]; }); }
  function make(id) {
    var r = R[id]; if (!canMake(r)) return;
    Object.keys(r.need).forEach(function (h) { add(recipeKey(h), -r.need[h]); });
    add("t:" + id, 1); F.teas++;
    gainXp(r.xp, "Готово: " + r.n + "! +" + r.xp + " опыта");
    save(); L().tone(true); renderBarn();
  }

  /* ---------- Улей ---------- */
  function honeyReady() {
    if (!F.up.beehive) return 0;
    return Math.min(HONEY_MAX, Math.floor((now() - F.hiveAt) / HONEY_EVERY));
  }
  function takeHoney() {
    var n = honeyReady(); if (!n) return;
    add("honey", n);
    F.hiveAt = n >= HONEY_MAX ? now() : F.hiveAt + n * HONEY_EVERY;
    save(); L().tone(true); L().toast("Мёд × " + n + " — в амбаре.");
    renderFarm();
  }

  /* ---------- Заказы ---------- */
  function orderCandidates() {
    var lv = level(), c = [];
    FD.plants.forEach(function (p) { if (p.lvl <= lv) { c.push({ key: "f:" + p.id, w: 3 }); c.push({ key: "d:" + p.id, w: 2 }); } });
    FD.recipes.forEach(function (r) { if (recipeOpen(r)) c.push({ key: "t:" + r.id, w: 2 }); });
    if (F.up.beehive) c.push({ key: "honey", w: 1 });
    return c;
  }
  function newOrder(slot) {
    var c = orderCandidates(), pick;
    if (F.ordersDone === 0 && slot === 0) pick = "f:mint";
    else if (F.ordersDone === 0 && slot === 1) pick = "f:chamomile";
    else if (F.ordersDone === 0 && slot === 2) pick = "d:mint";
    else {
      var used = F.orders.map(function (o) { return o && o.key; });
      var pool = c.filter(function (x) { return used.indexOf(x.key) < 0; });
      var total = pool.reduce(function (a, x) { return a + x.w; }, 0), r = Math.random() * total;
      for (var i = 0; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) { pick = pool[i].key; break; } }
      pick = pick || pool[0].key;
    }
    var q = pick.charAt(0) === "f" ? 2 + Math.floor(Math.random() * 3) : pick.charAt(0) === "d" ? 1 + Math.floor(Math.random() * 3) : 1;
    if (F.ordersDone === 0) q = 2;
    var reward = Math.round(itemPrice(pick) * q * 1.5 + 5);
    var cust = FD.customers[(slot + F.ordersDone + new Date().getDate()) % FD.customers.length];
    return { key: pick, q: q, reward: reward, xp: Math.max(4, Math.round(reward / 5)), c: cust.n, say: cust.say, next: 0 };
  }
  function refreshOrders() {
    var changed = false;
    for (var i = 0; i < 3; i++) {
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
    else what = R[a[1]].n.replace(/^Чай /, "чай ");
    return o.c + " просит: " + what + (o.q > 1 ? " × " + o.q : "");
  }
  function giveOrder(i) {
    var o = F.orders[i]; if (!o || o.next || have(o.key) < o.q) return;
    add(o.key, -o.q);
    var reward = Math.round(o.reward * (F.up.fence ? 1.1 : 1));
    F.coins += reward; F.ordersDone++;
    o.next = now() + 10 * MIN;
    if (F.tut === 3) F.tut = 4;
    gainXp(o.xp, o.c + " благодарит вас! +" + coinsWord(reward) + ", +" + o.xp + " опыта");
    save(); L().tone(true); renderShop();
  }
  function sell(key, all) {
    var q = all ? have(key) : 1; if (!q) return;
    var sum = itemPrice(key) * q;
    add(key, -q); F.coins += sum; F.sold += q;
    save(); L().tone(true); L().toast("Продано: " + itemName(key) + " × " + q + " · +" + coinsWord(sum));
    renderShop();
  }

  /* ---------- Улучшения ---------- */
  function bedPrice() { var n = F.beds.length - 4; return n < FD.bedPrices.length ? FD.bedPrices[n] : null; }
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
    var sum = 15 + 5 * Math.min(F.giftStreak - 1, 5) + (F.up.bench ? 10 : 0);
    F.coins += sum; save();
    openSheet("Подарок дня", '<div class="center"><div class="gift" aria-hidden="true"></div><p class="big-line">+' + coinsWord(sum) + "</p>" +
      "<p>Вы заходите " + F.giftStreak + " " + L().plural(F.giftStreak, "день", "дня", "дней") + " подряд. Чем дольше серия, тем больше подарок (до 6 дней).</p>" +
      '<button class="btn btn-primary btn-big" data-close>Спасибо!</button></div>');
  }
  function onQuizDone(right) {
    var today = L().dayKey(); if (F.quizDay === today) return 0;
    var sum = 20 + 5 * right; F.quizDay = today; F.coins += sum; save();
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
        '<div class="row-text"><b>' + p.n + "</b><span>Растёт " + (F.harvested === 0 && p.id === "mint" && F.tut <= 1 ? "20 сек (первый урожай)" : minutesText(p.t)) +
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
    var lv = level(), lo = FD.levelXp[lv - 1], hi = FD.levelXp[lv] || (lo + 1000), pct = Math.round((F.xp - lo) / (hi - lo) * 100);
    return '<div class="farm-head">' +
      '<div class="fh-coins" aria-label="' + coinsWord(F.coins) + '"><span class="coin big" aria-hidden="true"></span><b>' + F.coins + "</b><span>" + L().plural(F.coins, "монета", "монеты", "монет") + "</span></div>" +
      '<div class="fh-level"><b>Уровень ' + lv + "</b><span>" + levelName(lv) + '</span><div class="progress" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="Опыт до следующего уровня"><div class="progress-fill" style="width:' + pct + '%"></div></div><span class="xp-left">До уровня ' + (lv + 1) + ": " + Math.max(0, hi - F.xp) + " опыта</span></div></div>";
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
    var decor = ["bench", "fence", "birdhouse", "beehive"].filter(function (id) { return F.up[id]; });
    var yard = decor.length ? '<div class="card yard"><h3>Ваш двор</h3><div class="yard-row">' + decor.map(function (id) {
      if (id === "beehive") {
        var n = honeyReady();
        return '<div class="yard-item">' + icon("hive", 64) + "<span>Улей</span>" + (n ? '<button class="btn btn-secondary btn-sm" data-honey>Собрать мёд × ' + n + "</button>" : '<span class="muted small">Мёд через <span data-timer="hive">' + fmtTime(HONEY_EVERY - ((now() - F.hiveAt) % HONEY_EVERY)) + "</span></span>") + "</div>";
      }
      return '<div class="yard-item">' + icon(U[id].icon, 64) + "<span>" + U[id].n + "</span></div>";
    }).join("") + "</div></div>" : "";
    $("farm-root").innerHTML = headerHTML() + hintHTML("farm") +
      '<h2 class="farm-title">Аптекарский огород</h2>' +
      '<div class="beds" id="beds">' + beds + "</div>" +
      (readyOrders ? '<button class="notice" data-tab="shop">Можно выполнить заказ' + (readyOrders > 1 ? "ы" : "") + " в Лавке (" + readyOrders + ") →</button>" : "") +
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
    var recipes = FD.recipes.filter(recipeOpen).map(function (r) {
      var ok = canMake(r);
      return '<div class="recipe' + (ok ? " can" : "") + '">' + svgTea(itemIconColor(r), 52) + '<div class="row-text"><b>' + r.n + '</b><span class="need">' +
        Object.keys(r.need).map(function (id) {
          var key = recipeKey(id), h = have(key), n = r.need[id], nm = id === "honey" ? "мёд" : P[id].n.toLowerCase() + " суш.";
          return '<span class="' + (h >= n ? "have" : "miss") + '">' + nm + " " + Math.min(h, n) + "/" + n + "</span>";
        }).join("") + "</span><span>Цена: " + coin(r.price) + "</span></div>" +
        '<button class="btn btn-primary btn-sm" data-make="' + r.id + '"' + (ok ? "" : " disabled") + ">Собрать</button></div>";
    }).join("");
    var lockedRecipes = FD.recipes.length - FD.recipes.filter(recipeOpen).length;
    $("barn-root").innerHTML = headerHTML() + hintHTML("barn") +
      '<h2 class="farm-title">Амбар</h2>' +
      '<div class="card"><h3 class="first">Сушилка</h3><p class="muted">Свежие травы сохнут здесь и потом стоят дороже.</p>' + racks + "</div>" +
      '<div class="card"><h3 class="first">Стол рецептов</h3><p class="muted">Чаи и сборы делаются из сушёных трав.</p>' + (recipes || "<p>Скоро здесь появятся рецепты.</p>") +
      (lockedRecipes ? '<p class="muted small">Ещё ' + lockedRecipes + " " + L().plural(lockedRecipes, "рецепт откроется", "рецепта откроются", "рецептов откроются") + " с новыми растениями.</p>" : "") + "</div>" +
      '<div class="card"><h3 class="first">Запасы</h3>' +
      storeRows("f:", "Свежие травы", "Пока пусто — соберите урожай на грядках.") + storeRows("d:", "Сушёные травы", "Положите свежие травы в сушилку.") +
      storeRows("t:", "Чаи и сборы", "") + storeRows("honey", "Мёд", "") + "</div>" +
      '<p class="doctor-note">Названия чаёв — игровые. Перед применением трав посоветуйтесь с врачом.</p>';
  }
  function itemIconColor(r) { var f = Object.keys(r.need)[0]; return f === "honey" ? "#e8a92a" : (P[f].fl === "#ffffff" ? "#f2c230" : P[f].fl); }
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

  function renderShop() {
    if (!$("shop-root")) return;
    refreshOrders();
    var orders = F.orders.map(function (o, i) {
      if (o.next) return '<div class="order waiting"><div class="avatar" aria-hidden="true">…</div><div class="row-text"><b>Следующий покупатель</b><span>придёт через <span data-timer="order" data-i="' + i + '">' + fmtTime(o.next - now()) + "</span></span></div></div>";
      var h = have(o.key), ok = h >= o.q;
      return '<div class="order' + (ok ? " can" : "") + '">' + custImg(o) + '<div class="row-text"><b>' + esc(orderPhrase(o)) + '</b><span class="say">«' + esc(o.say) + "»</span>" +
        '<span class="order-need">' + itemIcon(o.key, 34) + " У вас: " + h + " из " + o.q + "</span><span>Награда: " + coin(o.reward) + " и " + o.xp + " опыта</span></div>" +
        '<button class="btn btn-secondary btn-sm" data-order="' + i + '"' + (ok ? "" : " disabled") + ">Отдать</button></div>";
    }).join("");
    var keys = Object.keys(F.store).sort();
    var sellRows = keys.length ? keys.map(function (k) {
      return '<div class="row-item">' + itemIcon(k, 52) + '<div class="row-text"><b>' + itemName(k) + "</b><span>Есть: " + have(k) + " · " + coin(itemPrice(k)) + ' за штуку</span></div><div class="sell-btns">' +
        '<button class="btn btn-ghost btn-sm" data-sell="' + k + '">Продать 1</button>' + (have(k) > 1 ? '<button class="btn btn-primary btn-sm" data-sellall="' + k + '">Все: ' + coin(itemPrice(k) * have(k)) + "</button>" : "") + "</div></div>";
    }).join("") : '<p class="muted">Пока нечего продавать. Соберите урожай в огороде.</p>';
    $("shop-root").innerHTML = headerHTML() + hintHTML("shop") +
      '<h2 class="farm-title">Лавка</h2>' +
      '<div class="card"><h3 class="first">Заказы покупателей</h3><p class="muted">За заказ платят больше, чем при обычной продаже, и дают опыт.</p>' + orders + "</div>" +
      '<div class="card"><h3 class="first">Продать</h3>' + sellRows + "</div>";
  }
  function updateShopLive() {
    var need = false;
    document.querySelectorAll('[data-timer="order"]').forEach(function (el) {
      var o = F.orders[+el.getAttribute("data-i")]; if (!o.next || now() >= o.next) { need = true; return; }
      el.textContent = fmtTime(o.next - now());
    });
    if (need) renderShop();
  }

  function renderUpgrades() {
    if (!$("upgrades-root")) return;
    var lv = level(), bp = bedPrice();
    var rows = '<div class="row-item">' + icon("bed", 56) + '<div class="row-text"><b>Новая грядка</b><span>Сейчас грядок: ' + F.beds.length + " из " + MAX_BEDS + "</span></div>" +
      (bp === null ? '<span class="owned">Все грядки ✓</span>' : '<button class="btn btn-primary btn-sm" data-buybed' + (F.coins < bp ? " disabled" : "") + ">Купить<small>" + coin(bp) + "</small></button>") + "</div>";
    rows += FD.upgrades.map(function (u) {
      var owned = F.up[u.id], locked = lv < u.lvl;
      return '<div class="row-item' + (locked ? " locked" : "") + '">' + icon(u.icon, 56) + '<div class="row-text"><b>' + u.n + (u.decor ? ' <span class="tag">украшение</span>' : "") + "</b><span>" + u.d + "</span>" +
        (locked ? '<span class="lock">Откроется на уровне ' + u.lvl + "</span>" : "") + "</div>" +
        (owned ? '<span class="owned">Куплено ✓</span>' : locked ? "" : '<button class="btn btn-primary btn-sm" data-up="' + u.id + '"' + (F.coins < u.price ? " disabled" : "") + ">Купить<small>" + coin(u.price) + "</small></button>") + "</div>";
    }).join("");
    $("upgrades-root").innerHTML = headerHTML() + '<h2 class="farm-title">Улучшения</h2><div class="card">' + rows + "</div>";
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
      var t = b.getAttribute("data-tab"), on = t === name || (name === "plant" && t === "guide");
      b.classList.toggle("on", on); if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
      b.classList.toggle("pulse", !!(tutorialText() && tutorialText().target === "tab-" + t && name !== t));
    });
    if (name === "farm") { renderFarm(); setTimeout(checkGift, 500); }
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

  function tick() {
    var c = current();
    if (c === "farm") updateFarmLive();
    else if (c === "barn") updateBarnLive();
    else if (c === "shop") updateShopLive();
    if (!$("sheet").hidden) {
      var t = $("sheet-body").querySelector('[data-timer="bed"]');
      if (t) { var b = F.beds[+t.getAttribute("data-i")]; if (!b || bedState(b).st === "ready") closeSheet(); else { t.textContent = fmtTime(b.end - now()); var pf = $("sheet-body").querySelector(".progress-fill"); if (pf) pf.style.width = bedState(b).pct.toFixed(0) + "%"; } }
    }
    navPulse();
  }

  function bind() {
    document.addEventListener("click", function (e) {
      var t = e.target, el;
      if ((el = t.closest("[data-tab]"))) { e.preventDefault(); closeSheet(); L().go(el.getAttribute("data-tab"), FARM_SCREENS.indexOf(current()) >= 0 && current() !== "plant"); return; }
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
    if (nav) nav.innerHTML = [["farm", "Огород"], ["barn", "Амбар"], ["shop", "Лавка"], ["upgrades", "Улучшения"], ["guide", "Растения"]].map(function (x) {
      return '<button data-tab="' + x[0] + '">' + svg(NAV_ICONS[x[0]], 30, "nav-ic") + "<span>" + x[1] + "</span></button>";
    }).join("");
  }

  window.LZFarm = {
    onShow: onShow, onQuizDone: onQuizDone, reset: reset, bind: bind,
    _state: function () { return F; }, _plantSVG: plantSVG, _plantImg: plantImg
  };
})();
