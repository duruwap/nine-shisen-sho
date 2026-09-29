(function () {
  'use strict';

  var L = window.DragLogic;
  var t = I18n.t;

  var GAME_MS = 120000;
  var POP_MS = 300;
  var QUEUE = 3;           // current target + the next two
  // Board size (tiles) like the apple game. Portrait uses it as-is; landscape swaps.
  var LONG_SIDE = 17;
  var SHORT_SIDE = 10;
  var MAX_BOARD_W = 1100;
  var PAD = 0.35;          // board padding in cells, so drags can start just outside the tiles

  var $ = function (id) { return document.getElementById(id); };
  var screens = { start: $('screen-start'), game: $('screen-game'), result: $('screen-result') };
  var boardEl = $('board');
  var boardWrap = $('board-wrap');
  var fxLayer = $('fx-layer');
  var selEl = $('select-rect');
  var selSum = $('select-sum');
  var hudEl = document.querySelector('.hud');

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  var S = null; // current game state
  var tileEls = new Map();

  // ---------- Screens ----------
  function show(name) {
    Object.keys(screens).forEach(function (k) { screens[k].hidden = k !== name; });
  }

  function getBest() { return Number(store.get('dragnum.best', '0')) || 0; }

  function refreshStart() {
    $('best-score').textContent = getBest();
  }

  // ---------- Layout ----------
  function wantLandscape() {
    return window.innerWidth > window.innerHeight && window.innerWidth >= 640;
  }

  function layout() {
    if (!S) return;
    var landscape = wantLandscape();
    if (landscape !== S.cols > S.rows) rotateBoard();
    var w = Math.min(boardWrap.clientWidth, MAX_BOARD_W);
    var h = boardWrap.clientHeight;
    var cell = Math.floor(Math.min(w / (S.cols + PAD * 2), h / (S.rows + PAD * 2)));
    cell = Math.max(20, Math.min(cell, 60));
    S.cell = cell;
    boardEl.style.setProperty('--cell', cell + 'px');
    boardEl.style.setProperty('--pad', padPx() + 'px');
    boardEl.style.setProperty('--cols', S.cols);
    boardEl.style.setProperty('--rows', S.rows);
  }

  function rotateBoard() {
    cancelDrag();
    S.grid = L.transpose(S.grid);
    var r = S.rows; S.rows = S.cols; S.cols = r;
    placeAll();
  }

  // ---------- Rendering ----------
  function tileEl(tile) {
    var el = tileEls.get(tile.id);
    if (el) return el;
    el = document.createElement('div');
    el.className = 'tile';
    el.innerHTML = '<span class="chip v' + tile.v + '">' + tile.v + '</span>';
    el._tile = tile;
    boardEl.appendChild(el);
    tileEls.set(tile.id, el);
    return el;
  }

  function placeAll() {
    var seen = new Set();
    for (var r = 0; r < S.rows; r++) {
      for (var c = 0; c < S.cols; c++) {
        var tile = S.grid[r][c];
        if (!tile) continue;
        var el = tileEl(tile);
        el.style.gridRow = String(r + 1);
        el.style.gridColumn = String(c + 1);
        el._r = r; el._c = c;
        seen.add(tile.id);
      }
    }
    tileEls.forEach(function (el, id) {
      if (!seen.has(id) && !el.classList.contains('popping')) { el.remove(); tileEls.delete(id); }
    });
  }

  function clearBoardEls() {
    tileEls.forEach(function (el) { el.remove(); });
    tileEls.clear();
    fxLayer.innerHTML = '';
    selEl.hidden = true;
  }

  function padPx() { return Math.round(S.cell * PAD); }
  function center(p) {
    return { x: padPx() + (p.c + 0.5) * S.cell, y: padPx() + (p.r + 0.5) * S.cell };
  }

  function colorOf(v) {
    return getComputedStyle(document.documentElement).getPropertyValue('--c' + v).trim() || '#999';
  }

  function floatText(x, y, text, cls) {
    var el = document.createElement('div');
    el.className = 'float-text' + (cls ? ' ' + cls : '');
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    fxLayer.appendChild(el);
    setTimeout(function () { el.remove(); }, 800);
  }

  // Confetti uses the popped tiles' colors plus a few vivid accents.
  var VIVID = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF', '#FF9F45'];
  function palette() {
    var out = VIVID.slice();
    for (var v = 1; v <= 9; v++) out.push(colorOf(v));
    return out;
  }

  function celebratePerfect() {
    Confetti.big(palette());
    var el = $('perfect');
    el.hidden = false;
    restartAnim(el, 'show', 1600);
    setTimeout(function () { el.hidden = true; }, 1600);
  }

  var toastTimer = 0;
  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1200);
  }

  function restartAnim(el, cls, ms) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    if (ms) setTimeout(function () { el.classList.remove(cls); }, ms);
  }

  // ---------- HUD ----------
  function renderHud() {
    var left = Math.max(0, GAME_MS - S.elapsed);
    var secs = Math.ceil(left / 1000);
    $('time-text').textContent = secs;
    $('time-fill').style.transform = 'scaleX(' + left / GAME_MS + ')';
    hudEl.classList.toggle('urgent', left <= 10000 && left > 0);
    $('score-text').textContent = S.score;
    if (secs !== S.lastSec) {
      if (secs <= 10 && secs > 0 && S.lastSec != null) Sound.play('tick');
      S.lastSec = secs;
    }
  }

  // ---------- Targets ----------
  var targetEls = [$('target-0'), $('target-1'), $('target-2')];

  function renderTargets(advance) {
    targetEls.forEach(function (el, i) { el.textContent = S.targets[i] != null ? S.targets[i] : ''; });
    if (advance) restartAnim($('targets'), 'advance', 350);
  }

  function pick(avoid) { return L.pickTarget(S.grid, Math.random, avoid); }

  function fillTargets() {
    while (S.targets.length < QUEUE) S.targets.push(pick(S.targets[S.targets.length - 1]));
  }

  /*
   * Tiles only ever disappear, so a target that no rectangle can make now can
   * never be made later. Replace every such target in the queue (current and
   * upcoming) with one that can be made; returns the replaced indices.
   */
  function fixTargets() {
    var changed = [];
    for (var i = 0; i < S.targets.length; i++) {
      if (L.hasRect(S.grid, S.targets[i])) continue;
      S.targets[i] = pick(i > 0 ? S.targets[i - 1] : S.targets[1]);
      changed.push(i);
    }
    return changed;
  }

  var noticeTimer = 0;
  function notice(msg) {
    var el = $('notice');
    el.textContent = msg;
    el.hidden = false;
    restartAnim(el, 'show');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(function () { el.hidden = true; }, 2200);
  }

  function refillBoard(perfect) {
    if (perfect) {
      S.clears += 1;
      Sound.play('clear');
      celebratePerfect();
    } else {
      toast(t('newBoard'));
    }
    S.grid = L.createBoard(S.rows, S.cols);
    S.targets = [];
    placeAll();
    tileEls.forEach(function (el) { if (!el.classList.contains('popping')) restartAnim(el, 'drop-in', 450); });
    fillTargets();
  }

  // ---------- Game flow ----------
  function startGame() {
    Sound.unlock();
    var landscape = wantLandscape();
    S = {
      rows: landscape ? SHORT_SIDE : LONG_SIDE,
      cols: landscape ? LONG_SIDE : SHORT_SIDE,
      grid: null,
      targets: [],
      cell: 36,
      drag: null,
      score: 0, clears: 0,
      elapsed: 0, lastFrame: 0, lastSec: null,
      running: false, paused: false, over: false
    };
    S.grid = L.createBoard(S.rows, S.cols);
    fillTargets();
    clearBoardEls();
    boardEl.classList.remove('paused');
    show('game');
    layout();
    placeAll();
    renderHud();
    renderTargets(false);

    var begin = function () {
      S.running = true;
      S.lastFrame = performance.now();
      requestAnimationFrame(tick);
    };
    if (store.get('dragnum.seenRules', '0') !== '1') showRuleCard(begin);
    else begin();
  }

  function showRuleCard(done) {
    var card = $('rule-card');
    var n = 3;
    var cd = $('rule-countdown');
    cd.textContent = n;
    card.hidden = false;
    var timer = setInterval(function () {
      n -= 1;
      if (n <= 0) finish(); else cd.textContent = n;
    }, 1000);
    function finish() {
      clearInterval(timer);
      card.hidden = true;
      card.onclick = null;
      store.set('dragnum.seenRules', '1');
      done();
    }
    card.onclick = finish;
  }

  function tick(now) {
    if (!S || !S.running) return;
    if (!S.paused) {
      S.elapsed += Math.min(now - S.lastFrame, 250);
      if (S.elapsed >= GAME_MS) {
        S.elapsed = GAME_MS;
        renderHud();
        endGame();
        return;
      }
      renderHud();
    }
    S.lastFrame = now;
    requestAnimationFrame(tick);
  }

  function canPlay() { return S && S.running && !S.paused && !S.over; }

  // ---------- Drag selection (apple-game style) ----------
  // A tile is selected as soon as the dragged box overlaps any part of it
  // (the visible chip, not the gap around it).
  function localPoint(e) {
    var b = boardEl.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  }

  function chipInset() { return Math.max(2, S.cell * 0.05); } // matches .tile padding

  function cellRange(a, b) {
    var pad = padPx(), cell = S.cell, inset = chipInset();
    var x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x);
    var y1 = Math.min(a.y, b.y), y2 = Math.max(a.y, b.y);
    // Chip i spans [pad + i*cell + inset, pad + (i+1)*cell - inset].
    var rc = {
      c1: Math.max(0, Math.floor((x1 - pad + inset) / cell)),
      c2: Math.min(S.cols - 1, Math.ceil((x2 - pad - inset) / cell) - 1),
      r1: Math.max(0, Math.floor((y1 - pad + inset) / cell)),
      r2: Math.min(S.rows - 1, Math.ceil((y2 - pad - inset) / cell) - 1)
    };
    return rc.c1 <= rc.c2 && rc.r1 <= rc.r2 ? rc : null;
  }

  function updateDrag(e) {
    var d = S.drag;
    d.cur = localPoint(e);
    var x = Math.min(d.start.x, d.cur.x), y = Math.min(d.start.y, d.cur.y);
    var w = Math.abs(d.cur.x - d.start.x), h = Math.abs(d.cur.y - d.start.y);
    // Draw line-thin drags at least 8px thick so the box stays visible (selection is unaffected).
    var MIN = 8;
    var bw = Math.max(w, MIN), bh = Math.max(h, MIN);
    selEl.style.transform = 'translate(' + (x - (bw - w) / 2) + 'px,' + (y - (bh - h) / 2) + 'px)';
    selEl.style.width = bw + 'px';
    selEl.style.height = bh + 'px';

    d.rc = cellRange(d.start, d.cur);
    var stats = d.rc ? L.rectStats(S.grid, d.rc) : { sum: 0, count: 0 };
    d.stats = stats;
    var ok = stats.count >= L.CONFIG.minTiles && stats.sum === S.targets[0];
    selEl.hidden = w < 4 && h < 4;
    selEl.classList.toggle('ok', ok);
    selEl.classList.toggle('over', stats.sum > S.targets[0]);
    selSum.textContent = stats.count ? stats.sum : '';

    // Highlight the tiles inside the box.
    var inSel = new Set(d.rc ? L.tilesInRect(S.grid, d.rc).map(function (p) { return S.grid[p.r][p.c].id; }) : []);
    tileEls.forEach(function (el, id) { el.classList.toggle('in-sel', inSel.has(id)); });
  }

  function cancelDrag() {
    if (!S) return;
    S.drag = null;
    selEl.hidden = true;
    tileEls.forEach(function (el) { el.classList.remove('in-sel'); });
  }

  boardWrap.addEventListener('pointerdown', function (e) {
    if (!canPlay() || e.button > 0) return;
    e.preventDefault();
    try { boardWrap.setPointerCapture(e.pointerId); } catch (err) {}
    S.drag = { id: e.pointerId, start: localPoint(e) };
    updateDrag(e);
  });

  boardWrap.addEventListener('pointermove', function (e) {
    if (!S || !S.drag || S.drag.id !== e.pointerId) return;
    if (!canPlay()) { cancelDrag(); return; }
    updateDrag(e);
  });

  boardWrap.addEventListener('pointerup', function (e) {
    if (!S || !S.drag || S.drag.id !== e.pointerId) return;
    var d = S.drag;
    cancelDrag();
    if (!canPlay() || !d.rc || d.stats.count < L.CONFIG.minTiles) return;
    if (d.stats.sum === S.targets[0]) succeed(d.rc);
    else fail(d.rc, d.stats.sum);
  });
  boardWrap.addEventListener('pointercancel', function () { cancelDrag(); });

  function succeed(rc) {
    var cells = L.tilesInRect(S.grid, rc);
    var colors = cells.map(function (p) { return colorOf(S.grid[p.r][p.c].v); });
    cells.forEach(function (p) {
      var tile = S.grid[p.r][p.c];
      var el = tileEls.get(tile.id);
      S.grid[p.r][p.c] = null;
      el.classList.add('popping');
      setTimeout(function () { el.remove(); tileEls.delete(tile.id); }, POP_MS);
      var q = center(p);
      Confetti.small(fxLayer, q.x, q.y, colors.concat(VIVID), S.cell / 52);
    });

    // Score = number of cells cleared.
    S.score += cells.length;
    Sound.play('pop');
    var mid = center({ r: (rc.r1 + rc.r2) / 2, c: (rc.c1 + rc.c2) / 2 });
    floatText(mid.x, mid.y, '+' + cells.length);

    S.targets.shift();
    var changed = [];
    var left = L.countTiles(S.grid);
    if (left === 0) refillBoard(true);
    else if (left < L.CONFIG.minTiles) refillBoard(false);
    else {
      fillTargets();
      changed = fixTargets();
    }
    renderTargets(true);
    if (changed.length) {
      changed.forEach(function (i) { restartAnim(targetEls[i], 'changed', 600); });
      Sound.play('shuffle');
      notice(t('noCombo'));
    }
    renderHud();
  }

  function fail(rc, sum) {
    Sound.play('fail');
    L.tilesInRect(S.grid, rc).forEach(function (p) {
      restartAnim(tileEls.get(S.grid[p.r][p.c].id), 'shake', 220);
    });
    var mid = center({ r: (rc.r1 + rc.r2) / 2, c: (rc.c1 + rc.c2) / 2 });
    floatText(mid.x, mid.y, String(sum), 'bad');
  }

  // ---------- Pause / end ----------
  function pause() {
    if (!canPlay()) return;
    cancelDrag();
    S.paused = true;
    boardEl.classList.add('paused');
    $('pause-overlay').hidden = false;
  }

  function resume() {
    if (!S || !S.paused) return;
    S.paused = false;
    S.lastFrame = performance.now();
    boardEl.classList.remove('paused');
    $('pause-overlay').hidden = true;
  }

  function quit() {
    if (S) { S.running = false; S.over = true; }
    $('pause-overlay').hidden = true;
    clearBoardEls();
    S = null;
    refreshStart();
    show('start');
  }

  function endGame() {
    cancelDrag();
    S.running = false;
    S.over = true;
    Sound.play('end');
    if (S.score > getBest()) store.set('dragnum.best', String(S.score));
    setTimeout(function () {
      $('r-score').textContent = S.score;
      clearBoardEls();
      show('result');
    }, 500);
  }

  // ---------- Share ----------
  function shareImage() {
    var W = 600, H = 600;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var g = cv.getContext('2d');
    var css = function (v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); };
    g.fillStyle = css('--bg'); g.fillRect(0, 0, W, H);
    var font = getComputedStyle(document.body).fontFamily;
    // Mini logo: two chips inside a dashed selection box
    [[4, '--c4', 200], [6, '--c6', 320]].forEach(function (x) {
      g.fillStyle = css(x[1]);
      roundRect(g, x[2], 70, 80, 80, 18); g.fill();
      g.fillStyle = '#3B3530'; g.font = '900 44px ' + font; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(x[0]), x[2] + 40, 112);
    });
    g.strokeStyle = css('--accent'); g.lineWidth = 5; g.setLineDash([10, 8]);
    roundRect(g, 184, 54, 232, 112, 22); g.stroke(); g.setLineDash([]);
    g.fillStyle = css('--text'); g.textAlign = 'center';
    g.font = '900 40px ' + font; g.fillText(t('title'), W / 2, 220);
    g.fillStyle = css('--accent'); g.font = '900 150px ' + font; g.fillText(String(S.score), W / 2, 365);
    g.fillStyle = css('--muted'); g.font = '700 26px ' + font; g.fillText(t('points'), W / 2, 455);
    g.font = '500 16px ' + font;
    if (location.host) g.fillText(location.host, W / 2, 572);
    return cv;
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function share() {
    if (!S) return;
    var text = t('shareText', { score: S.score }) + ' ' + location.href;
    shareImage().toBlob(function (blob) {
      var file = blob && typeof File === 'function' ? new File([blob], 'drag-number.png', { type: 'image/png' }) : null;
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], text: text }).catch(function () {});
        return;
      }
      if (navigator.share) {
        navigator.share({ text: text }).catch(function () {});
        return;
      }
      if (blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'drag-number.png';
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      }
      if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
      toast(t('saved'));
    }, 'image/png');
  }

  // ---------- Global input ----------
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = document.querySelector('#rules-modal:not([hidden]), #settings-modal:not([hidden])');
    if (open) { open.hidden = true; return; }
    if (!$('lang-menu').hidden) { closeLang(); return; }
    if (S && !screens.game.hidden) { if (S.paused) resume(); else pause(); }
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause();
  });

  window.addEventListener('resize', function () { if (S && !S.over) { layout(); placeAll(); } });
  if (window.ResizeObserver) new ResizeObserver(function () { if (S && !S.over) layout(); }).observe(boardWrap);

  // Prevent pinch zoom on iOS where user-scalable is ignored.
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

  // ---------- Buttons ----------
  $('btn-start').addEventListener('click', startGame);
  $('btn-retry').addEventListener('click', startGame);
  $('btn-home').addEventListener('click', quit);
  $('btn-share').addEventListener('click', share);
  $('btn-pause').addEventListener('click', pause);
  $('btn-resume').addEventListener('click', resume);
  $('btn-quit').addEventListener('click', quit);

  function openModal(id) {
    closeLang();
    pause();
    $(id).hidden = false;
  }
  $('btn-rules').addEventListener('click', function () { openModal('rules-modal'); });
  $('btn-settings').addEventListener('click', function () { openModal('settings-modal'); });
  document.querySelectorAll('[data-close]').forEach(function (b) {
    b.addEventListener('click', function () { b.closest('.overlay').hidden = true; });
  });
  ['rules-modal', 'settings-modal'].forEach(function (id) {
    $(id).addEventListener('click', function (e) { if (e.target === e.currentTarget) e.currentTarget.hidden = true; });
  });

  // Settings
  var soundBox = $('set-sound');
  var volRange = $('set-volume');
  soundBox.checked = Sound.enabled;
  volRange.value = Sound.volume;
  soundBox.addEventListener('change', function () { Sound.enabled = soundBox.checked; Sound.unlock(); Sound.play('select'); });
  volRange.addEventListener('input', function () { Sound.volume = Number(volRange.value); });
  volRange.addEventListener('change', function () { Sound.unlock(); Sound.play('select'); });

  // Theme
  var darkMq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function isDark() {
    var th = document.documentElement.dataset.theme;
    return th ? th === 'dark' : !!(darkMq && darkMq.matches);
  }
  function refreshTheme() {
    var dark = isDark();
    $('btn-theme').textContent = dark ? '🌙' : '☀️';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#1F1B18' : '#FFF8F0';
  }
  $('btn-theme').addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store.set('dragnum.theme', next);
    refreshTheme();
  });
  if (darkMq && darkMq.addEventListener) darkMq.addEventListener('change', refreshTheme);

  // Language
  var langBtn = $('btn-lang');
  var langMenu = $('lang-menu');
  function closeLang() { langMenu.hidden = true; langBtn.setAttribute('aria-expanded', 'false'); }
  function refreshLangMenu() {
    langMenu.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-current', String(b.dataset.lang === I18n.lang));
    });
  }
  langBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    langMenu.hidden = !langMenu.hidden;
    langBtn.setAttribute('aria-expanded', String(!langMenu.hidden));
  });
  langMenu.addEventListener('click', function (e) {
    var b = e.target.closest('[data-lang]');
    if (!b) return;
    I18n.setLang(b.dataset.lang);
    refreshLangMenu();
    closeLang();
  });
  document.addEventListener('click', function (e) {
    if (!langMenu.hidden && !e.target.closest('.lang-wrap')) closeLang();
  });

  // ---------- Boot ----------
  I18n.apply();
  refreshLangMenu();
  refreshTheme();
  refreshStart();
  show('start');
})();
