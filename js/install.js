/* Лаборатория здоровья — кнопка «Установить игру»
   Chrome / Edge / Яндекс: системное окно установки (beforeinstallprompt).
   iPhone и iPad: подсказка «Поделиться → На экран Домой».
   Остальные браузеры и встроенные браузеры ОК/ВК: подсказка «Откройте игру в Chrome» и кнопка «Скопировать ссылку». */
(function () {
  "use strict";
  var KEY_DONE = "lz_installed", KEY_OFFER = "lz_install_offered";
  var deferred = null;
  var ua = navigator.userAgent || "";
  var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(ua);
  var inApp = /OKApp|OdnoklassnikiApp|OkApp|ru\.ok\.android|VKAndroidApp|VKClient|vkclient|com\.vkontakte|FBAN|FBAV|Instagram|Telegram|; wv\)/i.test(ua);
  // Браузеры, которые умеют показывать системное окно установки
  var chromium = !inApp && !isIOS && /Chrome|Chromium|Edg\/|YaBrowser|SamsungBrowser/.test(ua) && !/OPR\/|Firefox/.test(ua);
  var pageUrl = location.href.split("#")[0].split("?")[0].replace(/index\.html$/, "");

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function standalone() {
    return (window.matchMedia && (matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches ||
      matchMedia("(display-mode: minimal-ui)").matches)) || window.navigator.standalone === true;
  }
  // Можно ли что-то предложить: системное окно, iPhone-подсказка или подсказка «Откройте в Chrome»
  function mode() {
    if (standalone()) return null;
    if (deferred) return "prompt";
    if (get(KEY_DONE)) return null;           // уже установили из этого браузера
    if (isIOS) return "ios";
    if (chromium) return null;                // ждём beforeinstallprompt; если его нет — игра уже установлена
    return "other";
  }
  function refresh() {
    var m = mode();
    Array.prototype.forEach.call(document.querySelectorAll("[data-install-box]"), function (el) { el.hidden = !m; });
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); deferred = e;
    try { localStorage.removeItem(KEY_DONE); } catch (x) {}
    refresh();
  });
  window.addEventListener("appinstalled", function () {
    deferred = null; set(KEY_DONE, "1"); refresh(); closeSheet();
    if (window.LZ) LZ.toast("Готово! Игра установлена — значок «Лаборатория здоровья» появился на экране.");
  });
  if (window.matchMedia) { try { matchMedia("(display-mode: standalone)").addEventListener("change", refresh); } catch (e) {} }

  /* ---------- Окно с подсказкой ---------- */
  var ret = null;
  function $(id) { return document.getElementById(id); }
  function openSheet(title, html) {
    ret = document.activeElement;
    $("sheet-title").textContent = title; $("sheet-body").innerHTML = html;
    $("sheet").hidden = false; document.body.classList.add("sheet-open");
    $("sheet-title").focus({ preventScroll: true }); $("sheet-body").scrollTop = 0;
  }
  function closeSheet() {
    if ($("sheet").hidden) return;
    $("sheet").hidden = true; document.body.classList.remove("sheet-open");
    if (ret && ret.focus && document.contains(ret)) ret.focus({ preventScroll: true });
  }

  var IC_SHARE = '<svg class="ins-ic" viewBox="0 0 48 48" aria-hidden="true"><path d="M17 19h-4a3 3 0 0 0-3 3v18a3 3 0 0 0 3 3h22a3 3 0 0 0 3-3V22a3 3 0 0 0-3-3h-4" fill="none" stroke="#1d6fd6" stroke-width="3.5" stroke-linecap="round"/><path d="M24 30V5M16 13l8-8 8 8" fill="none" stroke="#1d6fd6" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var IC_ADD = '<svg class="ins-ic" viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="6" width="36" height="36" rx="9" fill="none" stroke="#222" stroke-width="3.5"/><path d="M24 15v18M15 24h18" stroke="#222" stroke-width="3.5" stroke-linecap="round"/></svg>';
  var IC_DOTS = '<svg class="ins-ic" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="none" stroke="#222" stroke-width="3"/><circle cx="14" cy="24" r="3.4" fill="#222"/><circle cx="24" cy="24" r="3.4" fill="#222"/><circle cx="34" cy="24" r="3.4" fill="#222"/></svg>';
  var IC_MENU = '<svg class="ins-ic" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="10" r="4.5" fill="#222"/><circle cx="24" cy="24" r="4.5" fill="#222"/><circle cx="24" cy="38" r="4.5" fill="#222"/></svg>';
  var APP = '<img class="ins-app" src="icons/icon.svg" alt="" width="64" height="64">';

  function step(n, ic, html) { return '<li class="ins-step"><span class="ins-n">' + n + "</span>" + (ic || "") + '<span class="ins-t">' + html + "</span></li>"; }

  function iosHint() {
    var safari = !/CriOS|FxiOS|EdgiOS|YaBrowser|OPiOS/.test(ua) && !inApp;
    openSheet("Установить на iPhone", '<div class="ins">' +
      (safari ? "" : '<p class="ins-warn">Лучше всего это работает в браузере <b>Safari</b>. Если ниже нет нужных кнопок — скопируйте ссылку и откройте её в Safari.</p>') +
      '<ol class="ins-steps">' +
      step(1, IC_SHARE, "Нажмите кнопку <b>«Поделиться»</b> — квадрат со стрелкой вверх. Она внизу экрана (на iPad — вверху)." +
        '<span class="ins-small">Не видно? Сначала нажмите ' + IC_DOTS.replace('class="ins-ic"', 'class="ins-ic ins-inline"') + " внизу справа.</span>") +
      step(2, IC_ADD, "Пролистайте вниз и выберите <b>«На экран „Домой“»</b>.") +
      step(3, APP, "Нажмите <b>«Добавить»</b>. На экране появится значок игры.") +
      "</ol>" + (safari ? "" : copyBlock()) +
      '<button class="btn btn-primary btn-big" data-close>Понятно</button></div>');
  }

  function copyBlock() {
    return '<div class="ins-link"><div class="ins-url" id="ins-url">' + pageUrl.replace(/^https?:\/\//, "") + "</div>" +
      '<button class="btn btn-secondary btn-big" data-install-copy>Скопировать ссылку</button></div>';
  }

  function otherHint() {
    var chromeLink = isAndroid ? '<a class="btn btn-primary btn-big" href="intent://' + pageUrl.replace(/^https?:\/\//, "") +
      '#Intent;scheme=https;package=com.android.chrome;end">Открыть в Chrome</a>' : "";
    var ff = /Firefox/.test(ua);
    openSheet("Установить игру", '<div class="ins">' +
      (inApp ? "<p class=\"ins-lead\">Сейчас игра открыта внутри приложения (например, Одноклассников или ВКонтакте). Отсюда установить её нельзя.</p>" :
        '<p class="ins-lead">Этот браузер не умеет устанавливать игру одной кнопкой.</p>') +
      '<ol class="ins-steps">' +
      step(1, "", "Откройте игру в браузере <b>Chrome</b>" + (isAndroid ? "" : " или <b>Edge</b>") + ".") +
      step(2, "", "Нажмите там зелёную кнопку <b>«Установить игру»</b> на главной.") +
      "</ol>" + chromeLink + copyBlock() +
      (ff && isAndroid ? '<p class="ins-small">В Firefox можно и так: нажмите ' + IC_MENU.replace('class="ins-ic"', 'class="ins-ic ins-inline"') + " → <b>«Установить»</b> или <b>«Добавить на главный экран»</b>.</p>" : "") +
      '<button class="btn btn-ghost btn-big" data-close>Закрыть</button></div>');
  }

  function copyLink(btn) {
    function ok() { btn.textContent = "Ссылка скопирована ✓"; if (window.LZ) LZ.toast("Ссылка скопирована. Вставьте её в адресную строку Chrome."); }
    function legacy() {
      var ta = document.createElement("textarea"); ta.value = pageUrl; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var done = false; try { done = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
      if (done) ok(); else { var r = document.createRange(), u = $("ins-url"); if (u) { r.selectNodeContents(u); var s = getSelection(); s.removeAllRanges(); s.addRange(r); } btn.textContent = "Выделите адрес выше и скопируйте"; }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(pageUrl).then(ok, legacy); else legacy();
  }

  function install() {
    var m = mode();
    if (m === "prompt") {
      var e = deferred; deferred = null;
      e.prompt();
      (e.userChoice || Promise.resolve({})).then(function (r) {
        if (r && r.outcome === "accepted") set(KEY_DONE, "1");
        refresh();
      });
    } else if (m === "ios") iosHint();
    else otherHint();
  }

  // Мягкое разовое предложение (после первого урожая)
  function offer() {
    var m = mode();
    if (!m || get(KEY_OFFER)) return false;
    if (!$("sheet").hidden) return false;      // не перебиваем другое окно — предложим позже
    set(KEY_OFFER, "1");
    openSheet("Игра на вашем экране", '<div class="ins center">' + APP.replace('width="64" height="64"', 'width="84" height="84"') +
      '<p class="ins-lead">Хотите, чтобы огород был всегда под рукой? Установите игру — значок появится на экране телефона или компьютера, как у обычного приложения.</p>' +
      '<button class="btn btn-primary btn-big btn-install" data-install>Установить игру</button>' +
      '<button class="btn btn-ghost btn-big" data-close>Не сейчас</button></div>');
    return true;
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("[data-install], [data-install-copy]") : null;
    if (!el) return;
    e.preventDefault(); e.stopPropagation();
    if (el.hasAttribute("data-install-copy")) { copyLink(el); return; }
    if (el.closest("#sheet")) closeSheet();
    install();
  }, true);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refresh); else refresh();

  window.LZInstall = { install: install, offer: offer, mode: mode, refresh: refresh, _iosHint: iosHint, _otherHint: otherHint };
})();
