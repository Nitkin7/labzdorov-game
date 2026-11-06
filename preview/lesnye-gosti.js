/* Лаборатория здоровья — учебный показ лесных гостей.
   Отдельная страница preview/lesnye-gosti.html.
   Не подключается к игре, не пишет lz_farm_v1 / lz_game_v1 / lz_brain_v1,
   не меняет цены, уровни и урожай. */
(function () {
  "use strict";

  var WATCH_PREFIX = "lz_";
  var snap = {};
  var storageOk = true;
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf(WATCH_PREFIX) === 0) snap[key] = localStorage.getItem(key);
    }
  } catch (err) {
    storageOk = false;
  }
  try {
    var proto = Storage.prototype;
    var origSet = proto.setItem;
    var origRemove = proto.removeItem;
    proto.setItem = function (k, v) {
      if (typeof k === "string" && k.indexOf(WATCH_PREFIX) === 0) {
        markBlocked(k);
        return;
      }
      return origSet.apply(this, arguments);
    };
    proto.removeItem = function (k) {
      if (typeof k === "string" && k.indexOf(WATCH_PREFIX) === 0) {
        markBlocked(k);
        return;
      }
      return origRemove.apply(this, arguments);
    };
    proto.clear = function () { markBlocked("clear"); };
  } catch (err2) {}

  /* Точки лап, в процентах сцены. Тропинка рисуется по этим же точкам. */
  /* Гость идёт по центру из леса и сворачивает к левой грядке.
     Пёс бежит справа, мимо грядок, и встаёт на повороте раньше мяты. */
  var PT = {
    forest: { x: 50, y: 16 },
    mid: { x: 50, y: 26 },
    pause: { x: 52, y: 34 },
    lane: { x: 52, y: 46 },
    block: { x: 26, y: 48 },
    bed: { x: 20, y: 66 },
    side: { x: 82, y: 46 },
    sideLow: { x: 82, y: 78 },
    kennel: { x: 78, y: 94 }
  };
  var VB_W = 1000, VB_H = 1280;
  var SPEED = { fox: 78, hedgehog: 52, dog: 96 };
  var ANIMALS = {
    fox: { id: "fox", n: "Лиса", low: "лиса", acc: "лису", verb: "вышла", took: "унесла", pron: "её" },
    hedgehog: { id: "hedgehog", n: "Ёж", low: "ёж", acc: "ежа", verb: "вышел", took: "унёс", pron: "его" }
  };

  var params = new URLSearchParams(location.search);
  var reduce = params.get("reduce") === "1" || !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var state = {
    animal: params.get("animal") === "hedgehog" ? "hedgehog" : "fox",
    dog: params.get("dog") !== "0",
    lost: false
  };
  var runId = 0;
  var walkers = [];
  var stepTimer = null;
  var blocked = false;

  var guest = $("guest");
  var dog = $("dog");
  var guestFlip = $("guest-flip");
  var dogFlip = $("dog-flip");
  var printsEl = $("prints");
  var scene = $("scene");

  function $(id) { return document.getElementById(id); }
  function animal() { return ANIMALS[state.animal]; }

  function markBlocked(k) {
    blocked = true;
    var line = $("save-line");
    if (line) {
      line.className = "save-bad";
      line.textContent = "Страница остановила запись («" + k + "»). Сохранения игры не должны меняться.";
    }
  }

  function verifySaves() {
    if (!storageOk) return { ok: true, note: "Хранилище браузера недоступно. Страница его не использует." };
    if (blocked) return { ok: false, note: "Была попытка записать сохранение игры. Запись остановлена." };
    try {
      var seen = {};
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key || key.indexOf(WATCH_PREFIX) !== 0) continue;
        seen[key] = localStorage.getItem(key);
        if (snap[key] !== seen[key]) return { ok: false, note: "Ключ " + key + " изменился. Так быть не должно." };
      }
      for (var old in snap) {
        if (Object.prototype.hasOwnProperty.call(snap, old) && seen[old] !== snap[old]) {
          return { ok: false, note: "Ключ " + old + " пропал или изменился. Так быть не должно." };
        }
      }
    } catch (err) {
      return { ok: false, note: "Не удалось перечитать сохранения." };
    }
    var n = Object.keys(snap).length;
    return {
      ok: true,
      note: n
        ? "Сохранения игры на месте и не изменились."
        : "Сохранений игры в этом браузере нет. Страница их не создаёт."
    };
  }

  function paintSaves() {
    var v = verifySaves();
    var line = $("save-line");
    if (!line) return;
    line.className = v.ok ? "save-ok" : "save-bad";
    line.textContent = v.note;
  }

  function say(kicker, text, score) {
    $("kicker").textContent = kicker;
    $("caption").textContent = text;
    var scoreEl = $("score");
    var story = $("story");
    if (score) {
      scoreEl.hidden = false;
      scoreEl.textContent = score;
      story.classList.add("is-sample");
    } else {
      scoreEl.hidden = true;
      scoreEl.textContent = "";
      story.classList.remove("is-sample");
    }
  }

  function xy(p) {
    return (p.x / 100 * VB_W).toFixed(1) + " " + (p.y / 100 * VB_H).toFixed(1);
  }
  function chain(points) {
    var d = "M " + xy(points[0]);
    for (var i = 1; i < points.length; i++) d += " L " + xy(points[i]);
    return d;
  }
  function drawPath() {
    var vert = chain([PT.forest, PT.mid, PT.pause, PT.lane]);
    var branch = chain([PT.side, PT.lane, PT.block, PT.bed]);
    var dogRoad = chain([PT.side, PT.sideLow]);
    var svg = $("demo-path");
    svg.setAttribute("viewBox", "0 0 " + VB_W + " " + VB_H);
    svg.innerHTML = '<path class="p1" d="' + vert + '"></path><path class="p1" d="' + branch + '"></path><path class="p1" d="' + dogRoad + '"></path>' +
      '<path class="p2" d="' + vert + '"></path><path class="p2" d="' + branch + '"></path><path class="p2" d="' + dogRoad + '"></path>';
  }

  function place(el, p) {
    el.style.left = p.x + "%";
    el.style.top = p.y + "%";
  }
  function face(el, dir) {
    (el === guest ? guestFlip : dogFlip).classList.toggle("left", dir === "left");
  }
  function hold(id, ms) {
    return new Promise(function (resolve) {
      setTimeout(function () { resolve(id === runId); }, ms);
    });
  }
  function travelMs(from, to, who) {
    var dx = (to.x - from.x) * 5.4;
    var dy = (to.y - from.y) * 6.4;
    var dist = Math.sqrt(dx * dx + dy * dy);
    return Math.max(680, Math.round(dist / SPEED[who] * 1000));
  }
  function posOf(el) {
    return { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
  }

  function dropPrint(x, y, side) {
    if (printsEl.childElementCount > 26) return;
    var mark = document.createElement("i");
    mark.className = "print" + (reduce ? " still" : "");
    mark.style.left = x + "%";
    mark.style.top = y + "%";
    mark.style.transform = "translate(-50%, -50%) rotate(" + (side * 18) + "deg)";
    printsEl.appendChild(mark);
  }
  function feetOf(el) {
    var s = scene.getBoundingClientRect();
    var r = el.getBoundingClientRect();
    if (!s.width || !s.height) return null;
    return {
      x: (r.left + r.width / 2 - s.left) / s.width * 100,
      y: (r.bottom - s.top) / s.height * 100
    };
  }
  function tickSteps() {
    for (var i = 0; i < walkers.length; i++) {
      var w = walkers[i];
      var pt = feetOf(w.el);
      if (!pt) continue;
      if (w.last) {
        var dx = (pt.x - w.last.x) * 5.4;
        var dy = (pt.y - w.last.y) * 6.4;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 26 || dist > 120) continue;
      }
      w.side = -w.side;
      dropPrint(pt.x + w.side * 1.1, pt.y, w.side);
      w.last = pt;
    }
  }
  function watchSteps(el) {
    if (reduce) return;
    walkers.push({ el: el, last: feetOf(el), side: el === dog ? 1 : -1 });
    if (!stepTimer) stepTimer = setInterval(tickSteps, 200);
  }
  function unwatchSteps(el) {
    walkers = walkers.filter(function (w) { return w.el !== el; });
    if (!walkers.length && stepTimer) {
      clearInterval(stepTimer);
      stepTimer = null;
    }
  }
  function stopAllSteps() {
    walkers = [];
    if (stepTimer) clearInterval(stepTimer);
    stepTimer = null;
  }

  function showActor(el) {
    el.setAttribute("aria-hidden", "false");
    if (reduce) {
      el.style.transition = "none";
      el.classList.add("show", "idle");
      return;
    }
    el.style.transition = "opacity .4s linear";
    void el.offsetWidth;
    el.classList.add("show", "idle");
  }
  function hideActor(el) {
    el.classList.remove("walking", "idle");
    el.setAttribute("aria-hidden", "true");
    if (reduce) el.style.transition = "none";
    else el.style.transition = "opacity .4s linear";
    el.classList.remove("show");
  }

  async function walk(id, el, to, who, dir) {
    if (id !== runId) return false;
    var from = posOf(el);
    if (dir) face(el, dir);
    el.classList.add("walking");
    el.classList.remove("idle");
    var ms = travelMs(from, to, who);
    if (reduce) {
      place(el, to);
      dropPrint(to.x, to.y, dir === "left" ? -1 : 1);
      el.classList.remove("walking");
      if (id === runId) el.classList.add("idle");
      return hold(id, 820);
    }
    watchSteps(el);
    el.style.transition = "left " + ms + "ms linear, top " + ms + "ms linear";
    void el.offsetWidth;
    place(el, to);
    var ok = await hold(id, ms);
    if (id !== runId) return false;
    unwatchSteps(el);
    el.classList.remove("walking");
    el.classList.add("idle");
    return ok;
  }

  function setKennel() {
    var box = $("kennel");
    var label = $("kennel-label");
    if (state.dog) {
      box.classList.remove("absent");
      label.textContent = "Шарик";
      box.setAttribute("aria-label", "Будка, Шарик сторожит огород");
    } else {
      box.classList.add("absent");
      box.classList.remove("dog-out");
      label.textContent = "Собаки нет";
      box.setAttribute("aria-label", "Будка пустая, собаки нет");
    }
  }

  function resetScene() {
    stopAllSteps();
    state.lost = false;
    printsEl.innerHTML = "";
    $("bark").classList.remove("on");
    guest.classList.remove("show", "walking", "idle", "has-plant", "fox", "hedgehog");
    guest.classList.add(state.animal);
    guest.style.transition = "none";
    $("guest-img").src = "../img/scene/" + state.animal + ".svg";
    guest.setAttribute("aria-label", animal().n);
    place(guest, PT.forest);
    face(guest, "left");
    dog.classList.remove("show", "walking", "idle");
    dog.style.transition = "none";
    place(dog, PT.kennel);
    face(dog, "left");
    $("sprig-2").classList.remove("gone");
    $("paw").hidden = true;
    $("mint-label").textContent = "Собрать!";
    $("bed-mint").classList.remove("bitten");
    $("bed-mint").setAttribute("aria-label", "Грядка мяты: два пучка");
    setKennel();
    $("kennel").classList.remove("dog-out");
  }

  function takePlant() {
    state.lost = true;
    $("sprig-2").classList.add("gone");
    $("paw").hidden = false;
    $("mint-label").textContent = "−1 пучок";
    $("bed-mint").classList.add("bitten");
    $("bed-mint").setAttribute("aria-label", "Грядка мяты: унесён один пучок, второй на месте. Это образец.");
    guest.classList.add("has-plant");
  }

  function sampleSafe() {
    var a = animal();
    return "Образец, не ваши монеты: +3. Шарик прогнал " + a.acc + ". В игру это не записывается, мята цела.";
  }
  function sampleLost() {
    var a = animal();
    return "Образец, не ваша грядка: " + a.n + " " + a.took + " 1 пучок мяты. Второй пучок и ромашка целы. В игре ничего не списано.";
  }

  async function play() {
    var id = ++runId;
    resetScene();
    var a = animal();
    var withDog = state.dog;
    if (reduce) document.body.classList.add("demo-reduce");
    say(
      "Смотрите на тропинку",
      a.n + " " + a.verb + " из леса и идёт к грядке с мятой." +
        (withDog ? " Шарик выбегает из будки навстречу." : " Собаки нет — смотрите, что будет с одним пучком.")
    );
    showActor(guest);
    var dogRun = null;
    if (withDog) {
      $("kennel").classList.add("dog-out");
      showActor(dog);
      dogRun = (async function () {
        if (!(await walk(id, dog, PT.sideLow, "dog", "left"))) return false;
        if (!(await walk(id, dog, PT.side, "dog", "left"))) return false;
        if (!(await walk(id, dog, PT.block, "dog", "left"))) return false;
        return id === runId;
      })();
    }
    if (!(await walk(id, guest, PT.mid, a.id, "left"))) return;
    if (!(await walk(id, guest, PT.pause, a.id, "left"))) return;
    if (withDog) {
      say("Смотрите на тропинку", a.n + " остановил" + (a.id === "fox" ? "ась" : "ся") + " перед огородом. Шарик бежит к калитке и заступает дорогу к мяте.");
      if (!(await dogRun)) return;
      if (state.lost) return;
      $("bark").classList.add("on");
      say("Образец", "Шарик не пустил " + a.acc + " к мяте. Оба пучка на месте. " + a.n + " поворачивает в лес.", sampleSafe());
      if (!(await hold(id, reduce ? 900 : 1200))) return;
      $("bark").classList.remove("on");
      var backGuest = walk(id, guest, PT.mid, a.id, "right");
      if (!(await hold(id, reduce ? 400 : 500))) return;
      if (!(await walk(id, dog, PT.lane, "dog", "right"))) return;
      if (!(await walk(id, dog, PT.pause, "dog", "right"))) return;
      if (!(await backGuest)) return;
      if (!(await walk(id, guest, PT.forest, a.id, "right"))) return;
      hideActor(guest);
      if (!(await hold(id, reduce ? 200 : 420))) return;
      say("Образец", "Шарик проводил " + a.acc + " до леса и возвращается к будке. Урожай цел.", sampleSafe());
      if (!(await walk(id, dog, PT.lane, "dog", "right"))) return;
      if (!(await walk(id, dog, PT.side, "dog", "right"))) return;
      if (!(await walk(id, dog, PT.sideLow, "dog", "right"))) return;
      if (!(await walk(id, dog, PT.kennel, "dog", "right"))) return;
      hideActor(dog);
      $("kennel").classList.remove("dog-out");
      if (state.lost) {
        say("Ошибка показа", "С собакой мята не должна пропасть.", "");
      }
    } else {
      say("Смотрите на тропинку", a.n + " идёт через калитку к мяте. Ромашка в стороне.");
      if (!(await walk(id, guest, PT.lane, a.id, "left"))) return;
      if (!(await walk(id, guest, PT.block, a.id, "left"))) return;
      if (!(await walk(id, guest, PT.bed, a.id, "left"))) return;
      takePlant();
      say("Образец", a.n + " берёт один пучок мяты. Второй остаётся на грядке. Пучок виден у зверя.", sampleLost());
      if (!(await hold(id, reduce ? 900 : 1100))) return;
      if (!(await walk(id, guest, PT.block, a.id, "right"))) return;
      if (!(await walk(id, guest, PT.lane, a.id, "right"))) return;
      if (!(await walk(id, guest, PT.pause, a.id, "right"))) return;
      say("Образец", a.n + " несёт мяту обратно в лес. На грядке следы и на один пучок меньше.", sampleLost());
      if (!(await walk(id, guest, PT.mid, a.id, "right"))) return;
      if (!(await walk(id, guest, PT.forest, a.id, "right"))) return;
      hideActor(guest);
    }
    if (id === runId) paintSaves();
  }

  function seed(points) {
    for (var i = 0; i < points.length; i++) dropPrint(points[i].x, points[i].y, i % 2 ? 1 : -1);
  }

  function showPose(pose) {
    runId++;
    resetScene();
    if (reduce) document.body.classList.add("demo-reduce");
    var a = animal();
    if (pose === "carry") {
      state.dog = false;
      setKennel();
      takePlant();
      place(guest, PT.pause);
      face(guest, "right");
      showActor(guest);
      seed([PT.forest, PT.mid, PT.lane, PT.block, PT.bed, PT.pause]);
      say("Образец", a.n + " несёт один пучок мяты обратно в лес. До грядки собака не дошла — её нет. Второй пучок на месте.", sampleLost());
    } else {
      state.dog = true;
      setKennel();
      $("kennel").classList.add("dog-out");
      place(guest, PT.pause);
      face(guest, "left");
      showActor(guest);
      place(dog, PT.block);
      face(dog, "right");
      showActor(dog);
      $("bark").classList.add("on");
      seed([PT.forest, PT.mid, PT.pause, PT.kennel, PT.sideLow, PT.side, PT.block]);
      say("Образец", "Шарик заступил дорогу. " + a.n + " до мяты не дошл" + (a.id === "fox" ? "а" : "ёл") + ". Оба пучка целы.", sampleSafe());
    }
    document.body.setAttribute("data-pose", pose);
    document.body.setAttribute("data-lost", state.lost ? "1" : "0");
    paintSaves();
  }

  function press(animalId, dogOn) {
    state.animal = animalId;
    state.dog = dogOn;
    $("btn-fox").setAttribute("aria-pressed", animalId === "fox" ? "true" : "false");
    $("btn-hedgehog").setAttribute("aria-pressed", animalId === "hedgehog" ? "true" : "false");
    $("btn-dog-on").setAttribute("aria-pressed", dogOn ? "true" : "false");
    $("btn-dog-off").setAttribute("aria-pressed", dogOn ? "false" : "true");
  }

  $("btn-fox").addEventListener("click", function () { press("fox", state.dog); play(); });
  $("btn-hedgehog").addEventListener("click", function () { press("hedgehog", state.dog); play(); });
  $("btn-dog-on").addEventListener("click", function () { press(state.animal, true); play(); });
  $("btn-dog-off").addEventListener("click", function () { press(state.animal, false); play(); });
  $("replay").addEventListener("click", function () { play(); });

  if (reduce) document.body.classList.add("demo-reduce");
  drawPath();
  press(state.animal, state.dog);
  paintSaves();

  var pose = params.get("pose");
  if (pose === "intercept" || pose === "carry") showPose(pose);
  else if (params.get("play") !== "0") play();
  else {
    resetScene();
    say("Смотрите на тропинку", "Нажмите «Показать ещё раз». " + animal().n + " выйдет из леса к мяте.");
  }

  window.__DEMO = {
    verifySaves: verifySaves,
    points: PT,
    reduce: reduce,
    get lost() { return state.lost; },
    get animal() { return state.animal; },
    get dog() { return state.dog; }
  };
})();
