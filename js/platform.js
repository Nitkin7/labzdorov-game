/* Лаборатория здоровья — слой платформ.
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

  function cleanName(s) {
    return String(s || "").replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
  }
  function safePhoto(url, allowLocal) {
    if (typeof url !== "string" || url.length > 800) return "";
    if (/^https:\/\/[^\s<>"']+$/i.test(url)) return url;
    if (allowLocal && /^icons\/[a-z0-9._-]+\.svg$/i.test(url)) return url;
    return "";
  }
  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new Error("timeout")); }, ms);
      Promise.resolve(promise).then(function (v) { clearTimeout(timer); resolve(v); }, function (e) { clearTimeout(timer); reject(e); });
    });
  }
  function emptyUser(status) {
    return { status: status, source: "", firstName: "", lastName: "", photo: "" };
  }
  /* VKWebAppGetUserInfo есть и в ВК, и в единой платформе ОК (документация VK Bridge).
     Без user_id возвращается текущий пользователь. Для ОК нужен use_local: true,
     для ВК параметр не передаём. Токен, почта и телефон не запрашиваются. */
  function bridgeReady(ms) {
    if (window.vkBridge && typeof window.vkBridge.send === "function") return Promise.resolve(window.vkBridge);
    return new Promise(function (resolve) {
      var left = ms;
      var timer = setInterval(function () {
        left -= 40;
        if (window.vkBridge && typeof window.vkBridge.send === "function") { clearInterval(timer); resolve(window.vkBridge); }
        else if (left <= 0) { clearInterval(timer); resolve(null); }
      }, 40);
    });
  }
  function fromBridgeUser(u, source) {
    if (!u || typeof u !== "object") return emptyUser("denied");
    return {
      status: "ok",
      source: source,
      firstName: cleanName(u.first_name),
      lastName: cleanName(u.last_name),
      photo: safePhoto(u.photo_200 || u.photo_100 || "")
    };
  }
  function userInfo() {
    var mock = window.__LZ_PROFILE_MOCK;
    if (mock && typeof mock === "object") {
      if (mock.mode === "fail") return Promise.resolve(emptyUser("denied"));
      if (mock.mode === "timeout") return withTimeout(new Promise(function () {}), 1200).then(function () { return emptyUser("timeout"); }, function () { return emptyUser("timeout"); });
      if (mock.mode === "ok" || mock.mode === "badphoto") {
        return Promise.resolve({
          status: "ok",
          source: "mock",
          firstName: cleanName(mock.first_name),
          lastName: cleanName(mock.last_name),
          photo: mock.mode === "badphoto" ? safePhoto("https://127.0.0.1:9/no-photo.png") : safePhoto(mock.photo || "", true)
        });
      }
    }
    if (name === "web") return Promise.resolve(emptyUser("none"));
    var payload = name === "ok" ? { use_local: true } : {};
    return bridgeReady(700).then(function (bridge) {
      if (!bridge) return emptyUser("unavailable");
      return withTimeout(bridge.send("VKWebAppGetUserInfo", payload), 1200).then(function (u) {
        return fromBridgeUser(u, name);
      }, function (err) {
        return emptyUser(err && err.message === "timeout" ? "timeout" : "denied");
      });
    }).catch(function () { return emptyUser("denied"); });
  }

  /* v13: проверка подписки убрана — игра открыта для всех. */
  var VK_APP_ID = 54875478;   // ID мини-приложения ВК

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
      init: function () { return Promise.resolve(); },   // VKWebAppInit — в js/vk-init.js
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
      init: function () { return Promise.resolve(); },   // ОК запускает игру через VK Bridge (js/vk-init.js)
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
    userInfo: userInfo,
    /* v9: заготовка общей таблицы рекордов для «Тренировки памяти и внимания» (ВЫКЛЮЧЕНА).
       Сейчас результаты хранятся только на устройстве (lz_brain_v1).
       TODO ВК:  VK Bridge "VKWebAppShowLeaderBoardBox" / таблица рекордов через свой сервер.
       TODO ОК:  FAPI.UI.showRatingDialog / рейтинги через REST API ОК — запись только на сервере, без ключей в клиенте.
       Включать вместе с проверкой подписи запуска; до этого никаких сетевых запросов. */
    vk: { appId: VK_APP_ID || Number(params.get("vk_app_id")) || 0 },
    leaderboard: {
      enabled: false,
      submit: function (game, variant, score) { return Promise.resolve(false); },
      top: function (game, variant, limit) { return Promise.resolve([]); }
    }
  };
  document.documentElement.setAttribute("data-platform", name);
})();
