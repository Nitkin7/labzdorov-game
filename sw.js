/* Лаборатория здоровья — сервис-воркер: работа без интернета */
var CACHE = "lz-game-v25";
var V = "?v=25";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/fonts.css" + V,
  "./css/images.css" + V,
  "./css/style.css" + V,
  "./css/farm.css" + V,
  "./css/yard.css" + V,
  "./css/brain.css" + V,
  "./icons/icon.svg",
  "./icons/icon-maskable.svg",
  "./js/app.js" + V,
  "./js/splash.js" + V,
  "./js/brain.js" + V,
  "./js/schulte.js" + V,
  "./js/words-data.js" + V,
  "./js/wordgame.js" + V,
  "./js/mahjong.js" + V,
  "./js/data.js" + V,
  "./js/farm-data.js" + V,
  "./js/farm-data2.js" + V,
  "./js/farm.js" + V,
  "./js/yard-data.js" + V,
  "./js/yard.js" + V,
  "./js/platform.js" + V,
  "./js/vk-init.js" + V,
  "./js/vendor/vk-bridge.min.js" + V,
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
  var url = new URL(req.url);
  // Яндекс.Метрика (mc.yandex.ru и остальные хосты Яндекса) не перехватывается и не кэшируется.
  // Запрос уходит в сеть как есть. Если Метрика недоступна, страница и офлайн-режим не ломаются.
  if (url.hostname.indexOf("yandex") !== -1) return;
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  // Страница: сначала сеть (свежая версия), при офлайне — кэш
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put("./index.html", copy); });
      return res;
    }).catch(function () { return caches.match("./index.html"); }));
    return;
  }
  // Статика: сначала кэш. Адрес сравниваем целиком, вместе с ?v=,
  // чтобы новая версия стилей не подменялась старым файлом.
  e.respondWith(caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    });
  }));
});
