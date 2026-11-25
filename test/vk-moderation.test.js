/* Проверка шаринга и синхронизации прогресса без сети и без секретов.
   node test/vk-moderation.test.js */
var fs = require("fs");
var vm = require("vm");
var path = require("path");
var assert = require("assert");

function loadCloud() {
  var ctx = { console: console };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  ctx.setTimeout = function () { return 0; };
  ctx.clearTimeout = function () {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/cloud-sync.js"), "utf8"), ctx);
  return ctx.LZCloudCore;
}

function memStore(initial) {
  var data = Object.assign({}, initial || {});
  return {
    data: data,
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
    removeItem: function (k) { delete data[k]; }
  };
}
function bridgeStore() {
  var box = {};
  return {
    box: box,
    send: function (method, params) {
      if (method === "VKWebAppStorageSet") {
        if (!params || String(params.key).length > 100 || String(params.value).length > 4096) {
          return Promise.reject(new Error("storage-limit"));
        }
        box[params.key] = String(params.value);
        return Promise.resolve({ result: true });
      }
      if (method === "VKWebAppStorageGet") {
        return Promise.resolve({
          keys: (params.keys || []).map(function (k) { return { key: k, value: box[k] || "" }; })
        });
      }
      return Promise.reject(new Error("unknown"));
    }
  };
}

var Core = loadCloud();
var packed = Core.pack({
  at: 50,
  values: { lz_farm_v1: JSON.stringify({ coins: 7 }), lz_game_v1: null, lz_brain_v1: JSON.stringify({ v: 1 }) }
});
var round = Core.unpack(packed);
assert.strictEqual(round.at, 50);
assert.strictEqual(JSON.parse(round.values.lz_farm_v1).coins, 7);
assert.strictEqual(round.values.lz_game_v1, null);
assert.ok(Core.chunk("x".repeat(9000)).length === 3);
assert.ok(Core.chunk("x".repeat(9000)).every(function (p) { return p.length <= Core.CHUNK; }));
assert.strictEqual(Core.decide(0, true, 0, false, false), "upload");
assert.strictEqual(Core.decide(0, false, 10, true, false), "download");
assert.strictEqual(Core.decide(0, true, 10, true, false), "upload");
assert.strictEqual(Core.decide(5, true, 10, true, false), "download");
assert.strictEqual(Core.decide(12, true, 10, true, false), "upload");
assert.strictEqual(Core.decide(1, true, 99, true, true), "upload");

function device(bridge, nowBox) {
  var store = memStore();
  var engine = Core.create({
    getItem: store.getItem,
    setItem: store.setItem,
    removeItem: store.removeItem,
    send: bridge.send,
    now: function () { return nowBox.t; }
  });
  return { store: store, engine: engine };
}

function bootDoesNotWipeCloud() {
  var box = bridgeStore();
  var seeded = Core.pack({
    at: 9000,
    values: {
      lz_farm_v1: JSON.stringify({ coins: 777, tut: 1 }),
      lz_game_v1: JSON.stringify({ points: 480 }),
      lz_brain_v1: JSON.stringify({ v: 1, games: { schulte: { plays: 2 } } })
    }
  });
  Object.keys(seeded).forEach(function (k) { box.box[k] = seeded[k]; });
  var store = memStore();
  var engine = Core.create({
    getItem: store.getItem,
    setItem: store.setItem,
    removeItem: store.removeItem,
    send: box.send,
    now: function () { return 5000; },
    baseline: { at: 0, values: { lz_farm_v1: null, lz_game_v1: null, lz_brain_v1: null } }
  });
  store.setItem("lz_farm_v1", JSON.stringify({ coins: 30, tut: 0 }));
  return engine.start().then(function (action) {
    assert.strictEqual(action, "download");
    assert.strictEqual(JSON.parse(store.data.lz_game_v1).points, 480);
    assert.strictEqual(JSON.parse(store.data.lz_farm_v1).coins, 777);
    assert.strictEqual(box.box.lzm.indexOf("9000") >= 0, true);
  });
}

var clock = { t: 1000 };
var bridge = bridgeStore();
var phone = device(bridge, clock);
var tablet = device(bridge, clock);

phone.store.setItem("lz_farm_v1", JSON.stringify({ coins: 15, beds: [null] }));
phone.store.setItem("lz_game_v1", JSON.stringify({ points: 40, seen: [1] }));
phone.store.setItem("lz_brain_v1", JSON.stringify({ v: 1, games: { schulte: { plays: 2 } } }));
phone.engine.start().then(function (action) {
  assert.strictEqual(action, "migrate");
  clock.t = 2000;
  return tablet.engine.start();
}).then(function (action) {
  assert.strictEqual(action, "download");
  assert.strictEqual(JSON.parse(tablet.store.data.lz_farm_v1).coins, 15);
  assert.strictEqual(JSON.parse(tablet.store.data.lz_game_v1).points, 40);
  clock.t = 3000;
  tablet.store.setItem("lz_farm_v1", JSON.stringify({ coins: 80, beds: [null, null] }));
  tablet.store.setItem("lz_game_v1", JSON.stringify({ points: 90, seen: [1, 2] }));
  tablet.engine.note();
  return tablet.engine.sync();
}).then(function () {
  return phone.engine.sync();
}).then(function (action) {
  assert.strictEqual(action, "download");
  assert.strictEqual(JSON.parse(phone.store.data.lz_farm_v1).coins, 80);
  assert.strictEqual(JSON.parse(phone.store.data.lz_game_v1).points, 90);
  assert.strictEqual(JSON.parse(phone.store.data.lz_brain_v1).games.schulte.plays, 2);
  return bootDoesNotWipeCloud();
}).then(function () {
  return shareTests();
}).then(function () {
  console.log("vk-moderation tests ok");
}).catch(function (err) {
  console.error(err);
  process.exit(1);
});

function loadPlatform(search, extras) {
  var calls = [];
  var ctx = {
    console: console,
    URLSearchParams: URLSearchParams,
    Promise: Promise,
    setInterval: setInterval,
    clearInterval: clearInterval,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    document: { documentElement: { setAttribute: function () {} }, createElement: function () { return { style: {}, setAttribute: function () {}, select: function () {} }; }, body: { appendChild: function () {}, removeChild: function () {} }, execCommand: function () { return false; } },
    navigator: extras.navigator || {},
    vkBridge: extras.vkBridge || null,
    location: { search: search, protocol: "https:" },
    isSecureContext: true
  };
  ctx.window = ctx;
  ctx.document.execCommand = function () { return false; };
  if (extras.vkBridge) {
    var orig = extras.vkBridge.send;
    extras.vkBridge.send = function (method, params) {
      calls.push({ method: method, params: params });
      return orig(method, params);
    };
    ctx.vkBridge = extras.vkBridge;
  }
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/platform.js"), "utf8"), ctx);
  ctx.__calls = calls;
  return ctx;
}

function methodsOf(ctx) {
  return ctx.__calls.map(function (c) { return c.method; });
}
function callOf(ctx, method) {
  for (var i = 0; i < ctx.__calls.length; i++) if (ctx.__calls[i].method === method) return ctx.__calls[i];
  return null;
}

function shareTests() {
  var vk = loadPlatform("?platform=vk&vk_user_id=1", {
    vkBridge: { send: function (method) {
      if (method === "VKWebAppShowWallPostBox") return Promise.resolve({ result: true });
      return Promise.reject(new Error("no"));
    } }
  });
  return vk.Platform.share("Совет дня: пейте тёплую воду").then(function (r) {
    assert.strictEqual(r, "shared");
    var wall = callOf(vk, "VKWebAppShowWallPostBox");
    assert.ok(wall);
    assert.ok(wall.params.message.indexOf("https://vk.ru/app54875478") >= 0);
    assert.ok(wall.params.message.indexOf("тёплую воду") >= 0);
    assert.strictEqual(callOf(vk, "VKWebAppShare"), null);
    var cancelled = loadPlatform("?platform=vk&vk_user_id=1", {
      vkBridge: {
        supportsAsync: function () { return Promise.resolve(true); },
        send: function (method) {
          if (method === "VKWebAppShowWallPostBox") return Promise.reject({ error_type: "client_error", error_data: { error_code: 4, error_reason: "User denied" } });
          return Promise.reject(new Error("should-not-" + method));
        }
      }
    });
    return cancelled.Platform.share("Совет");
  }).then(function (r) {
    assert.strictEqual(r, "cancelled");
    var unsupported = loadPlatform("?platform=vk&vk_platform=mobile_web&vk_user_id=1", {
      vkBridge: {
        supportsAsync: function (method) { return Promise.resolve(method !== "VKWebAppShowWallPostBox"); },
        send: function (method) {
          if (method === "VKWebAppShare") return Promise.resolve({ result: true });
          return Promise.reject(new Error("should-not-" + method));
        }
      }
    });
    return unsupported.Platform.share("Совет дня").then(function (result) {
      assert.strictEqual(result, "shared");
      assert.deepStrictEqual(methodsOf(unsupported), ["VKWebAppShare"]);
      assert.strictEqual(unsupported.__calls[0].params.link, "https://vk.ru/app54875478");
      var generic = loadPlatform("?platform=vk&vk_platform=mobile_web&vk_user_id=1", {
        vkBridge: {
          supportsAsync: function () { return Promise.resolve(true); },
          send: function (method) {
            if (method === "VKWebAppShowWallPostBox") return Promise.reject({ error_type: "client_error", error_data: { error_code: 1, error_reason: "Action closed" } });
            if (method === "VKWebAppShare") return Promise.resolve({ result: true });
            return Promise.reject(new Error("no"));
          }
        }
      });
      return generic.Platform.share("Совет").then(function (genericResult) {
        assert.strictEqual(genericResult, "shared");
        assert.deepStrictEqual(methodsOf(generic), ["VKWebAppShowWallPostBox", "VKWebAppShare"]);
        var copied = "";
        var bothDown = loadPlatform("?platform=vk&vk_platform=mobile_web&vk_user_id=1", {
          vkBridge: {
            supportsAsync: function () { return Promise.resolve(false); },
            send: function () { return Promise.reject(new Error("should-not")); }
          },
          navigator: {
            share: function () { return Promise.reject({ name: "NotAllowedError", message: "blocked" }); },
            clipboard: { writeText: function (t) { copied = t; return Promise.resolve(); } }
          }
        });
        return bothDown.Platform.share("Совет дня: мята").then(function (copyResult) {
          assert.strictEqual(copyResult, "copied");
          assert.deepStrictEqual(methodsOf(bothDown), []);
          assert.ok(copied.indexOf("https://vk.ru/app54875478") >= 0);
          assert.ok(copied.indexOf("мята") >= 0);
          var byEvent = loadPlatform("?platform=ok&vk_user_id=2", {
            vkBridge: { send: function (method, params) {
              if (method === "VKWebAppSupports") return Promise.resolve({ supported: params.method !== "VKWebAppShare" });
              if (method === "VKWebAppShowWallPostBox") return Promise.resolve({ result: true });
              return Promise.reject(new Error("no"));
            } }
          });
          return byEvent.Platform.share("Совет дня").then(function (okResult) {
            assert.strictEqual(okResult, "shared");
            assert.ok(callOf(byEvent, "VKWebAppSupports"));
            assert.strictEqual(callOf(byEvent, "VKWebAppShare"), null);
            assert.ok(callOf(byEvent, "VKWebAppShowWallPostBox"));
            var webCopied = "";
            var web = loadPlatform("?platform=web", {
              navigator: {
                share: function () { return Promise.reject({ name: "NotAllowedError", message: "denied" }); },
                clipboard: { writeText: function (t) { webCopied = t; return Promise.resolve(); } }
              }
            });
            return web.Platform.share("Совет дня: мята").then(function (webResult) {
              assert.strictEqual(webResult, "copied");
              assert.ok(webCopied.indexOf("https://igra.orkestr.online/") >= 0);
              assert.ok(webCopied.indexOf("мята") >= 0);
            });
          });
        });
      });
    });
  });
}
