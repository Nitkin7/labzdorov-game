/* Лаборатория здоровья — слой платформ (заглушки).
   Определяет, где запущена игра: ОК (Одноклассники), ВК (VK Mini App) или обычный браузер.
   SDK платформ здесь НЕ загружаются и приложения НЕ регистрируются —
   это точки подключения на будущее. */
(function () {
  "use strict";

  var params = new URLSearchParams(window.location.search);

  function detect() {
    // Принудительно: ?platform=ok | vk | web (удобно для тестов)
    var forced = params.get("platform");
    if (forced === "ok" || forced === "vk" || forced === "web") return forced;
    // VK Mini Apps передают vk_app_id, vk_user_id, vk_platform, sign …
    if (params.get("vk") === "1" || params.has("sign") && params.has("vk_user_id")) return "vk";
    if (params.has("vk_app_id") || params.has("vk_platform") || params.has("vk_user_id")) return "vk";
    if (params.get("ok") === "1") return "ok";
    // Игры ОК во фрейме получают api_server, apiconnection, application_key, logged_user_id …
    if (params.has("api_server") || params.has("apiconnection") || params.has("application_key") || params.has("logged_user_id")) return "ok";
    return "web";
  }

  var name = detect();

  /* v11: настройки «игры для подписчиков» ВК */
  var VK_APP_ID = 54875478;          // ID мини-приложения ВК (вписать после регистрации); 0 = взять из vk_app_id запуска
  var VK_GROUP_ID = 68950530; // сообщество https://vk.ru/labzdorovia
  /* v12: «игра для подписчиков» ОК. Секретный ключ приложения здесь НЕ хранится. */
  var OK_APP_ID = 0;          // ID игры ОК (вписать после регистрации)
  var OK_APP_KEY = "";        // ПУБЛИЧНЫЙ ключ приложения; пусто = взять application_key из запуска
  var OK_GROUP_ID = "70000033417881"; // https://ok.ru/labzdorov
  var LOCK_SITE = false;      // true = на обычном сайте тоже закрыть игру (пока НЕ закрываем)

  /* Включить, когда приложения будут зарегистрированы. Пока всегда false. */
  var SDK_ENABLED = false;
  var SDK_URLS = {
    vk: "https://unpkg.com/@vkontakte/vk-bridge/dist/browser.min.js",
    ok: "https://api.ok.ru/js/fapi5.js"
  };

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src; s.async = true; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  var adapters = {
    web: {
      init: function () { return Promise.resolve(); },
      share: function (text, url) {
        if (navigator.share) {
          return navigator.share({ title: "Лаборатория здоровья", text: text, url: url }).then(function () { return "shared"; }, function () { return "cancelled"; });
        }
        if (navigator.clipboard && window.isSecureContext) {
          return navigator.clipboard.writeText(text + " " + url).then(function () { return "copied"; }, function () { return "failed"; });
        }
        return Promise.resolve("failed");
      },
      saveProgress: function () { return Promise.resolve(); },   // всё хранится в localStorage
      showAd: function () { return Promise.resolve(false); }     // рекламы нет
    },

    vk: {
      init: function () {
        if (!SDK_ENABLED) return Promise.resolve();
        return loadScript(SDK_URLS.vk).then(function () {
          // TODO: window.vkBridge.send("VKWebAppInit");
        });
      },
      share: function (text, url) {
        // TODO: window.vkBridge.send("VKWebAppShare", { link: url });
        return adapters.web.share(text, url);
      },
      saveProgress: function (state) {
        // TODO: VKWebAppStorageSet — синхронизация прогресса между устройствами
        return Promise.resolve();
      },
      showAd: function () { return Promise.resolve(false); }
    },

    ok: {
      init: function () {
        if (!SDK_ENABLED) return Promise.resolve();
        return loadScript(SDK_URLS.ok).then(function () {
          // TODO: var rp = FAPI.Util.getRequestParameters();
          //       FAPI.init(rp.api_server, rp.apiconnection, onSuccess, onError);
        });
      },
      share: function (text, url) {
        // TODO: FAPI.UI.postMediatopic({ media: [{ type: "text", text: text }, { type: "link", url: url }] }, false);
        return adapters.web.share(text, url);
      },
      saveProgress: function (state) {
        // TODO: storage.set через REST API ОК (на стороне сервера, без ключей в клиенте)
        return Promise.resolve();
      },
      showAd: function () { return Promise.resolve(false); }
    }
  };

  var groupUrl = { ok: "https://ok.ru/labzdorov", vk: "https://vk.ru/labzdorovia", web: "https://ok.ru/labzdorov" };

  window.Platform = {
    name: name,
    isEmbedded: name !== "web",
    groupUrl: groupUrl[name],
    init: function () { return adapters[name].init().catch(function () {}); },
    share: function (text) { return adapters[name].share(text, groupUrl[name]); },
    saveProgress: function (state) { return adapters[name].saveProgress(state).catch(function () {}); },
    showAd: function () { return adapters[name].showAd(); },
    /* v9: заготовка общей таблицы рекордов для «Тренировки памяти и внимания» (ВЫКЛЮЧЕНА).
       Сейчас результаты хранятся только на устройстве (lz_brain_v1).
       TODO ВК:  VK Bridge "VKWebAppShowLeaderBoardBox" / таблица рекордов через свой сервер.
       TODO ОК:  FAPI.UI.showRatingDialog / рейтинги через REST API ОК — запись только на сервере, без ключей в клиенте.
       Включать вместе с SDK_ENABLED и проверкой подписи запуска; до этого никаких сетевых запросов. */
    vk: { appId: VK_APP_ID || Number(params.get("vk_app_id")) || 0, groupId: VK_GROUP_ID },
    ok: { appId: OK_APP_ID, appKey: OK_APP_KEY || params.get("application_key") || "", groupId: OK_GROUP_ID, groupUrl: "https://ok.ru/group/" + OK_GROUP_ID },
    lockSite: LOCK_SITE,
    leaderboard: {
      enabled: false,
      submit: function (game, variant, score) { return Promise.resolve(false); },
      top: function (game, variant, limit) { return Promise.resolve([]); }
    }
  };
  document.documentElement.setAttribute("data-platform", name);
})();
