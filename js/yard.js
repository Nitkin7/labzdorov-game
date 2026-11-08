/* Лаборатория здоровья — усадьба.
   Новое лежит в F.yard и не затирает старые запасы, заказы и сушилки. */
(function () {
  "use strict";
  var D = window.LZ_YARD;
  if (!D || !window.LZFarm) return;
  var $ = function (id) { return document.getElementById(id); };

  function F() { return LZFarm._state(); }
  function save() { LZFarm._v4.save(); }
  function level() {
    var xp = F().xp || 0, xs = window.LZ_FARM_DATA.levelXp, l = 1;
    while (l < xs.length && xp >= xs[l]) l++;
    return l;
  }
  function toast(msg) { if (window.LZ) LZ.toast(msg); }
  function coinsWord(n) { return window.LZ ? n + " " + LZ.plural(n, "монета", "монеты", "монет") : String(n); }
  function bag(key) { var b = F().yard && F().yard.bag; return (b && b[key]) || 0; }
  function addBag(key, q) {
    var y = F().yard; if (!y.bag) y.bag = {};
    y.bag[key] = bag(key) + q;
    if (y.bag[key] <= 0) delete y.bag[key];
  }
  function haveOld(key) { return F().store[key] || 0; }
  function addOld(key, q) {
    var s = F().store; s[key] = (s[key] || 0) + q;
    if (q > 0) F().seen[key] = 1;
    if (s[key] <= 0) delete s[key];
  }
  function freshYard() { return { v: 1, built: {}, bag: {}, craft: {}, placed: {}, guest: 0, fair: 0, quest: 0, questPaid: false, finds: 0, album: false }; }
  function ensure() {
    var f = F();
    if (!f.yard || f.yard.v !== 1) {
      var born = !f.yard;
      f.yard = freshYard();
      if (born && level() >= 16) f.yard.quest = 1;
    }
    if (!f.yard.bag) f.yard.bag = {};
    if (!f.yard.built) f.yard.built = {};
    if (!f.yard.craft) f.yard.craft = {};
    if (!f.yard.placed) f.yard.placed = {};
  }
  function building(id) { for (var i = 0; i < D.buildings.length; i++) if (D.buildings[i].id === id) return D.buildings[i]; }
  function variety(id) { for (var i = 0; i < D.varieties.length; i++) if (D.varieties[i].id === id) return D.varieties[i]; }
  function tea(id) { for (var i = 0; i < D.teas.length; i++) if (D.teas[i].id === id) return D.teas[i]; }
  function craft(id) { for (var i = 0; i < D.crafts.length; i++) if (D.crafts[i].id === id) return D.crafts[i]; }
  function findName(id) { for (var i = 0; i < D.finds.length; i++) if (D.finds[i].id === id) return D.finds[i].n; return id; }

  function picVariety(v, size) {
    var petal = v.id === "daisy" ? "#fffaf0" : "#e7f0a8";
    var mid = v.id === "daisy" ? "#f2c230" : "#8fbf45";
    return '<svg class="yard-pic" viewBox="0 0 80 80" width="' + size + '" height="' + size + '" aria-hidden="true">' +
      '<path d="M40 78 C28 60 30 40 40 28 C50 40 52 60 40 78Z" fill="#4f7d2e"/>' +
      '<circle cx="40" cy="30" r="8" fill="' + mid + '"/>' +
      '<ellipse cx="40" cy="16" rx="6" ry="10" fill="' + petal + '" stroke="#1f3d20" stroke-width="1"/>' +
      '<ellipse cx="54" cy="30" rx="6" ry="10" transform="rotate(72 54 30)" fill="' + petal + '" stroke="#1f3d20" stroke-width="1"/>' +
      '<ellipse cx="26" cy="30" rx="6" ry="10" transform="rotate(-72 26 30)" fill="' + petal + '" stroke="#1f3d20" stroke-width="1"/>' +
      "</svg>";
  }
  function picHouse() {
    return '<svg class="yard-pic" viewBox="0 0 80 64" width="72" height="58" aria-hidden="true"><path d="M6 30 L40 8 L74 30" fill="#2e5b2b"/><rect x="16" y="30" width="48" height="28" fill="#fbf6e9" stroke="#1f3d20" stroke-width="2"/><rect x="34" y="40" width="12" height="18" fill="#c49a3c"/></svg>';
  }
  function picItem(id) {
    if (id === "lantern") return '<svg class="yard-pic" viewBox="0 0 64 64" width="56" height="56" aria-hidden="true"><rect x="28" y="4" width="8" height="8" fill="#8a6a1f"/><rect x="18" y="14" width="28" height="34" rx="6" fill="#f4e7b0" stroke="#1f3d20" stroke-width="2"/><rect x="30" y="48" width="4" height="12" fill="#1f3d20"/></svg>';
    if (id === "bed") return '<svg class="yard-pic" viewBox="0 0 64 64" width="56" height="56" aria-hidden="true"><path d="M6 40 H58 V50 H6Z" fill="#8a5a32"/><circle cx="20" cy="30" r="8" fill="#f2c230"/><circle cx="34" cy="24" r="8" fill="#e07a9a"/><circle cx="46" cy="32" r="8" fill="#f7f3e4" stroke="#1f3d20"/></svg>';
    if (id === "garland") return '<svg class="yard-pic" viewBox="0 0 64 64" width="56" height="56" aria-hidden="true"><path d="M6 16 Q32 40 58 16" fill="none" stroke="#2e5b2b" stroke-width="3"/><circle cx="18" cy="24" r="5" fill="#c49a3c"/><circle cx="32" cy="32" r="5" fill="#f2c230"/><circle cx="46" cy="24" r="5" fill="#c49a3c"/></svg>';
    if (id === "skep") return '<svg class="yard-pic" viewBox="0 0 64 64" width="56" height="56" aria-hidden="true"><path d="M12 44 Q32 8 52 44 Z" fill="#e6c36a" stroke="#1f3d20" stroke-width="2"/><path d="M16 36 H48 M18 28 H46" stroke="#8a6a1f" stroke-width="2"/></svg>';
    return picHouse();
  }

  function teaNeedOk(t) {
    var keys = Object.keys(t.need);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var have = k.indexOf("yd:") === 0 ? bag(k) : haveOld(k);
      if (have < t.need[k]) return false;
    }
    return true;
  }
  function takeTeaNeed(t) {
    Object.keys(t.need).forEach(function (k) {
      if (k.indexOf("yd:") === 0) addBag(k, -t.need[k]); else addOld(k, -t.need[k]);
    });
  }
  function craftNeedOk(c) {
    if (F().coins < c.coins) return false;
    var keys = Object.keys(c.need);
    for (var i = 0; i < keys.length; i++) if (bag("m:" + keys[i]) < c.need[keys[i]]) return false;
    return true;
  }

  function noteQuestBuild() { var y = F().yard; if (y.quest === 0 && y.built.house) y.quest = 1; }
  function noteQuestPlace() { var y = F().yard; if (y.quest === 1 && Object.keys(y.placed).length) y.quest = 2; }
  function noteQuestGuest() { var y = F().yard; if (y.quest === 2 && (y.guest >= 2 || y.fair >= 3)) y.quest = 3; }
  function payQuest() {
    var y = F().yard;
    if (y.quest < 3 || y.questPaid) return;
    y.questPaid = true; F().coins += 120;
    toast("Тропинка усадьбы пройдена. +120 монет.");
  }

  function buy(id) {
    ensure();
    var b = building(id), y = F().yard;
    if (!b || y.built[id]) return;
    if (level() < b.lvl) { toast("Откроется на уровне " + b.lvl + "."); return; }
    if (F().coins < b.price) { toast("Нужно " + coinsWord(b.price) + ". Ничего не списано."); return; }
    F().coins -= b.price; y.built[id] = true; noteQuestBuild(); save();
    toast("Построено: " + b.n + ".");
    show();
  }
  function cut(id) {
    ensure();
    if (!F().yard.built.house) return;
    if (!F().up.greenhouse) { toast("Сначала купите теплицу в улучшениях. Это уже знакомая постройка."); return; }
    var v = variety(id); if (!v) return;
    if (F().coins < v.seed) { toast("Нужно " + coinsWord(v.seed) + ". Ничего не списано."); return; }
    F().coins -= v.seed; addBag("yf:" + id, 2); save();
    toast(v.n + " × 2 — на столе в домике.");
    show();
  }
  function dryAll(id) {
    ensure();
    var n = bag("yf:" + id); if (!n) return;
    addBag("yf:" + id, -n); addBag("yd:" + id, n); save();
    toast("На полке теперь сушёные: " + n + ".");
    show();
  }
  function brew(id) {
    ensure();
    var t = tea(id); if (!t || !F().yard.built.house) return;
    if (!teaNeedOk(t)) { toast("Для чая пока не хватает ингредиентов. Ничего не списано."); return; }
    takeTeaNeed(t); addBag("yt:" + id, 1); save();
    toast("Готово: " + t.n + ".");
    show();
  }
  function makeCraft(id) {
    ensure();
    var c = craft(id), y = F().yard;
    if (!c || !y.built.workshop || y.craft[id]) return;
    if (!craftNeedOk(c)) { toast("Не хватает находок или монет. Ничего не списано."); return; }
    Object.keys(c.need).forEach(function (k) { addBag("m:" + k, -c.need[k]); });
    F().coins -= c.coins; y.craft[id] = true; save();
    toast("Сделано: " + c.n + ". Можно поставить во дворе.");
    show();
  }
  function place(id) {
    ensure();
    var y = F().yard;
    if (!y.craft[id] && !(id === "garland" && y.fair >= 3)) return;
    if (y.placed[id]) delete y.placed[id]; else y.placed[id] = true;
    noteQuestPlace(); payQuest(); save(); show();
  }
  function giveBee() {
    ensure();
    var y = F().yard; if (y.guest >= 2) return;
    if (y.guest === 0) {
      if (haveOld("h:flower") < 1 && haveOld("honey") < 1) { toast("Нужна баночка мёда. Ничего не списано."); return; }
      if (haveOld("h:flower") >= 1) addOld("h:flower", -1); else addOld("honey", -1);
      y.guest = 1;
    } else {
      if (haveOld("x:wax") >= 1) addOld("x:wax", -1);
      else if (haveOld("d:mint") >= 3) addOld("d:mint", -3);
      else { toast("Нужен воск или три сушёных пучка мяты."); return; }
      y.guest = 2; F().coins += 80; y.craft.skep = true;
    }
    noteQuestGuest(); payQuest(); save();
    toast(y.guest >= 2 ? "Степан благодарит. +80 монет и колода." : "Степан принял мёд.");
    show();
  }
  function giveFair() {
    ensure();
    var y = F().yard; if (!y.built.square || y.fair >= 3) return;
    if (y.fair === 0) {
      if (haveOld("t:mintTea") >= 1) addOld("t:mintTea", -1);
      else if (haveOld("d:mint") >= 3) addOld("d:mint", -3);
      else { toast("Нужен мятный чай или три сушёных пучка мяты."); return; }
      y.fair = 1;
    } else if (y.fair === 1) {
      var made = y.craft.lantern || y.craft.bed || y.craft.garland;
      if (made) { /* вещь остаётся у игрока, это показ, не трата */ }
      else if (bag("m:bark") >= 2) addBag("m:bark", -2);
      else { toast("Нужна готовая вещь мастерской или две бересты."); return; }
      y.fair = 2;
    } else {
      if (bag("yt:lemon") >= 1) addBag("yt:lemon", -1);
      else if (haveOld("t:calm") >= 1) addOld("t:calm", -1);
      else { toast("Нужен чай с лимонной мятой или чай «Уютный вечер»."); return; }
      y.fair = 3; F().coins += 100; if (!y.craft.garland) y.craft.garland = true;
    }
    noteQuestGuest(); payQuest(); save();
    toast(y.fair >= 3 ? "Марья Петровна довольна. +100 монет." : "Шаг принят. Следующий можно сделать когда удобно.");
    show();
  }

  function onGather() {
    ensure();
    var y = F().yard;
    y.finds = (y.finds || 0) + 1;
    if (y.finds % 3 === 0) {
      var item = D.finds[(y.finds / 3 - 1) % D.finds.length];
      addBag("m:" + item.id, 1);
      toast("В корзине ещё находка: " + item.n + ". Она для мастерской.");
    }
    save();
  }

  function nextGoal() {
    ensure();
    var y = F().yard, i;
    for (i = 0; i < D.buildings.length; i++) {
      var b = D.buildings[i];
      if (!y.built[b.id]) return "Дальше: «" + b.n + "», уровень " + b.lvl + ", " + b.price + " монет.";
    }
    if (!y.album) return "Дальше: соберите набор «Чайный сад» в домике травника.";
    if (y.fair < 3) return "Дальше: история Марьи Петровны на площади.";
    if (!y.questPaid) return "Дальше: тропинка усадьбы.";
    return "Усадьба живая. Можно ставить украшения и заваривать чай, когда захочется.";
  }

  function cardBuildings() {
    ensure();
    var y = F().yard, lv = level();
    var rows = D.buildings.map(function (b) {
      var own = y.built[b.id], lock = lv < b.lvl;
      var btn = own ? '<button class="btn btn-primary btn-big" data-tab="' + (b.id === "house" ? "herbalist" : b.id === "workshop" ? "workshop" : "square") + '">Войти</button>'
        : lock ? '<p class="lock">Откроется на уровне ' + b.lvl + '</p>'
        : '<button class="btn btn-primary btn-big" data-yard="buy:' + b.id + '"' + (F().coins < b.price ? " disabled" : "") + '>Построить · ' + b.price + " монет</button>";
      return '<div class="yard-row">' + picHouse() + '<div><b>' + b.n + '</b><p>' + b.d + '</p>' + btn + '</div></div>';
    }).join("");
    return '<div class="card yard-card"><h3 class="first">Усадьба</h3><p>' + nextGoal() + '</p>' + rows + decorRow() + '</div>';
  }
  function decorRow() {
    var y = F().yard, ids = ["lantern", "bed", "garland"];
    var own = ids.filter(function (id) { return y.craft[id]; });
    if (!own.length && !y.craft.skep) return "";
    var bits = own.map(function (id) {
      var c = craft(id), on = y.placed[id];
      return '<button class="btn btn-ghost yard-chip" data-yard="place:' + id + '">' + picItem(id) + '<span>' + (c ? c.n : "Гирлянда") + (on ? " · стоит" : " · поставить") + "</span></button>";
    }).join("");
    if (y.craft.skep) bits += '<span class="yard-chip">' + picItem("skep") + "<span>Колода Степана</span></span>";
    return '<h3>Украшения двора</h3><div class="yard-chips">' + bits + "</div>";
  }

  function screenHouse() {
    ensure();
    var y = F().yard;
    if (!y.built.house) return '<div class="card"><p>Домик ещё не построен. Его ставят из карточки «Усадьба» на угодьях.</p><button class="btn btn-primary btn-big" data-tab="farm">К угодьям</button></div>';
    var green = !!F().up.greenhouse;
    var vars = D.varieties.map(function (v) {
      var fresh = bag("yf:" + v.id), dry = bag("yd:" + v.id);
      return '<div class="yard-row">' + picVariety(v, 72) + '<div><b>' + v.n + '</b><p>Свежих ' + fresh + " · сушёных " + dry + "</p>" +
        (green ? '<button class="btn btn-primary btn-big" data-yard="cut:' + v.id + '"' + (F().coins < v.seed ? " disabled" : "") + ">Срезать 2 пучка · " + v.seed + " монет</button>" : '<p class="lock">Нужна теплица из улучшений: уровень 9, 450 монет.</p>') +
        '<button class="btn btn-ghost btn-big" data-yard="dry:' + v.id + '"' + (fresh ? "" : " disabled") + ">Положить свежие на полку</button></div></div>";
    }).join("");
    var teas = D.teas.map(function (t) {
      var ok = teaNeedOk(t);
      return '<div class="yard-row"><div><b>' + t.n + '</b><p>' + t.note + " Готово: " + bag("yt:" + t.id) + ".</p>" +
        '<button class="btn btn-primary btn-big" data-yard="brew:' + t.id + '"' + (ok ? "" : " disabled") + ">Заварить</button></div></div>";
    }).join("");
    var album = albumCard();
    return '<div class="card"><h2 class="farm-title">Домик травника</h2><p>Персонаж игры здесь не ставит диагнозов. Чай заваривают к столу.</p>' + vars + "</div>" +
      '<div class="card"><h3 class="first">Чаи домика</h3>' + teas + "</div>" + album;
  }
  function albumCard() {
    var y = F().yard;
    var items = [
      { n: "Чай с лимонной мятой", on: bag("yt:lemon") > 0 },
      { n: "Чай крупной ромашки", on: bag("yt:daisy") > 0 },
      { n: "Мятный чай", on: !!F().seen["t:mintTea"] }
    ];
    var n = items.filter(function (it) { return it.on; }).length;
    var body = items.map(function (it) { return '<span class="yard-alb' + (it.on ? " on" : "") + '">' + (it.on ? it.n : "Ещё не заварено") + "</span>"; }).join("");
    var btn = n === 3 && !y.album ? '<button class="btn btn-primary btn-big" data-yard="album">Забрать 60 монет за «Чайный сад»</button>' : y.album ? '<p class="ok-line">Набор «Чайный сад» собран.</p>' : '<p>Собрано ' + n + " из 3.</p>";
    return '<div class="card" id="yard-album"><h3 class="first">Альбом «Чайный сад»</h3><div class="yard-album">' + body + "</div>" + btn + "</div>";
  }
  function claimAlbum() {
    ensure();
    var y = F().yard;
    if (y.album || bag("yt:lemon") < 1 || bag("yt:daisy") < 1 || !F().seen["t:mintTea"]) return;
    y.album = true; F().coins += 60; save();
    toast("Набор «Чайный сад»: +60 монет.");
    show();
  }
  function screenWorkshop() {
    ensure();
    var y = F().yard;
    if (!y.built.workshop) return '<div class="card"><p>Мастерскую строят с 14 уровня за 750 монет.</p><button class="btn btn-primary btn-big" data-tab="farm">К угодьям</button></div>';
    var finds = D.finds.map(function (f) { return "<b>" + bag("m:" + f.id) + "</b> " + f.n; }).join(" · ");
    var rows = D.crafts.map(function (c) {
      var own = y.craft[c.id];
      var need = Object.keys(c.need).map(function (k) { return findName(k) + " " + bag("m:" + k) + "/" + c.need[k]; }).join(", ");
      return '<div class="yard-row">' + picItem(c.id) + '<div><b>' + c.n + '</b><p>' + need + " · " + c.coins + " монет</p>" +
        (own ? '<p class="ok-line">Уже сделано</p>' : '<button class="btn btn-primary btn-big" data-yard="craft:' + c.id + '"' + (craftNeedOk(c) ? "" : " disabled") + ">Сделать</button>") +
        "</div></div>";
    }).join("");
    return '<div class="card"><h2 class="farm-title">Мастерская</h2><p>Находки: ' + finds + ". Каждый третий поход в лес приносит одну.</p>" + rows + "</div>";
  }
  function screenSquare() {
    ensure();
    var y = F().yard;
    if (!y.built.square) return '<div class="card"><p>Площадь открывается на 16 уровне за 900 монет. Торопить некого: шаг не сгорает.</p><button class="btn btn-primary btn-big" data-tab="farm">К угодьям</button></div>';
    var fairText = [
      "Марья Петровна, персонаж игры, собирает стол. Принесите мятный чай или три сушёных пучка мяты.",
      "Покажите вещь из мастерской. Если мастерской нет, хватит двух берест.",
      "Для стола нужен чай с лимонной мятой или чай «Уютный вечер».",
      "История закончена. Марья Петровна больше ничего не просит."
    ][y.fair];
    var bee = beeCard();
    var questText = [
      "Шаг 1. Постройте домик травника.",
      "Шаг 2. Поставьте во дворе любое украшение мастерской.",
      "Шаг 3. Доведите до конца историю Степана или Марьи Петровны.",
      y.questPaid ? "Тропинка пройдена." : "Тропинка почти пройдена."
    ][Math.min(y.quest, 3)];
    return '<div class="card"><h2 class="farm-title">Ярмарочная площадь</h2><p>' + fairText + '</p>' +
      (y.fair < 3 ? '<button class="btn btn-primary btn-big" data-yard="fair">Отдать шаг</button>' : '<p class="ok-line">История Марьи Петровны завершена.</p>') +
      "</div>" + bee + '<div class="card"><h3 class="first">Тропинка усадьбы</h3><p>' + questText + "</p><p>Срока нет и штрафа за паузу нет.</p></div>";
  }
  function beeCard() {
    ensure();
    var y = F().yard;
    var text = [
      "Пчеловод Степан, персонаж игры, просит одну баночку мёда: цветочного или из улья во дворе.",
      "Дальше ему нужен воск или три сушёных пучка мяты.",
      "Степан больше не просит. Колода остаётся у вас."
    ][Math.min(y.guest, 2)];
    return '<div class="card"><h3 class="first">Пчеловод Степан</h3><p>' + text + "</p>" +
      (y.guest < 2 ? '<button class="btn btn-primary btn-big" data-yard="bee">Отдать</button>' : '<p class="ok-line">Просьбы закончились.</p>') + "</div>";
  }

  function show() { if (LZFarm.refresh) LZFarm.refresh(); }
  function paintFarm() {
    var root = $("farm-root"); if (!root) return;
    var old = root.querySelector(".yard-card"); if (old) old.remove();
    root.insertAdjacentHTML("beforeend", cardBuildings());
  }
  function paintApiary() {
    var root = $("apiary-root"); if (!root) return;
    var old = root.querySelector(".yard-bee"); if (old) old.remove();
    if (!F().areas || !F().areas.apiary) return;
    root.insertAdjacentHTML("beforeend", '<div class="yard-bee">' + beeCard() + "</div>");
  }
  function paintCollection() {
    var root = $("collection-root"); if (!root) return;
    var old = root.querySelector("#yard-album"); if (old) old.parentNode.removeChild(old);
    root.insertAdjacentHTML("beforeend", albumCard());
  }
  function onShow(name) {
    ensure();
    if (name === "herbalist" && $("herbalist-root")) $("herbalist-root").innerHTML = screenHouse();
    if (name === "workshop" && $("workshop-root")) $("workshop-root").innerHTML = screenWorkshop();
    if (name === "square" && $("square-root")) $("square-root").innerHTML = screenSquare();
    if (name === "farm") paintFarm();
    if (name === "apiary") paintApiary();
    if (name === "collection") paintCollection();
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("[data-yard]") : null;
    if (!el) return;
    e.preventDefault();
    var parts = el.getAttribute("data-yard").split(":");
    var act = parts[0], id = parts[1];
    if (act === "buy") buy(id);
    else if (act === "cut") cut(id);
    else if (act === "dry") dryAll(id);
    else if (act === "brew") brew(id);
    else if (act === "craft") makeCraft(id);
    else if (act === "place") place(id);
    else if (act === "bee") giveBee();
    else if (act === "fair") giveFair();
    else if (act === "album") claimAlbum();
  });

  window.LZYard = { onShow: onShow, onGather: onGather, ensure: ensure };
})();
