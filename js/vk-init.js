/* Лаборатория здоровья — запуск внутри ВК и ОК (единая платформа VK Mini Apps).
   Только VKWebAppInit: никаких проверок подписки, игра открывается сразу для всех.
   Ошибки Bridge (например, вне ВК) игнорируются и не мешают игре. */
(function () {
  "use strict";
  var P = window.Platform;
  if (!P || !P.isEmbedded) return;
  function init() {
    try {
      var b = window.vkBridge;
      if (b && b.send) {
        b.send("VKWebAppInit").catch(function () {});
        // iOS: свайп «назад» идёт по истории игры, а не закрывает приложение
        if (/iphone|ipad|ios/i.test(new URLSearchParams(location.search).get("vk_platform") || navigator.userAgent))
          b.send("VKWebAppSetSwipeSettings", { history: true }).catch(function () {});
      }
    } catch (e) {}
  }
  if (window.vkBridge) { init(); return; }
  var s = document.createElement("script");
  s.src = "js/vendor/vk-bridge.min.js";
  s.onload = init;
  s.onerror = function () {};
  document.head.appendChild(s);
})();
