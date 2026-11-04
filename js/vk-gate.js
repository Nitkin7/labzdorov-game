/* Лаборатория здоровья — v11: игра для подписчиков группы ВК.
   Работает только внутри ВК (Platform.name === "vk"). На обычном сайте ничего не делает,
   пока Platform.lockSite === false. Секретных ключей здесь нет: проверка идёт
   токеном самого игрока (VKWebAppGetAuthToken) + метод groups.isMember. */
(function () {
  "use strict";
  var P = window.Platform;
  if (!P) return;
  var gate = document.getElementById("vk-gate");
  if (P.name === "ok") { okGate(); return; }
  if (P.name !== "vk") {
    if (P.lockSite && gate) { show("site"); }
    return;
  }
  var APP_ID = P.vk.appId, GROUP_ID = P.vk.groupId, API_V = "5.199";
  var token = null, bridge = null;
  document.documentElement.classList.add("gate-on");

  /* ---------- ОК (v12): FAPI + group.getUserGroupsByIds, подпись session_secret_key делает FAPI ---------- */
  function okGate() {
    var G = P.ok, MEMBER = { ACTIVE: 1, ADMIN: 1, MODERATOR: 1, SUPER_MODERATOR: 1 };
    var uid = null, ready = false;
    document.documentElement.classList.add("gate-on");
    function done() { document.documentElement.classList.remove("gate-on"); gate.hidden = true; }
    function withTimeout(fn) {
      return new Promise(function (res, rej) { var t = setTimeout(function () { rej(new Error("timeout")); }, 20000); fn(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); }); });
    }
    function init() {
      if (ready) return Promise.resolve();
      var load = window.FAPI ? Promise.resolve() : new Promise(function (res, rej) {
        var s = document.createElement("script"); s.src = "js/vendor/fapi5.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
      return load.then(function () {
        var rp = FAPI.Util.getRequestParameters();
        uid = rp.logged_user_id;
        if (!rp.api_server || !uid) throw new Error("no launch params");
        return withTimeout(function (ok, bad) { FAPI.init(rp.api_server, rp.apiconnection, ok, bad); });
      }).then(function () { ready = true; });
    }
    function check() {
      show("loading");
      return init().then(function () {
        return withTimeout(function (ok, bad) {
          FAPI.Client.call({ method: "group.getUserGroupsByIds", group_id: G.groupId, uids: uid }, function (st, data, err) {
            st === "ok" ? ok(data) : bad(err || st);
          });
        });
      }).then(function (data) {
        var list = Array.isArray(data) ? data : [];
        var m = list.some(function (x) { return x && MEMBER[String(x.status).toUpperCase()]; });
        m ? done() : show("join");
      }).catch(function () { show("error"); });
    }
    function join() {
      // Окно ОК «Вступить в группу»; если не сработает — открываем группу в новой вкладке
      try {
        window.API_callback = function (method, result) {
          if (method === "joinGroup") { if (result === "ok") check(); else { if (!FAPI.UI.isSupported()) window.open(G.groupUrl, "_blank"); show("join"); } }
        };
        FAPI.UI.joinGroup(G.groupId, false);
      } catch (e) { window.open(G.groupUrl, "_blank"); }
    }
    gate.addEventListener("click", function (e) {
      var b = e.target.closest("[data-gate]"); if (!b) return;
      var a = b.getAttribute("data-gate");
      if (a === "join") join(); else if (a === "check" || a === "retry") check();
    });
    check();
  }

  function show(state) {
    if (!gate) return;
    gate.hidden = false;
    gate.setAttribute("data-state", state);
  }
  function openGame() {
    document.documentElement.classList.remove("gate-on");
    if (gate) gate.hidden = true;
  }
  function loadBridge() {
    if (window.vkBridge) return Promise.resolve(window.vkBridge);
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = "js/vendor/vk-bridge.min.js";
      s.onload = function () { window.vkBridge ? res(window.vkBridge) : rej(new Error("no bridge")); };
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  function send(m, d) { // с тайм-аутом, чтобы не «висеть» на загрузке
    return Promise.race([bridge.send(m, d), new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, 20000); })]);
  }
  function getToken() {
    if (token) return Promise.resolve(token);
    if (!APP_ID) return Promise.reject(new Error("no app id"));
    return send("VKWebAppGetAuthToken", { app_id: APP_ID, scope: "" }).then(function (r) {
      token = r && r.access_token; if (!token) throw new Error("no token"); return token;
    });
  }
  function isMember() {
    return getToken().then(function (t) {
      return send("VKWebAppCallAPIMethod", {
        method: "groups.isMember",
        params: { group_id: GROUP_ID, v: API_V, access_token: t }
      });
    }).then(function (r) {
      var v = r && r.response;
      if (v && typeof v === "object") v = v.member;
      return v === 1 || v === true;
    });
  }
  function check() {
    show("loading");
    return isMember().then(function (ok) { ok ? openGame() : show("join"); })
      .catch(function () { token = null; show("error"); });
  }
  function join() {
    show("loading");
    bridge.send("VKWebAppJoinGroup", { group_id: GROUP_ID })
      .then(function () { return check(); }, function () { show("join"); });
  }

  if (gate) {
    gate.addEventListener("click", function (e) {
      var b = e.target.closest("[data-gate]"); if (!b) return;
      var a = b.getAttribute("data-gate");
      if (a === "join") join(); else if (a === "check" || a === "retry") check();
    });
  }
  show("loading");
  loadBridge().then(function (b) {
    bridge = b;
    b.send("VKWebAppInit").catch(function () {});
    return check();
  }).catch(function () { show("error"); });
})();
