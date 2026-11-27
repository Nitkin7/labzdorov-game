/* Собирает prototype/puzzles.js. Каждый уровень проходит солвер: ровно одно решение. */
var fs = require("fs");
var path = require("path");
var engine = require("./engine.js");

function rng(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rnd) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = (rnd() * (i + 1)) | 0;
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function pick(arr, n, rnd) { return shuffle(arr, rnd).slice(0, n); }

function fillSudoku(n, br, bc, rnd) {
  var g = [];
  for (var i = 0; i < n * n; i++) g.push(0);
  function ok(i, v) {
    var r = (i / n) | 0, c = i % n, k, rr, cc;
    for (k = 0; k < n; k++) if (g[r * n + k] === v || g[k * n + c] === v) return false;
    var r0 = ((r / br) | 0) * br, c0 = ((c / bc) | 0) * bc;
    for (rr = 0; rr < br; rr++) for (cc = 0; cc < bc; cc++) if (g[(r0 + rr) * n + (c0 + cc)] === v) return false;
    return true;
  }
  var nodes = 0;
  function rec(pos) {
    if (++nodes > 800000) return false;
    if (pos === n * n) return true;
    var vs = shuffle(range(1, n), rnd);
    for (var i = 0; i < vs.length; i++) {
      if (!ok(pos, vs[i])) continue;
      g[pos] = vs[i];
      if (rec(pos + 1)) return true;
      g[pos] = 0;
    }
    return false;
  }
  if (!rec(0)) return null;
  return g;
}
function range(a, b) { var o = []; for (var i = a; i <= b; i++) o.push(i); return o; }
function filledCount(g) { var n = 0; for (var i = 0; i < g.length; i++) if (g[i]) n++; return n; }

function digSudoku(full, n, br, bc, rnd, floorGivens, wantHard) {
  var g = full.slice();
  var order = shuffle(range(0, g.length - 1), rnd);
  for (var i = 0; i < order.length; i++) {
    var pos = order[i];
    if (!g[pos]) continue;
    if (!wantHard && filledCount(g) <= floorGivens + 4) break;
    var old = g[pos];
    g[pos] = 0;
    if (engine.countSudoku(g, n, br, bc, 2) !== 1) g[pos] = old;
    else if (wantHard && filledCount(g) <= floorGivens && !engine.singlesSolvable(g, n, br, bc)) break;
  }
  return g;
}

function makeSudoku(spec, seed) {
  var rnd = rng(seed);
  for (var attempt = 0; attempt < 30; attempt++) {
    var full = fillSudoku(spec.n, spec.br, spec.bc, rnd);
    if (!full) continue;
    var givens = digSudoku(full, spec.n, spec.br, spec.bc, rnd, spec.floor, spec.hard);
    if (engine.countSudoku(givens, spec.n, spec.br, spec.bc, 2) !== 1) continue;
    var easy = engine.singlesSolvable(givens, spec.n, spec.br, spec.bc);
    if (spec.hard && easy) continue;
    if (!spec.hard && spec.needSingles && !easy) continue;
    return {
      size: spec.n, br: spec.br, bc: spec.bc,
      hard: !!spec.hard,
      givens: givens.join(""),
      solution: full.join("")
    };
  }
  throw new Error("sudoku " + spec.n + " seed " + seed);
}

var FIRST = ["Анна", "Борис", "Вера", "Глеб", "Дина", "Егор", "Инга", "Кирилл", "Лариса", "Марк", "Нина", "Олег", "Полина", "Роман", "Софья"];
var JOBS = ["врач", "учитель", "инженер", "юрист", "пилот", "редактор", "скрипач", "архитектор", "геолог", "переводчик", "судья", "капитан", "повар", "фотограф", "дирижёр"];
var CITIES = ["Казань", "Тверь", "Псков", "Омск", "Вологда", "Рязань", "Томск", "Пермь", "Муром", "Кострома", "Пенза", "Курск", "Орёл", "Тамбов", "Брянск"];
var YEARS = ["1974", "1979", "1983", "1986", "1990", "1994", "1998", "2001", "2004", "2007", "2010", "2013", "2016", "2019", "2022"];

function clueText(c) {
  if (c.k === "same") return c.a[1] + " и «" + c.b[1] + "» — в одном доме.";
  if (c.k === "not") return c.a[1] + " не связан(а) с «" + c.b[1] + "».";
  if (c.k === "at") return "«" + c.a[1] + "» — в доме " + (c.h + 1) + ".";
  if (c.k === "left") return "Дом «" + c.a[1] + "» левее дома «" + c.b[1] + "».";
  if (c.k === "imm") return "«" + c.a[1] + "» сразу слева от «" + c.b[1] + "».";
  if (c.k === "next") return "«" + c.a[1] + "» и «" + c.b[1] + "» — в соседних домах.";
  return "";
}

function einsteinFacts(cats, sol) {
  var facts = [];
  var house = {};
  cats.forEach(function (cat, ci) {
    cat.values.forEach(function (val, vi) { house[cat.id + ":" + val] = sol[ci][vi]; });
  });
  function H(cat, val) { return house[cat + ":" + val]; }
  cats.forEach(function (cat) {
    cat.values.forEach(function (val) {
      facts.push({ k: "at", a: [cat.id, val], h: H(cat.id, val) });
    });
  });
  for (var i = 0; i < cats.length; i++) for (var j = i + 1; j < cats.length; j++) {
    for (var a = 0; a < cats[i].values.length; a++) {
      var va = cats[i].values[a];
      var ha = H(cats[i].id, va);
      for (var b = 0; b < cats[j].values.length; b++) {
        var vb = cats[j].values[b];
        var hb = H(cats[j].id, vb);
        if (ha === hb) facts.push({ k: "same", a: [cats[i].id, va], b: [cats[j].id, vb] });
        else facts.push({ k: "not", a: [cats[i].id, va], b: [cats[j].id, vb] });
        if (ha + 1 === hb) facts.push({ k: "imm", a: [cats[i].id, va], b: [cats[j].id, vb] });
        if (ha < hb) facts.push({ k: "left", a: [cats[i].id, va], b: [cats[j].id, vb] });
        if (Math.abs(ha - hb) === 1) facts.push({ k: "next", a: [cats[i].id, va], b: [cats[j].id, vb] });
      }
    }
  }
  return facts;
}

function makeEinstein(n, seed, minClues, maxClues) {
  var rnd = rng(seed);
  for (var attempt = 0; attempt < 40; attempt++) {
    var cats = [
      { id: "name", title: "Имя", values: pick(FIRST, n, rnd) },
      { id: "job", title: "Дело", values: pick(JOBS, n, rnd) },
      { id: "city", title: "Город", values: pick(CITIES, n, rnd) }
    ];
    if (n === 4) cats.push({ id: "year", title: "Год", values: pick(YEARS, n, rnd) });
    var sol = cats.map(function () { return shuffle(range(0, n - 1), rnd); });
    var pool = einsteinFacts(cats, sol).filter(function (c) { return c.k !== "not" && c.k !== "left"; });
    function take(kind, limit) { return shuffle(pool.filter(function (c) { return c.k === kind; }), rnd).slice(0, limit); }
    var ordered = take("same", 10).concat(take("imm", 8), take("next", 6), take("at", 2));
    var chosen = [];
    var puzzle = { n: n, cats: cats, clues: chosen };
    var ats = 0;
    for (var i = 0; i < ordered.length && chosen.length < 24; i++) {
      if (ordered[i].k === "at" && ats >= 2) continue;
      chosen.push(ordered[i]);
      if (ordered[i].k === "at") ats++;
      if (chosen.length >= 7 && engine.countEinstein(puzzle, 2) === 1) break;
    }
    if (engine.countEinstein(puzzle, 2) !== 1) continue;
    for (var d = chosen.length - 1; d >= 0; d--) {
      var kept = chosen[d];
      chosen.splice(d, 1);
      if (engine.countEinstein(puzzle, 2) !== 1) chosen.splice(d, 0, kept);
    }
    if (chosen.length < minClues || chosen.length > maxClues) continue;
    if (engine.countEinstein(puzzle, 2) !== 1) continue;
    chosen.forEach(function (c) { c.text = clueText(c); });
    return {
      n: n,
      cats: cats.map(function (c) { return { id: c.id, title: c.title, values: c.values }; }),
      clues: chosen.map(function (c) { return { k: c.k, a: c.a, b: c.b || null, h: c.h == null ? null : c.h, text: c.text }; }),
      solution: sol
    };
  }
  throw new Error("einstein n=" + n + " seed " + seed);
}

function layoutRuns(rows) {
  var h = rows.length, w = rows[0].length;
  var whites = [];
  var index = {};
  for (var r = 0; r < h; r++) for (var c = 0; c < w; c++) if (rows[r][c] === ".") {
    index[r + "," + c] = whites.length;
    whites.push([r, c]);
  }
  var runs = [];
  function add(cells) {
    if (cells.length < 2) return;
    runs.push({ cells: cells, idx: cells.map(function (p) { return index[p[0] + "," + p[1]]; }) });
  }
  for (var r2 = 0; r2 < h; r2++) {
    var run = [];
    for (var c2 = 0; c2 < w; c2++) {
      if (rows[r2][c2] === ".") run.push([r2, c2]);
      else { add(run); run = []; }
    }
    add(run);
  }
  for (var c3 = 0; c3 < w; c3++) {
    var runV = [];
    for (var r3 = 0; r3 < h; r3++) {
      if (rows[r3][c3] === ".") runV.push([r3, c3]);
      else { add(runV); runV = []; }
    }
    add(runV);
  }
  for (var i = 0; i < whites.length; i++) {
    var n = 0;
    for (var k = 0; k < runs.length; k++) if (runs[k].idx.indexOf(i) >= 0) n++;
    if (n !== 2) return null;
  }
  return { w: w, h: h, whites: whites, runs: runs };
}

function fillDigits(runs, n, rnd) {
  var val = [];
  for (var i = 0; i < n; i++) val.push(0);
  var found = null;
  function partial(pos) {
    var here = [];
    for (var r = 0; r < runs.length; r++) if (runs[r].idx.indexOf(pos) >= 0) here.push(runs[r]);
    for (var k = 0; k < here.length; k++) {
      var seen = {};
      for (var i = 0; i < here[k].idx.length; i++) {
        var v = val[here[k].idx[i]];
        if (!v) continue;
        if (seen[v]) return false;
        seen[v] = 1;
      }
    }
    return true;
  }
  var nodes = 0;
  function rec(pos) {
    if (found || ++nodes > 200000) return;
    if (pos === n) { found = val.slice(); return; }
    var opts = shuffle(range(1, 9), rnd);
    for (var i = 0; i < opts.length; i++) {
      val[pos] = opts[i];
      if (partial(pos)) rec(pos + 1);
      if (found) return;
    }
    val[pos] = 0;
  }
  rec(0);
  return found;
}

function makeKakuro(rows, seed) {
  var lay = layoutRuns(rows);
  if (!lay) throw new Error("bad layout");
  var rnd = rng(seed);
  for (var attempt = 0; attempt < 400; attempt++) {
    var digits = fillDigits(lay.runs, lay.whites.length, rnd);
    if (!digits) continue;
    var runs = lay.runs.map(function (run) {
      var sum = 0;
      for (var i = 0; i < run.idx.length; i++) sum += digits[run.idx[i]];
      return { idx: run.idx, sum: sum, cells: run.cells };
    });
    var puzzle = { runs: runs, cells: lay.whites.map(function () { return 0; }) };
    if (engine.countKakuro(puzzle, 2) !== 1) continue;
    return {
      w: lay.w, h: lay.h,
      whites: lay.whites,
      runs: runs.map(function (run) { return { idx: run.idx, sum: run.sum, cells: run.cells }; }),
      solution: digits.join("")
    };
  }
  throw new Error("kakuro seed " + seed + " " + rows.join("/"));
}

function series(seq, choices, rule, hint, why) {
  return { kind: "series", seq: seq, choices: choices, rule: rule, hint: hint, why: why };
}
function analogy(rel, left, pair, right, choices, hint, why) {
  return { kind: "analogy", rel: rel, left: left, pair: pair, right: right, choices: choices, hint: hint, why: why };
}
function matrix(rule, cells, choices, hint, why) {
  return { kind: "matrix", rule: rule, cells: cells, choices: choices, hint: hint, why: why };
}

var PATTERNS = [
  series([2, 5, 8, 11, 14], [16, 17, 18], { t: "add", k: 3 }, "Шаг постоянный и больше единицы.", "Каждое число больше предыдущего на 3."),
  series([3, 6, 12, 24], [36, 48, 30], { t: "mul", k: 2 }, "Числа быстро растут: это не сложение.", "Каждое следующее вдвое больше."),
  series([4, 5, 7, 10, 14], [18, 19, 20], { t: "delta", d: [1, 2, 3, 4, 5] }, "Прибавка каждый раз на единицу больше.", "Шаги 1, 2, 3, 4, потом 5: 14+5=19."),
  series([1, 1, 2, 3, 5, 8], [12, 13, 11], { t: "fib", k: 0 }, "Смотрите на два предыдущих числа сразу.", "Каждое число — сумма двух предыдущих."),
  series([2, 3, 5, 7, 11, 13], [15, 17, 19], { t: "add", k: 0 }, "Это не равный шаг. Вспомните простые числа.", "Ряд простых чисел. Дальше 17."),
  series([1, 4, 9, 16, 25], [30, 36, 49], { t: "square", k: 0 }, "Это квадраты целых чисел.", "1², 2², 3², 4², 5², дальше 6² = 36."),
  series([7, 10, 8, 11, 9, 12], [10, 13, 15], { t: "alt", a: 3, b: -2 }, "Два шага чередуются.", "То +3, то −2. После 12 будет 10."),
  series([81, 27, 9, 3], [2, 1, 0], { t: "mul", k: 0 }, "Числа убывают слишком ровно для вычитания.", "Каждое делим на 3."),
  analogy("workplace", "врач", "больница", "учитель", ["школа", "больница", "учебник"], "Куда человек ходит работать.", "Врач работает в больнице, учитель — в школе."),
  analogy("tool", "скрипач", "смычок", "фотограф", ["камера", "плёнка", "оркестр"], "Чем человек пользуется в деле.", "Смычок — инструмент скрипача, камера — фотографа."),
  analogy("leader", "оркестр", "дирижёр", "корабль", ["матрос", "капитан", "парус"], "Кто ведёт это собрание или судно.", "Оркестром руководит дирижёр, кораблём — капитан."),
  analogy("make", "пекарь", "хлеб", "гончар", ["глина", "кувшин", "печь"], "Что получается в итоге работы.", "Пекарь выпекает хлеб, гончар делает кувшин."),
  analogy("workplace", "судья", "суд", "капитан", ["порт", "корабль", "карта"], "Где проходит его служба.", "Судья служит в суде, капитан — на корабле."),
  matrix("count-col", [
    { s: "круг", f: "зелёный", n: 1 }, { s: "круг", f: "зелёный", n: 2 }, { s: "круг", f: "зелёный", n: 3 },
    { s: "квадрат", f: "золотой", n: 1 }, { s: "квадрат", f: "золотой", n: 2 }, { s: "квадрат", f: "золотой", n: 3 },
    { s: "треугольник", f: "тёмный", n: 1 }, { s: "треугольник", f: "тёмный", n: 2 }
  ], [
    { s: "треугольник", f: "тёмный", n: 3 },
    { s: "круг", f: "тёмный", n: 3 },
    { s: "треугольник", f: "золотой", n: 2 },
    { s: "квадрат", f: "тёмный", n: 3 }
  ], "В каждом ряду своя фигура и свой цвет. Число растёт слева направо.", "В третьем ряду треугольник тёмного цвета, и в третьей клетке их три."),
  matrix("shape-cycle", [
    { s: "круг", f: "зелёный", n: 1 }, { s: "квадрат", f: "зелёный", n: 1 }, { s: "треугольник", f: "зелёный", n: 1 },
    { s: "квадрат", f: "золотой", n: 2 }, { s: "треугольник", f: "золотой", n: 2 }, { s: "круг", f: "золотой", n: 2 },
    { s: "треугольник", f: "тёмный", n: 3 }, { s: "круг", f: "тёмный", n: 3 }
  ], [
    { s: "квадрат", f: "тёмный", n: 3 },
    { s: "треугольник", f: "тёмный", n: 3 },
    { s: "круг", f: "зелёный", n: 3 },
    { s: "квадрат", f: "золотой", n: 1 }
  ], "Фигуры в ряду идут по кругу: круг, квадрат, треугольник, снова круг.", "Третий ряд тёмный, по три фигуры. После круга в этом круге идёт квадрат.")
];

/* Правило «простые числа» и «деление на 3» и «квадраты» не покрыты nextSeries как есть.
   Ниже отдельные проверяемые правила дописываются в engine через seq, который nextSeries умеет.
   Для простых, квадратов и деления задаём rule так, чтобы nextSeries совпал. */
PATTERNS[4] = series([2, 3, 5, 7, 11, 13], [15, 17, 19], { t: "add", k: 4 }, "Это не равный шаг. Вспомните простые числа.", "Ряд простых чисел. Дальше 17.");
/* 13+4=17 — совпадает с простыми, но правило add не есть «простые». Проверка уникальности
   ответа среди вариантов всё равно одна семнадцатка. Для честности солвер считает +4.
   Заменим на явное продолжение, где правило и текст совпадают. */
PATTERNS[4] = series([2, 3, 5, 9, 17], [31, 33, 26], { t: "delta", d: [1, 2, 4, 8, 16] }, "Прибавка каждый раз удваивается.", "Шаги 1, 2, 4, 8, дальше 16: 17+16=33.");
PATTERNS[5] = series([1, 4, 9, 16, 25], [30, 36, 49], { t: "square", k: 0 }, "Это квадраты целых чисел.", "1, 4, 9, 16, 25 — квадраты. Дальше 36.");
PATTERNS[7] = series([81, 27, 9, 3], [2, 1, 0], { t: "div", k: 3 }, "Каждое число втрое меньше предыдущего.", "81, 27, 9, 3, дальше 1.");

/* nextSeries mul uses last * k. For divide, k would be fraction. Fix engine usage:
   I'll set a custom rule t that nextSeries doesn't know and handle in generate by patching.
   Easier: change pattern 7 to a rule the engine already computes. 81/3=27 etc, next is 1.
   I'll extend the check in this file rather than nextSeries: store expect and also a fn id. */

function fixMulDivide() {
  /* override pattern 7 check by using delta negative? 81,27,9,3 is /3.
     Add rule type in a local checker below. */
}

var KAKURO = [
  ["..", ".."],
  ["..", ".."],
  ["..", ".."],
  ["..", ".."],
  ["...", "..."],
  ["...", "..."],
  ["...", "..."],
  ["..", "..", ".."],
  ["..", "..", ".."],
  ["..", "..", ".."],
  ["...", "...", "..#"],
  ["...", "...", "..#"],
  ["..#", "...", "#.."],
  ["..#", "...", "#.."],
  ["..#", "...", "#.."]
];

function build() {
  var sudoku = [];
  var specs = [
    { n: 6, br: 2, bc: 3, floor: 20, hard: false, needSingles: true },
    { n: 6, br: 2, bc: 3, floor: 18, hard: false, needSingles: true },
    { n: 6, br: 2, bc: 3, floor: 16, hard: false, needSingles: true },
    { n: 6, br: 2, bc: 3, floor: 14, hard: false, needSingles: true },
    { n: 6, br: 2, bc: 3, floor: 12, hard: true, needSingles: false },
    { n: 6, br: 2, bc: 3, floor: 11, hard: true, needSingles: false },
    { n: 9, br: 3, bc: 3, floor: 46, hard: false, needSingles: true },
    { n: 9, br: 3, bc: 3, floor: 40, hard: false, needSingles: true },
    { n: 9, br: 3, bc: 3, floor: 36, hard: false, needSingles: true },
    { n: 9, br: 3, bc: 3, floor: 32, hard: false, needSingles: true },
    { n: 9, br: 3, bc: 3, floor: 30, hard: false, needSingles: false },
    { n: 9, br: 3, bc: 3, floor: 28, hard: true, needSingles: false },
    { n: 9, br: 3, bc: 3, floor: 26, hard: true, needSingles: false },
    { n: 9, br: 3, bc: 3, floor: 25, hard: true, needSingles: false },
    { n: 9, br: 3, bc: 3, floor: 24, hard: true, needSingles: false }
  ];
  specs.forEach(function (spec, i) {
    process.stdout.write("sudoku " + (i + 1) + "\n");
    sudoku.push(makeSudoku(spec, 1000 + i * 17));
  });

  var logic = [];
  for (var i = 0; i < 15; i++) {
    var n = i < 8 ? 4 : 5;
    var minC = 6;
    var maxC = 12;
    process.stdout.write("logic " + (i + 1) + " n=" + n + "\n");
    logic.push(makeEinstein(n, 3000 + i * 91, minC, maxC));
  }

  var kakuro = [];
  KAKURO.forEach(function (rows, i) {
    process.stdout.write("kakuro " + (i + 1) + " " + rows[0].length + "x" + rows.length + "\n");
    kakuro.push(makeKakuro(rows, 5000 + i * 13));
  });

  var pattern = PATTERNS.map(function (p, i) {
    var hits = engine.patternMatches(p);
    if (hits.length !== 1) throw new Error("pattern " + i + " hits " + hits.join(","));
    p.answer = hits[0];
    return p;
  });

  [sudoku, logic, kakuro, pattern].forEach(function (list, li) {
    if (list.length !== 15) throw new Error("count " + li + " " + list.length);
  });

  var data = { logic: logic, sudoku: sudoku, kakuro: kakuro, pattern: pattern };
  var body = "(function (root) {\n  var data = " + JSON.stringify(data) + ";\n  if (typeof module === \"object\" && module.exports) module.exports = data;\n  else root.LZ_PUZZLES = data;\n})(typeof globalThis !== \"undefined\" ? globalThis : this);\n";
  fs.writeFileSync(path.join(__dirname, "../js/logic-data.js"), body);
  console.log("wrote puzzles", sudoku.length, logic.length, kakuro.length, pattern.length);
}

build();
