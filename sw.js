/* Лаборатория здоровья — сервис-воркер: работа без интернета */
var CACHE = "lz-game-v19";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/fonts.css",
  "./css/images.css",
  "./css/style.css",
  "./css/farm.css",
  "./css/brain.css",
  "./icons/icon.svg",
  "./icons/icon-maskable.svg",
  "./js/app.js",
  "./js/splash.js",
  "./js/brain.js",
  "./js/schulte.js",
  "./js/words-data.js",
  "./js/wordgame.js",
  "./js/data.js",
  "./js/farm-data.js",
  "./js/farm-data2.js",
  "./js/farm.js",
  "./js/install.js",
  "./js/platform.js",
  "./js/vk-init.js",
  "./js/vendor/vk-bridge.min.js",
  "./img/people/nina.svg",
  "./img/people/ivan.svg",
  "./img/people/valentina.svg",
  "./img/people/galya.svg",
  "./img/people/petr.svg",
  "./img/people/olga.svg",
  "./img/people/mikhail.svg",
  "./img/people/anna.svg",
  "./img/plants/mint.svg",
  "./img/plants/chamomile.svg",
  "./img/plants/calendula.svg",
  "./img/plants/apple.svg",
  "./img/plants/hive.svg",
  "./img/plants/porcini.svg",
  "./img/scene/bed.svg",
  "./img/scene/fence.svg",
  "./img/scene/house.svg",
  "./img/scene/barn.svg",
  "./img/scene/shop.svg",
  "./img/scene/rack.svg",
  "./img/scene/table.svg",
  "./img/scene/board.svg",
  "./img/scene/book.svg",
  "./img/scene/kennel.svg",
  "./img/scene/dog.svg",
  "./img/scene/dog-run.svg"
];
// Сезонные фоны усадьбы, деревья и украшения, остальные рисунки растений кэшируются при первом показе (см. «Статика: сначала кэш»).

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  // Страница: сначала сеть (свежая версия), при офлайне — кэш
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put("./index.html", copy); });
      return res;
    }).catch(function () { return caches.match("./index.html"); }));
    return;
  }
  // Статика: сначала кэш
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    });
  }));
});
