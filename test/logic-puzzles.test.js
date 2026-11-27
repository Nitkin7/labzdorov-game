/* Каждый уровень прототипа: ровно одно решение, не сверка с сохранённым ответом вслепую. */
var assert = require("assert");
var engine = require("../prototype/engine.js");
var data = require("../js/logic-data.js");

assert.strictEqual(data.sudoku.length, 15);
assert.strictEqual(data.logic.length, 15);
assert.strictEqual(data.kakuro.length, 15);
assert.strictEqual(data.pattern.length, 15);

data.sudoku.forEach(function (p, i) {
  var n = p.size;
  var givens = p.givens.split("").map(Number);
  var solution = p.solution.split("").map(Number);
  assert.strictEqual(engine.countSudoku(givens, n, p.br, p.bc, 2), 1, "sudoku unique " + i);
  assert.strictEqual(engine.countSudoku(solution, n, p.br, p.bc, 2), 1, "sudoku full " + i);
  for (var k = 0; k < givens.length; k++) if (givens[k]) assert.strictEqual(givens[k], solution[k], "sudoku given " + i);
});

data.logic.forEach(function (p, i) {
  assert.ok(p.clues.length >= 6 && p.clues.length <= 12, "clues " + i + " " + p.clues.length);
  assert.strictEqual(engine.countEinstein(p, 2), 1, "logic unique " + i);
  p.cats.forEach(function (cat, ci) {
    var houses = {};
    cat.values.forEach(function (_, vi) {
      var h = p.solution[ci][vi];
      assert.ok(h >= 0 && h < p.n);
      assert.ok(!houses[h], "dup house " + i);
      houses[h] = 1;
    });
  });
});

data.kakuro.forEach(function (p, i) {
  var runs = p.runs.map(function (run) { return { idx: run.idx, sum: run.sum }; });
  assert.strictEqual(engine.countKakuro({ runs: runs, cells: p.solution.split("").map(function () { return 0; }) }, 2), 1, "kakuro unique " + i);
  p.runs.forEach(function (run) {
    var sum = 0, seen = {};
    run.idx.forEach(function (ix) {
      var v = Number(p.solution[ix]);
      assert.ok(v >= 1 && v <= 9);
      assert.ok(!seen[v], "kakuro repeat " + i);
      seen[v] = 1;
      sum += v;
    });
    assert.strictEqual(sum, run.sum, "kakuro sum " + i);
  });
});

data.pattern.forEach(function (p, i) {
  var hits = engine.patternMatches(p);
  assert.deepStrictEqual(hits, [p.answer], "pattern " + i + " " + p.kind);
});

var tutor = data.tutorial;
assert.ok(tutor, "tutorial puzzle");
assert.strictEqual(tutor.n, 3, "tutorial houses");
assert.ok(tutor.clues.length >= 3 && tutor.clues.length <= 4, "tutorial clues");
assert.strictEqual(engine.countEinstein(tutor, 2), 1, "tutorial unique");
tutor.cats.forEach(function (cat, ci) {
  var houses = {};
  cat.values.forEach(function (_, vi) {
    var h = tutor.solution[ci][vi];
    assert.ok(h >= 0 && h < tutor.n, "tutorial house");
    assert.ok(!houses[h], "tutorial dup");
    houses[h] = 1;
  });
});
assert.ok(tutor.steps && tutor.steps.length >= 4, "tutorial steps");
tutor.steps.forEach(function (step, i) {
  var house = tutor.solution[step.ci][step.vi];
  if (step.kind === "yes") assert.strictEqual(house, step.h, "tutorial yes " + i);
  if (step.kind === "no") assert.notStrictEqual(house, step.h, "tutorial no " + i);
});

var mark = tutor.cats.map(function (cat) { return cat.values.map(function () { return -1; }); });
var absent = tutor.cats.map(function (cat) { return cat.values.map(function () { return {}; }); });
function tapTutorCell(step) {
  var ci = step.ci, vi = step.vi, h = step.h;
  if (mark[ci][vi] === h) { mark[ci][vi] = -1; absent[ci][vi][h] = true; }
  else if (absent[ci][vi][h]) absent[ci][vi][h] = false;
  else {
    mark[ci][vi] = h;
    for (var v = 0; v < mark[ci].length; v++) if (v !== vi && mark[ci][v] === h) mark[ci][v] = -1;
  }
}
tutor.steps.forEach(function (step, i) {
  tapTutorCell(step);
  if (step.kind === "no") tapTutorCell(step);
  tutor.steps.slice(0, i).forEach(function (prev) {
    if (prev.kind === "yes") assert.strictEqual(mark[prev.ci][prev.vi], prev.h, "tutorial keeps check " + i);
    if (prev.kind === "no") assert.strictEqual(!!absent[prev.ci][prev.vi][prev.h], true, "tutorial keeps cross " + i);
  });
  if (step.kind === "yes") assert.strictEqual(mark[step.ci][step.vi], step.h, "tutorial placed " + i);
  if (step.kind === "no") assert.strictEqual(!!absent[step.ci][step.vi][step.h], true, "tutorial crossed " + i);
});

console.log("logic-puzzles tests ok");
