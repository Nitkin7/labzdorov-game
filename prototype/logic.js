/* Прототип «Логические задачи». Не подключён к меню и не пишет в сохранения игры. */
(function () {
  "use strict";
  var app = document.getElementById("app");
  var toastEl = document.getElementById("toast");
  var toastTimer = 0;
  var soundOn = true;
  var audio;
  var view = { name: "hub" };

  var ODD = [
    { items: ["Ромашка", "Мята", "Календула", "Молоток"], answer: 3, hint: "Три из них растут на грядке.", why: "Молоток — инструмент. Остальные — травы." },
    { items: ["Чашка", "Блюдце", "Чайник", "Ботинок"], answer: 3, hint: "Три предмета ставят на стол к чаю.", why: "Ботинок не чайная посуда." },
    { items: ["Понедельник", "Вторник", "Среда", "Яблоко"], answer: 3, hint: "Три слова — это дни недели.", why: "Яблоко не день недели." },
    { items: ["Яблоко", "Груша", "Слива", "Морковь"], answer: 3, hint: "Три из них — фрукты.", why: "Морковь — овощ, остальные фрукты." },
    { items: ["Весна", "Лето", "Осень", "Стол"], answer: 3, hint: "Три слова называют времена года.", why: "Стол не время года." },
    { items: ["Ложка", "Вилка", "Нож", "Книга"], answer: 3, hint: "Три предмета берут за едой.", why: "Книгу за обедом не кладут в тарелку." },
    { items: ["Кошка", "Собака", "Курица", "Самовар"], answer: 3, hint: "Трое из них живые.", why: "Самовар — посуда для кипятка." },
    { items: ["Шарф", "Варежки", "Шапка", "Арбуз"], answer: 3, hint: "Три вещи надевают в холод.", why: "Арбуз — летнее угощение, не одежда." },
    { items: ["Мёд", "Варенье", "Чай", "Топор"], answer: 3, hint: "Три из них можно поставить к чаепитию.", why: "Топор — инструмент, не угощение." },
    { items: ["Январь", "Февраль", "Март", "Пятница"], answer: 3, hint: "Три слова — месяцы.", why: "Пятница — день недели, не месяц." }
  ];
  var SEQ = [
    { show: ["2", "4", "6", "8"], choices: ["9", "10", "12"], answer: 1, hint: "Каждое число больше предыдущего на 2.", why: "Дальше идёт 10." },
    { show: ["1", "3", "5", "7"], choices: ["8", "9", "10"], answer: 1, hint: "Это нечётные числа подряд.", why: "После 7 будет 9." },
    { show: ["5", "10", "15", "20"], choices: ["22", "25", "30"], answer: 1, hint: "Каждый шаг прибавляет 5.", why: "20 и ещё 5 — это 25." },
    { show: ["1", "2", "4", "8"], choices: ["10", "12", "16"], answer: 2, hint: "Каждое число вдвое больше предыдущего.", why: "8 умножить на 2 — 16." },
    { show: ["Пн", "Вт", "Ср", "Чт"], choices: ["Пт", "Сб", "Вс"], answer: 0, hint: "Дни недели по порядку.", why: "После четверга — пятница." },
    { show: ["Янв", "Фев", "Мар", "Апр"], choices: ["Май", "Июн", "Июл"], answer: 0, hint: "Месяцы идут как в календаре.", why: "После апреля — май." },
    { show: ["3", "6", "9", "12"], choices: ["13", "15", "18"], answer: 1, hint: "Считаем по три.", why: "12 и ещё 3 — это 15." },
    { show: ["10", "20", "30", "40"], choices: ["45", "50", "60"], answer: 1, hint: "Каждый раз прибавляем 10.", why: "После 40 будет 50." },
    { show: ["1", "1", "2", "3", "5"], choices: ["6", "7", "8"], answer: 2, hint: "Каждое число — сумма двух предыдущих.", why: "3 и 5 в сумме дают 8." },
    { show: ["Утро", "День", "Вечер"], choices: ["Ночь", "Зима", "Обед"], answer: 0, hint: "Это части одних суток по порядку.", why: "После вечера наступает ночь." }
  ];
  var SUDO = [
    { sol: "1234341221434321", giv: "0234301221034320" },
    { sol: "4321214312343412", giv: "0321204312043410" },
    { sol: "4321214312343412", giv: "0301204312043410" },
    { sol: "4312213434211243", giv: "0302203434011240" },
    { sol: "1342243131244213", giv: "0302203031044210" },
    { sol: "1342243142133124", giv: "0302203042033120" },
    { sol: "1432234132144123", giv: "0402204002044120" },
    { sol: "1342243142133124", giv: "0302203002033120" },
    { sol: "2314142332414132", giv: "0304102002014030" },
    { sol: "3214143223414123", giv: "0204103003014020" }
  ];

  function load() {
    try { return JSON.parse(sessionStorage.getItem("lz_logic_proto") || "{}"); }
    catch (e) { return {}; }
  }
  function save(data) { try { sessionStorage.setItem("lz_logic_proto", JSON.stringify(data)); } catch (e) {} }
  function doneCount(id) {
    var d = load()[id] || [];
    return d.filter(Boolean).length;
  }
  function markDone(id, level) {
    var all = load();
    var row = all[id] || [];
    row[level] = true;
    all[id] = row;
    save(all);
  }
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2000);
  }
  function tone(ok) {
    if (!soundOn) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      var o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = ok ? 520 : 220;
      g.gain.setValueAtTime(0.0001, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.05, audio.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.18);
      o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + 0.2);
    } catch (e) {}
  }
  function el(html) { app.innerHTML = html; bind(); }
  function bind() {
    app.querySelectorAll("[data-act]").forEach(function (node) {
      node.addEventListener("click", function () { onAct(node.getAttribute("data-act"), node); });
    });
  }
  function head(title) {
    return '<div class="top"><button class="back" type="button" data-act="back">← Назад</button><b>' + title + '</b>' +
      '<button class="sound" type="button" data-act="sound" aria-pressed="' + soundOn + '">' + (soundOn ? "Звук" : "Тихо") + "</button></div>";
  }
  function hintBtn() {
    return '<button class="hint" type="button" data-act="hint">Подсказка</button>';
  }

  function render() {
    if (view.name === "hub") return renderHub();
    if (view.name === "levels") return renderLevels();
    if (view.name === "odd") return renderOdd();
    if (view.name === "seq") return renderSeq();
    if (view.name === "sudo") return renderSudo();
    if (view.name === "win") return renderWin();
  }
  function renderHub() {
    el(
      "<h1>Логические задачи</h1>" +
      '<p class="note">Прототип. В меню игры пока не входит. Спешить не нужно.</p>' +
      '<div class="top"><span></span>' +
      '<button class="sound" type="button" data-act="sound" aria-pressed="' + soundOn + '">' + (soundOn ? "Звук" : "Тихо") + "</button></div>" +
      '<div class="games">' +
      gameCard("odd", "Что лишнее", "Четыре картинки словами. Одно не из этой компании.") +
      gameCard("seq", "Продолжи ряд", "Какое число или слово идёт дальше.") +
      gameCard("sudo", "Судоку 4×4", "Цифры от 1 до 4 без повторов.") +
      "</div>"
    );
  }
  function gameCard(id, title, text) {
    return '<button class="game" type="button" data-act="open" data-id="' + id + '"><b>' + title + '</b><span>' + text +
      '</span><span class="progress">Пройдено ' + doneCount(id) + " из 10</span></button>";
  }
  function renderLevels() {
    var names = { odd: "Что лишнее", seq: "Продолжи ряд", sudo: "Судоку 4×4" };
    var row = load()[view.id] || [];
    var buttons = "";
    for (var i = 0; i < 10; i++) {
      buttons += '<button class="lv' + (row[i] ? " done" : "") + '" type="button" data-act="level" data-n="' + i + '">' + (i + 1) + "</button>";
    }
    el(head(names[view.id]) + '<p class="note">Выберите ступень. Пройденные можно решать снова.</p><div class="levels">' + buttons + "</div>");
  }
  function renderOdd() {
    var p = ODD[view.level];
    var cards = p.items.map(function (name, i) {
      return '<button class="choice" type="button" data-act="pick" data-n="' + i + '">' + name + "</button>";
    }).join("");
    el(head((view.level + 1) + " из 10") + hintBtn() +
      '<h2 class="q">Что здесь лишнее?</h2><p class="msg" id="msg">' + (view.clue || "") + '</p><div class="choices">' + cards + "</div>");
  }
  function renderSeq() {
    var p = SEQ[view.level];
    var chips = p.show.map(function (x) { return '<span class="chip">' + x + "</span>"; }).join("") + '<span class="chip">?</span>';
    var answers = p.choices.map(function (x, i) {
      return '<button type="button" data-act="pick" data-n="' + i + '">' + x + "</button>";
    }).join("");
    el(head((view.level + 1) + " из 10") + hintBtn() +
      '<h2 class="q">Что дальше?</h2><div class="rowshow">' + chips + '</div><p class="msg" id="msg">' + (view.clue || "") +
      '</p><div class="answers">' + answers + "</div>");
  }
  function cellsOf(str) { return str.split("").map(function (ch) { return +ch; }); }
  function renderSudo() {
    if (!view.grid) {
      view.grid = cellsOf(SUDO[view.level].giv);
      view.given = view.grid.map(function (n) { return n !== 0; });
      view.sel = 0;
      while (view.given[view.sel]) view.sel = (view.sel + 1) % 16;
    }
    var cells = view.grid.map(function (n, i) {
      var cls = "cell" + (view.given[i] ? " given" : "") + (view.sel === i ? " on" : "") + (view.bad && view.bad[i] ? " bad" : "");
      return '<button class="' + cls + '" type="button" data-act="cell" data-n="' + i + '"' + (view.given[i] ? " disabled" : "") + ">" + (n || "") + "</button>";
    }).join("");
    var pad = [1, 2, 3, 4].map(function (n) {
      return '<button type="button" data-act="num" data-n="' + n + '">' + n + "</button>";
    }).join("");
    el(head((view.level + 1) + " из 10") + hintBtn() +
      '<h2 class="q">Цифры 1–4 в каждом ряду</h2><p class="msg" id="msg">' + (view.clue || "В строке, столбце и квадрате 2×2 без повторов.") +
      '</p><div class="grid">' + cells + '</div><div class="pad">' + pad + "</div>");
  }
  function renderWin() {
    var names = { odd: "Что лишнее", seq: "Продолжи ряд", sudo: "Судоку 4×4" };
    var coins = view.id === "sudo" ? 15 : 10;
    el(head("Верно") +
      '<div class="card"><h2>' + names[view.id] + ", ступень " + (view.level + 1) + '</h2><p class="why">' + view.why + "</p>" +
      "<p>В настоящей игре за первую такую задачу сегодня огород получил бы +" + coins + " монет и немного опыта. Здесь монеты не начисляются.</p>" +
      '<button class="next" type="button" data-act="share">Поделиться</button>' +
      '<button class="next" type="button" data-act="next">Дальше</button></div>');
  }

  function onAct(act, node) {
    if (act === "sound") { soundOn = !soundOn; render(); return; }
    if (act === "back") {
      if (view.name === "levels" || view.name === "win") view = { name: "hub" };
      else if (view.name === "hub") return;
      else view = { name: "levels", id: view.id };
      render(); return;
    }
    if (act === "open") { view = { name: "levels", id: node.getAttribute("data-id") }; render(); return; }
    if (act === "level") { openLevel(view.id, +node.getAttribute("data-n")); return; }
    if (act === "hint") { giveHint(); return; }
    if (act === "pick") { pick(+node.getAttribute("data-n"), node); return; }
    if (act === "cell") { view.sel = +node.getAttribute("data-n"); view.bad = null; render(); return; }
    if (act === "num") { putNum(+node.getAttribute("data-n")); return; }
    if (act === "next") {
      if (view.level < 9) openLevel(view.id, view.level + 1);
      else view = { name: "levels", id: view.id };
      render(); return;
    }
    if (act === "share") share();
  }
  function openLevel(id, n) {
    view = { name: id, id: id, level: n, clue: "" };
    render();
  }
  function giveHint() {
    if (view.name === "odd") { view.clue = ODD[view.level].hint; tone(true); render(); return; }
    if (view.name === "seq") { view.clue = SEQ[view.level].hint; tone(true); render(); return; }
    if (view.name === "sudo") {
      var sol = cellsOf(SUDO[view.level].sol);
      for (var i = 0; i < 16; i++) if (!view.given[i] && view.grid[i] !== sol[i]) {
        view.grid[i] = sol[i];
        view.clue = "Одна цифра уже на месте. Это бесплатно.";
        tone(true); render(); return;
      }
      view.clue = "Пустых ошибок не осталось. Проверьте поле.";
      render();
    }
  }
  function pick(n, node) {
    var puzzle = view.name === "odd" ? ODD[view.level] : SEQ[view.level];
    if (n === puzzle.answer) {
      tone(true);
      markDone(view.id, view.level);
      view.name = "win";
      view.why = puzzle.why;
      render();
    } else {
      tone(false);
      node.classList.add("bad");
      var msg = document.getElementById("msg");
      if (msg) { msg.textContent = "Не то. Попробуйте ещё — очки не снимаются."; msg.className = "msg"; }
    }
  }
  function putNum(n) {
    if (view.given[view.sel]) return;
    view.grid[view.sel] = n;
    view.bad = null;
    if (view.grid.every(function (x) { return x; })) {
      var sol = cellsOf(SUDO[view.level].sol);
      var bad = {};
      var wrong = false;
      for (var i = 0; i < 16; i++) if (view.grid[i] !== sol[i]) { bad[i] = true; wrong = true; }
      if (!wrong) {
        tone(true);
        markDone("sudo", view.level);
        view.name = "win";
        view.why = "В каждой строке, столбце и квадрате 2×2 цифры 1, 2, 3 и 4 стоят по одному разу.";
        render();
        return;
      }
      view.bad = bad;
      view.clue = "Почти. Красные клетки можно поправить. Подсказка ничего не отнимает.";
      tone(false);
    }
    render();
  }
  function share() {
    var text = "Решила спокойную задачку в «Лаборатории здоровья». Попробуйте и вы.";
    var url = "https://igra.orkestr.online/";
    var full = text + "\n" + url;
    function copied() { toast("Скопировано"); }
    if (navigator.share) {
      navigator.share({ title: "Лаборатория здоровья", text: text, url: url }).then(function () { toast("Готово. Можно отправить друзьям."); }, function (err) {
        if (err && err.name === "AbortError") toast("Окно закрыто. Поделиться можно позже.");
        else copy(full, copied);
      });
    } else copy(full, copied);
  }
  function copy(text, ok) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, function () { ok(); });
    } else ok();
  }
  render();
})();
