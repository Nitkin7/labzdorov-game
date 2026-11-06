/* Лаборатория здоровья — заставка по реальной готовности страницы.
   Не ждёт фиксированные секунды: прячется, как только шрифты, значок и запуск платформы готовы.
   Сбой или зависание не блокируют игру. */
(function () {
  "use strict";
  var root = document.getElementById("splash");
  var app = document.getElementById("app");
  if (!root) {
    if (app) app.removeAttribute("aria-hidden");
    return;
  }
  var fill = document.getElementById("splash-fill");
  var pct = document.getElementById("splash-pct");
  var bar = document.getElementById("splash-bar");
  var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
  function nowMs() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  var value = 0;
  var reduced = false;
  try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  if (reduced) root.classList.remove("is-live");

  function set(n) {
    value = Math.max(value, Math.min(100, n));
    var shown = Math.round(value);
    if (fill) fill.style.width = shown + "%";
    if (pct) pct.textContent = shown + "%";
    if (bar) {
      bar.setAttribute("aria-valuenow", String(shown));
      bar.setAttribute("aria-valuetext", "Готовим лабораторию, " + shown + "%");
    }
  }
  set(8);

  var closed = false;
  function reveal() { if (app) app.removeAttribute("aria-hidden"); }
  function hide() {
    if (window.__LZ_SPLASH_HOLD === true) {
      set(100);
      root.setAttribute("data-ready", "1");
      window.__splashHideMs = Math.round(nowMs() - t0);
      return;
    }
    if (closed) return;
    closed = true;
    set(100);
    window.__splashHideMs = Math.round(nowMs() - t0);
    root.setAttribute("data-ready", "1");
    function gone() {
      root.hidden = true;
      root.setAttribute("aria-hidden", "true");
      reveal();
    }
    if (reduced) { gone(); return; }
    root.classList.add("splash-out");
    var finished = false;
    function done() { if (finished) return; finished = true; gone(); }
    root.addEventListener("transitionend", done);
    setTimeout(done, 420);
  }
  window.addEventListener("error", function () { hide(); });

  function boot() {
    set(document.readyState === "complete" ? 55 : 30);
    var jobs = [];
    if (document.fonts && document.fonts.ready) {
      jobs.push(Promise.race([
        Promise.resolve(document.fonts.ready).catch(function () {}),
        new Promise(function (r) { setTimeout(r, 800); })
      ]));
    }
    jobs.push(new Promise(function (resolve) {
      var img = new Image();
      var done = false;
      function finish() { if (done) return; done = true; resolve(); }
      img.onload = img.onerror = finish;
      img.src = "icons/icon.svg";
      if (img.complete && img.getAttribute("src")) finish();
    }));
    if (window.Platform && Platform.init) {
      jobs.push(Promise.race([
        Promise.resolve().then(function () { return Platform.init(); }).catch(function () {}),
        new Promise(function (r) { setTimeout(r, 600); })
      ]));
    }
    var wall = setTimeout(hide, 2200);
    Promise.all(jobs).then(function () {
      clearTimeout(wall);
      set(92);
      if (document.readyState === "complete") hide();
      else {
        window.addEventListener("load", hide);
        setTimeout(hide, 700);
      }
    }).catch(function () { clearTimeout(wall); hide(); });
  }
  try { boot(); } catch (e) { hide(); }
})();
