/* Чистые проверки задач. Работает и в браузере, и в node. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LZEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function countSudoku(givens, n, br, bc, limit) {
    var g = givens.slice();
    var count = 0;
    function ok(i, v) {
      var r = (i / n) | 0, c = i % n, k, rr, cc, r0, c0;
      for (k = 0; k < n; k++) if (g[r * n + k] === v || g[k * n + c] === v) return false;
      r0 = ((r / br) | 0) * br;
      c0 = ((c / bc) | 0) * bc;
      for (rr = 0; rr < br; rr++) for (cc = 0; cc < bc; cc++) if (g[(r0 + rr) * n + c0 + cc] === v) return false;
      return true;
    }
    function rec(pos) {
      if (count >= limit) return;
      while (pos < g.length && g[pos]) pos++;
      if (pos >= g.length) { count++; return; }
      for (var v = 1; v <= n; v++) {
        if (!ok(pos, v)) continue;
        g[pos] = v;
        rec(pos + 1);
        g[pos] = 0;
        if (count >= limit) return;
      }
    }
    rec(0);
    return count;
  }

  function singlesSolvable(givens, n, br, bc) {
    var g = givens.slice();
    function cands(i) {
      var r = (i / n) | 0, c = i % n, list = [], v, k, rr, cc, r0, c0, bad;
      for (v = 1; v <= n; v++) {
        bad = false;
        for (k = 0; k < n && !bad; k++) if (g[r * n + k] === v || g[k * n + c] === v) bad = true;
        r0 = ((r / br) | 0) * br;
        c0 = ((c / bc) | 0) * bc;
        for (rr = 0; rr < br && !bad; rr++) for (cc = 0; cc < bc; cc++) if (g[(r0 + rr) * n + c0 + cc] === v) bad = true;
        if (!bad) list.push(v);
      }
      return list;
    }
    var guard = 0;
    while (guard++ < n * n * 4) {
      var moved = false, empty = 0, i, cs;
      for (i = 0; i < g.length; i++) {
        if (g[i]) continue;
        empty++;
        cs = cands(i);
        if (cs.length === 1) { g[i] = cs[0]; moved = true; }
      }
      if (!empty) return true;
      if (!moved) return false;
    }
    return false;
  }

  function houseOf(assign, cats, cat, val) {
    var ci = -1, vi, i;
    for (i = 0; i < cats.length; i++) if (cats[i].id === cat) ci = i;
    if (ci < 0) return -2;
    vi = cats[ci].values.indexOf(val);
    if (vi < 0) return -2;
    return assign[ci][vi];
  }

  function clueOk(assign, cats, clue, partial) {
    var ha = houseOf(assign, cats, clue.a[0], clue.a[1]);
    var hb = clue.b ? houseOf(assign, cats, clue.b[0], clue.b[1]) : -1;
    function open(h) { return typeof h !== "number" || h < 0; }
    if (ha === -2 || hb === -2) return false;
    if (partial && (open(ha) || (clue.b && open(hb)))) return true;
    if (open(ha) || (clue.b && open(hb))) return true;
    if (clue.k === "same") return ha === hb;
    if (clue.k === "not") return ha !== hb;
    if (clue.k === "at") return ha === clue.h;
    if (clue.k === "left") return ha < hb;
    if (clue.k === "imm") return ha + 1 === hb;
    if (clue.k === "next") return Math.abs(ha - hb) === 1;
    return false;
  }

  function countEinstein(puzzle, limit) {
    var n = puzzle.n, cats = puzzle.cats, clues = puzzle.clues;
    var assign = cats.map(function () { return []; });
    var used = cats.map(function () { return []; });
    var count = 0;
    function placeCat(ci) {
      if (count >= limit) return;
      if (ci === cats.length) { count++; return; }
      function rec(vi) {
        if (count >= limit) return;
        if (vi === n) { placeCat(ci + 1); return; }
        for (var h = 0; h < n; h++) {
          if (used[ci][h]) continue;
          assign[ci][vi] = h;
          used[ci][h] = true;
          if (clues.every(function (c) { return clueOk(assign, cats, c, true); })) rec(vi + 1);
          used[ci][h] = false;
          assign[ci][vi] = -1;
        }
      }
      for (var j = 0; j < n; j++) assign[ci][j] = -1;
      rec(0);
    }
    cats.forEach(function (_, ci) { for (var h = 0; h < n; h++) used[ci][h] = false; });
    placeCat(0);
    return count;
  }

  function countKakuro(puzzle, limit) {
    var runs = puzzle.runs, cells = puzzle.cells, n = cells.length;
    var val = cells.map(function () { return 0; });
    var count = 0;
    function runState(run) {
      var sum = 0, seen = {}, filled = 0, i, v;
      for (i = 0; i < run.idx.length; i++) {
        v = val[run.idx[i]];
        if (!v) continue;
        if (seen[v]) return false;
        seen[v] = 1;
        sum += v;
        filled++;
      }
      var left = run.idx.length - filled;
      if (sum > run.sum) return false;
      if (!left && sum !== run.sum) return false;
      var min = 0, max = 0, d, usedN = 0;
      var digits = [];
      for (d = 1; d <= 9; d++) if (!seen[d]) digits.push(d);
      if (left > digits.length) return false;
      for (i = 0; i < left; i++) { min += digits[i]; max += digits[digits.length - 1 - i]; }
      if (sum + min > run.sum || sum + max < run.sum) return false;
      return true;
    }
    function rec(pos) {
      if (count >= limit) return;
      if (pos === n) { count++; return; }
      var runsHere = [];
      for (var r = 0; r < runs.length; r++) if (runs[r].idx.indexOf(pos) >= 0) runsHere.push(runs[r]);
      for (var d = 1; d <= 9; d++) {
        val[pos] = d;
        var ok = true;
        for (var k = 0; k < runsHere.length; k++) if (!runState(runsHere[k])) { ok = false; break; }
        if (ok) rec(pos + 1);
        if (count >= limit) { val[pos] = 0; return; }
      }
      val[pos] = 0;
    }
    rec(0);
    return count;
  }

  function nextSeries(seq, rule) {
    var i, n = seq.length, last = seq[n - 1];
    if (rule.t === "add") return last + rule.k;
    if (rule.t === "mul") return last * rule.k;
    if (rule.t === "delta") {
      var step = rule.d[n - 1];
      return last + step;
    }
    if (rule.t === "alt") return last + (((n - 1) % 2 === 0) ? rule.a : rule.b);
    if (rule.t === "fib") return seq[n - 1] + seq[n - 2];
    if (rule.t === "square") return (n + 1) * (n + 1);
    if (rule.t === "div") return last / rule.k;
    if (rule.t === "second") return seq[n - 2] + rule.k;
    return null;
  }

  var ANALOGY = {
    workplace: { "врач": "больница", "учитель": "школа", "пилот": "аэродром", "судья": "суд", "библиотекарь": "библиотека", "капитан": "корабль" },
    tool: { "писатель": "перо", "маляр": "кисть", "плотник": "рубанок", "скрипач": "смычок", "фотограф": "камера", "кузнец": "молот" },
    leader: { "оркестр": "дирижёр", "суд": "судья", "корабль": "капитан", "кафедра": "профессор", "редакция": "редактор", "экспедиция": "геолог" },
    make: { "пекарь": "хлеб", "гончар": "кувшин", "ткач": "полотно", "стекольщик": "витраж", "переплётчик": "книга", "ювелир": "перстень" }
  };

  function patternMatches(puzzle) {
    var hits = [];
    if (puzzle.kind === "series") {
      var expect = nextSeries(puzzle.seq, puzzle.rule);
      puzzle.choices.forEach(function (c, i) { if (c === expect) hits.push(i); });
    } else if (puzzle.kind === "analogy") {
      var table = ANALOGY[puzzle.rel];
      var expectA = table[puzzle.right];
      puzzle.choices.forEach(function (c, i) { if (c === expectA) hits.push(i); });
      if (table[puzzle.left] !== puzzle.pair) hits = [];
    } else if (puzzle.kind === "matrix") {
      var expectM = matrixExpect(puzzle);
      puzzle.choices.forEach(function (c, i) {
        if (c.s === expectM.s && c.f === expectM.f && c.n === expectM.n) hits.push(i);
      });
    }
    return hits;
  }

  function matrixExpect(puzzle) {
    var c = puzzle.cells;
    var order = ["круг", "квадрат", "треугольник"];
    if (puzzle.rule === "count-col") return { s: c[6].s, f: c[6].f, n: 3 };
    if (puzzle.rule === "shape-cycle") {
      var i = order.indexOf(c[7].s);
      return { s: order[(i + 1) % 3], f: c[6].f, n: c[6].n };
    }
    return null;
  }

  return {
    countSudoku: countSudoku,
    singlesSolvable: singlesSolvable,
    countEinstein: countEinstein,
    countKakuro: countKakuro,
    patternMatches: patternMatches,
    nextSeries: nextSeries
  };
});
