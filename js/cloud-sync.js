/* Лаборатория здоровья — прогресс между версиями ВК и ОК.
   Хранилище VKWebAppStorage привязано к пользователю мини-приложения.
   Вне ВК/ОК модуль ничего не делает: остаётся только localStorage.
   Ключи lz_farm_v1, lz_game_v1 и lz_brain_v1 не меняют формат. */
(function (root) {
  "use strict";

  var GAME_KEYS = ["lz_farm_v1", "lz_game_v1", "lz_brain_v1", "lz_logic_v1"];
  var PREFIX = { lz_farm_v1: "lzf", lz_game_v1: "lzg", lz_brain_v1: "lzb", lz_logic_v1: "lzl" };
  var META = "lzm";
  var AT_KEY = "lz_sync_at";
  var CHUNK = 3000;
  var DEBOUNCE = 2500;

  function chunk(str) {
    var s = str == null ? "" : String(str);
    var out = [];
    for (var i = 0; i < s.length; i += CHUNK) out.push(s.slice(i, i + CHUNK));
    return out;
  }
  function pack(bundle) {
    var keys = {};
    var n = {};
    GAME_KEYS.forEach(function (k) {
      var parts = bundle.values[k] == null ? [] : chunk(bundle.values[k]);
      var p = PREFIX[k];
      n[p] = parts.length;
      parts.forEach(function (part, i) { keys[p + i] = part; });
    });
    keys[META] = JSON.stringify({ at: bundle.at || 0, n: n });
    return keys;
  }
  function unpack(raw) {
    raw = raw || {};
    var meta = {};
    try { meta = JSON.parse(raw[META] || "{}") || {}; } catch (e) { meta = {}; }
    var n = meta.n || {};
    var values = {};
    GAME_KEYS.forEach(function (k) {
      var p = PREFIX[k];
      var count = n[p] | 0;
      if (!count) { values[k] = null; return; }
      var s = "";
      for (var i = 0; i < count; i++) s += raw[p + i] || "";
      values[k] = s;
    });
    return { at: meta.at | 0, values: values };
  }
  /* upload — отправить локальное; download — взять облако; noop — нечего синхронизировать.
     Локальные данные без метки времени не затираем: первый заход выгружает их наверх. */
  function decide(localAt, hasLocal, cloudAt, hasCloud, dirty) {
    if (dirty) return "upload";
    if (!hasCloud) return hasLocal ? "upload" : "noop";
    if (!hasLocal) return "download";
    if (!localAt) return "upload";
    if (cloudAt > localAt) return "download";
    return "upload";
  }
  function validJson(s) {
    if (s == null || s === "") return false;
    try { var v = JSON.parse(s); return v && typeof v === "object"; } catch (e) { return false; }
  }
  function hasAny(values) {
    for (var i = 0; i < GAME_KEYS.length; i++) if (values[GAME_KEYS[i]]) return true;
    return false;
  }

  function create(opts) {
    var getItem = opts.getItem;
    var setItem = opts.setItem;
    var removeItem = opts.removeItem;
    var send = opts.send;
    var now = opts.now || function () { return Date.now(); };
    var onStatus = opts.onStatus || function () {};
    var applying = false;
    var dirty = false;
    var timer = null;
    var ready = false;
    var starting = null;
    var baseline = opts.baseline || null;

    function readLocal() {
      if (baseline && !ready) return { at: baseline.at || 0, values: baseline.values };
      var values = {};
      GAME_KEYS.forEach(function (k) { values[k] = getItem(k); });
      return { at: parseInt(getItem(AT_KEY), 10) || 0, values: values };
    }
    function note() {
      /* Пока первая сверка не закончилась, игра может записать стартовое
         состояние из памяти. Это не правка игрока и не должна затирать облако. */
      if (applying || !ready) return;
      dirty = true;
      setItem(AT_KEY, String(now()));
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { timer = null; push().catch(function () {}); }, DEBOUNCE);
    }
    function storageKeysFor(meta) {
      var list = [META];
      var n = (meta && meta.n) || {};
      Object.keys(PREFIX).forEach(function (game) {
        var p = PREFIX[game];
        var count = n[p] | 0;
        for (var i = 0; i < count; i++) list.push(p + i);
      });
      return list;
    }
    function pullRaw() {
      return send("VKWebAppStorageGet", { keys: [META] }).then(function (res) {
        var map = {};
        ((res && res.keys) || []).forEach(function (row) { if (row && row.key) map[row.key] = row.value || ""; });
        var meta = {};
        try { meta = JSON.parse(map[META] || "{}") || {}; } catch (e) { meta = {}; }
        if (!meta.at) return { at: 0, values: { lz_farm_v1: null, lz_game_v1: null, lz_brain_v1: null, lz_logic_v1: null } };
        var need = storageKeysFor(meta).filter(function (k) { return k !== META; });
        if (!need.length) return unpack(map);
        return send("VKWebAppStorageGet", { keys: need }).then(function (res2) {
          ((res2 && res2.keys) || []).forEach(function (row) { if (row && row.key) map[row.key] = row.value || ""; });
          return unpack(map);
        });
      });
    }
    function writeCloud(bundle) {
      var keys = pack(bundle);
      var names = Object.keys(keys);
      var chain = Promise.resolve();
      names.forEach(function (name) {
        chain = chain.then(function () {
          if (String(keys[name]).length > 4096 || name.length > 100) return Promise.reject(new Error("storage-limit"));
          return send("VKWebAppStorageSet", { key: name, value: String(keys[name]) });
        });
      });
      return chain;
    }
    function applyCloud(cloud) {
      applying = true;
      try {
        GAME_KEYS.forEach(function (k) {
          var v = cloud.values[k];
          if (v == null) return;
          if (v === "") removeItem(k);
          else if (validJson(v)) setItem(k, v);
        });
        setItem(AT_KEY, String(cloud.at || 0));
      } finally { applying = false; }
      dirty = false;
    }
    function reload() {
      if (root.LZFarm && LZFarm.reloadProgress) LZFarm.reloadProgress();
      if (root.LZBrain && LZBrain.reloadProgress) LZBrain.reloadProgress();
      if (root.LZ && LZ.reloadProgress) LZ.reloadProgress();
      if (root.LZLogic && LZLogic.reloadProgress) LZLogic.reloadProgress();
    }
    function push() {
      var local = readLocal();
      if (!local.at) {
        local.at = now();
        applying = true;
        try { setItem(AT_KEY, String(local.at)); } finally { applying = false; }
      }
      return writeCloud(local).then(function () { dirty = false; });
    }
    function sync() {
      var local = readLocal();
      var hasLocal = hasAny(local.values);
      return pullRaw().then(function (cloud) {
        var hasCloud = !!(cloud && cloud.at && hasAny(cloud.values));
        var action = decide(local.at, hasLocal, cloud.at, hasCloud, dirty);
        if (action === "download") {
          applyCloud(cloud);
          reload();
          onStatus("download");
          return "download";
        }
        if (action === "upload") {
          return push().then(function () {
            /* Стартовые записи игры (гость ушёл, таймер) не подменяют сохранение,
               которое уже лежало в localStorage до загрузки скриптов. */
            if (!ready && baseline) {
              applyCloud({ at: parseInt(getItem(AT_KEY), 10) || local.at || 0, values: local.values });
              reload();
            }
            onStatus(hasCloud ? "upload" : "migrate");
            return hasCloud ? "upload" : "migrate";
          });
        }
        onStatus("noop");
        return "noop";
      });
    }
    function start() {
      if (starting) return starting;
      starting = sync().catch(function () { onStatus("error"); return "error"; });
      starting.then(function () { ready = true; });
      return starting;
    }
    function flush() {
      if (timer) { clearTimeout(timer); timer = null; }
      if (!ready || applying) return Promise.resolve();
      if (!dirty && !(parseInt(getItem(AT_KEY), 10) || 0)) return Promise.resolve();
      return push().catch(function () {});
    }
    return {
      note: note, start: start, flush: flush, sync: sync,
      pack: pack, unpack: unpack, decide: decide, chunk: chunk, CHUNK: CHUNK, GAME_KEYS: GAME_KEYS
    };
  }

  var api = { create: create, pack: pack, unpack: unpack, decide: decide, chunk: chunk, CHUNK: CHUNK, GAME_KEYS: GAME_KEYS, AT_KEY: AT_KEY, META: META };
  root.LZCloudCore = api;

  if (typeof document === "undefined" || !root.Platform || !root.Platform.isEmbedded) return;

  var store = root.localStorage;
  var rawSet = store.setItem.bind(store);
  var rawGet = store.getItem.bind(store);
  var rawRemove = store.removeItem.bind(store);
  var priorValues = {};
  GAME_KEYS.forEach(function (k) { priorValues[k] = rawGet(k); });
  var priorAt = parseInt(rawGet(AT_KEY), 10) || 0;
  var engine = null;

  function bridgeSend(method, params) {
    return new Promise(function (resolve, reject) {
      var left = 12000;
      var timer = setInterval(function () {
        left -= 40;
        var b = root.vkBridge;
        if (b && typeof b.send === "function") {
          clearInterval(timer);
          Promise.resolve(b.send(method, params)).then(resolve, reject);
        } else if (left <= 0) {
          clearInterval(timer);
          reject(new Error("no-bridge"));
        }
      }, 40);
    });
  }
  function toastLater(msg) {
    setTimeout(function () { if (root.LZ && LZ.toast) LZ.toast(msg); }, 1600);
  }
  engine = create({
    getItem: rawGet,
    setItem: rawSet,
    removeItem: rawRemove,
    send: bridgeSend,
    baseline: { at: priorAt, values: priorValues },
    onStatus: function (status) {
      if (status === "download") toastLater("Подтянули прогресс из вашего профиля");
      else if (status === "migrate") toastLater("Прогресс сохранён в профиле");
      else if (status === "error") toastLater("Не удалось связаться с профилем. Прогресс остался на этом устройстве.");
    }
  });
  store.setItem = function (key, value) {
    rawSet(key, value);
    if (GAME_KEYS.indexOf(key) >= 0) engine.note();
  };
  root.addEventListener("visibilitychange", function () { if (document.hidden) engine.flush(); });
  root.addEventListener("pagehide", function () { engine.flush(); });
  root.LZCloud = { start: function () { return engine.start(); }, flush: function () { return engine.flush(); } };
})(typeof window !== "undefined" ? window : globalThis);
