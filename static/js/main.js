(function () {
  'use strict';

  var L = window.NineLogic;
  var t = I18n.t;

  var GAME_MS = 120000;
  var PATH_MS = 250;
  var POP_MS = 300;
  var SHUFFLE_MS = 400;
  // Board size (tiles). Portrait uses it as-is; landscape swaps rows/cols.
  var LONG_SIDE = 14;
  var SHORT_SIDE = 8;
  var MAX_BOARD_W = 960;

  var $ = function (id) { return document.getElementById(id); };
  var screens = { start: $('screen-start'), game: $('screen-game'), result: $('screen-result') };
  var boardEl = $('board');
  var boardWrap = $('board-wrap');
  var pathLayer = $('path-layer');
  var fxLayer = $('fx-layer');
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

  function getBest() { return Number(store.get('nine.best', '0')) || 0; }

  function refreshStart() {
    $('best-score').textContent = getBest();
    I18n.setParams({ turns: L.MODE.maxTurns });
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
    // Tiles + a half-cell outer ring on each side = cols + 1 cells.
    var cell = Math.floor(Math.min(w / (S.cols + 1), h / (S.rows + 1)));
    cell = Math.max(24, Math.min(cell, 64));
    S.cell = cell;
    boardEl.style.setProperty('--cell', cell + 'px');
    boardEl.style.setProperty('--cols', S.cols);
    boardEl.style.setProperty('--rows', S.rows);
  }

  function rotateBoard() {
    S.grid = L.transpose(S.grid);
    var r = S.rows; S.rows = S.cols; S.cols = r;
    var swap = function (p) { return p ? { r: p.c, c: p.r } : p; };
    S.selected = swap(S.selected);
    S.cursor = swap(S.cursor);
    placeAll();
  }

  // ---------- Rendering ----------
  function tileEl(tile) {
    var el = tileEls.get(tile.id);
    if (el) return el;
    el = document.createElement('button');
    el.className = 'tile';
    el.type = 'button';
    el.tabIndex = -1;
    el.innerHTML = '<span class="chip v' + tile.v + '">' + tile.v + '</span>';
    el.setAttribute('aria-label', String(tile.v));
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
        el.classList.toggle('selected', !!(S.selected && S.selected.r === r && S.selected.c === c));
        el.classList.toggle('cursor', !!(S.keyboard && S.cursor.r === r && S.cursor.c === c));
        seen.add(tile.id);
      }
    }
    tileEls.forEach(function (el, id) {
      if (!seen.has(id) && !el.classList.contains('matched')) { el.remove(); tileEls.delete(id); }
    });
    updateCursorGhost();
  }

  // Keyboard cursor may sit on an empty cell; draw it with a ghost element.
  var ghost = document.createElement('div');
  ghost.className = 'tile cursor';
  ghost.style.pointerEvents = 'none';
  function updateCursorGhost() {
    var onEmpty = S && S.keyboard && !S.grid[S.cursor.r][S.cursor.c];
    if (onEmpty) {
      ghost.style.gridRow = String(S.cursor.r + 1);
      ghost.style.gridColumn = String(S.cursor.c + 1);
      if (!ghost.parentNode) boardEl.appendChild(ghost);
    } else if (ghost.parentNode) {
      ghost.remove();
    }
  }

  function clearBoardEls() {
    tileEls.forEach(function (el) { el.remove(); });
    tileEls.clear();
    pathLayer.innerHTML = '';
    fxLayer.innerHTML = '';
    if (ghost.parentNode) ghost.remove();
  }

  // Padded-grid coordinate → pixel center inside the board (ring is half a cell wide).
  function px(i, n) {
    var cell = S.cell;
    if (i < 0) return cell * 0.25;
    if (i >= n) return cell * (n + 0.75);
    return cell * (i + 1);
  }
  function center(p) { return { x: px(p.c, S.cols), y: px(p.r, S.rows) }; }

  function drawPath(points, color) {
    var ns = 'http://www.w3.org/2000/svg';
    var line = document.createElementNS(ns, 'polyline');
    line.setAttribute('class', 'path-line');
    line.setAttribute('points', points.map(function (p) { var q = center(p); return q.x + ',' + q.y; }).join(' '));
    line.style.stroke = color;
    pathLayer.appendChild(line);
    setTimeout(function () { line.remove(); }, PATH_MS + POP_MS + 50);
  }

  function colorOf(v) {
    return getComputedStyle(document.documentElement).getPropertyValue('--c' + v).trim() || '#999';
  }

  function floatText(p, text, cls) {
    var el = document.createElement('div');
    el.className = 'float-text' + (cls ? ' ' + cls : '');
    el.textContent = text;
    var q = center(p);
    el.style.left = q.x + 'px';
    el.style.top = q.y + 'px';
    fxLayer.appendChild(el);
    setTimeout(function () { el.remove(); }, 800);
  }

  // Confetti uses the popped pair's colors plus a few vivid accents.
  var VIVID = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF', '#FF9F45'];
  function palette() {
    var out = VIVID.slice();
    for (var v = 1; v <= 8; v++) out.push(colorOf(v));
    return out;
  }

  function burst(p, colors) {
    var q = center(p);
    Confetti.small(fxLayer, q.x, q.y, colors.concat(VIVID), S.cell / 52);
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

  // Shuffle: FLIP each tile from its old spot to the new one with a spin.
  function animateShuffle() {
    var before = new Map();
    tileEls.forEach(function (el, id) { before.set(id, el.getBoundingClientRect()); });
    placeAll();
    tileEls.forEach(function (el, id) {
      var a = before.get(id);
      if (!a || el.classList.contains('matched')) return;
      var b = el.getBoundingClientRect();
      el.style.transition = 'none';
      el.style.transform = 'translate(' + (a.left - b.left) + 'px,' + (a.top - b.top) + 'px)';
      void el.offsetWidth;
      el.style.transition = 'transform ' + SHUFFLE_MS + 'ms cubic-bezier(.4,.1,.3,1)';
      el.style.transform = '';
      restartAnim(el, 'spin', SHUFFLE_MS);
      setTimeout(function () { el.style.transition = ''; }, SHUFFLE_MS);
    });
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

  // ---------- Game flow ----------
  function newGrid(rows, cols) {
    return L.createBoard(rows, cols, L.MODE, { minPairs: 3 });
  }

  function startGame() {
    Sound.unlock();
    var landscape = wantLandscape();
    S = {
      mode: L.MODE,
      rows: landscape ? SHORT_SIDE : LONG_SIDE,
      cols: landscape ? LONG_SIDE : SHORT_SIDE,
      grid: null,
      cell: 52,
      selected: null,
      cursor: { r: 0, c: 0 },
      keyboard: false,
      score: 0, pairs: 0, clears: 0,
      elapsed: 0, lastFrame: 0, lastSec: null,
      running: false, paused: false, over: false
    };
    S.grid = newGrid(S.rows, S.cols);
    clearBoardEls();
    boardEl.classList.remove('paused');
    show('game');
    layout();
    placeAll();
    renderHud();

    var begin = function () {
      S.running = true;
      S.lastFrame = performance.now();
      requestAnimationFrame(tick);
    };
    if (store.get('nine.seenRules', '0') !== '1') showRuleCard(begin);
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
      store.set('nine.seenRules', '1');
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

  function select(r, c) {
    if (!canPlay()) return;
    var tile = S.grid[r][c];
    if (!tile) return;
    var sel = S.selected;
    if (!sel) {
      S.selected = { r: r, c: c };
      Sound.play('select');
      placeAll();
      return;
    }
    if (sel.r === r && sel.c === c) {
      S.selected = null;
      placeAll();
      return;
    }
    var a = sel;
    var b = { r: r, c: c };
    var va = S.grid[a.r][a.c].v;
    var sum = va + tile.v;
    var path = sum === S.mode.target ? L.findPath(S.grid, a, b, S.mode.maxTurns) : null;
    S.selected = null;
    if (path) succeed(a, b, path);
    else fail(a, b, sum);
  }

  function succeed(a, b, path) {
    var ta = S.grid[a.r][a.c];
    var tb = S.grid[b.r][b.c];
    var elA = tileEls.get(ta.id);
    var elB = tileEls.get(tb.id);
    S.grid[a.r][a.c] = null;
    S.grid[b.r][b.c] = null;

    // Score = number of cells cleared.
    S.score += 2;
    S.pairs += 1;

    [elA, elB].forEach(function (el) { el.classList.add('matched'); el.classList.remove('selected'); });
    drawPath(path, colorOf(ta.v));
    placeAll();

    setTimeout(function () {
      Sound.play('pop');
      [[elA, a, ta], [elB, b, tb]].forEach(function (x) {
        x[0].classList.add('popping');
        burst(x[1], [colorOf(ta.v), colorOf(tb.v)]);
      });
      floatText(b, '+2');
      setTimeout(function () {
        [elA, elB].forEach(function (el) { el.remove(); tileEls.delete(el._tile.id); });
      }, POP_MS);
    }, PATH_MS);

    if (L.countTiles(S.grid) === 0) {
      S.clears += 1;
      setTimeout(function () {
        if (!S || S.over) return;
        Sound.play('clear');
        celebratePerfect();
        S.grid = newGrid(S.rows, S.cols);
        S.selected = null;
        placeAll();
        tileEls.forEach(function (el) { restartAnim(el, 'spin', SHUFFLE_MS); });
      }, PATH_MS + POP_MS);
    } else {
      var res = L.ensureMove(S.grid, S.mode);
      if (res === 'shuffled' || res === 'fixed') {
        Sound.play('shuffle');
        toast(t('shuffling'));
        animateShuffle();
      }
    }
    renderHud();
  }

  function fail(a, b, sum) {
    Sound.play('fail');
    [a, b].forEach(function (p) {
      var el = tileEls.get(S.grid[p.r][p.c].id);
      restartAnim(el, 'shake', 220);
    });
    if (sum !== S.mode.target) floatText(b, String(sum), 'bad');
    placeAll();
  }

  function pause() {
    if (!canPlay()) return;
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
    S.running = false;
    S.over = true;
    S.selected = null;
    Sound.play('end');
    if (S.score > getBest()) store.set('nine.best', String(S.score));
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
    // Mini logo chips
    [[4, '--c4', 190], [5, '--c5', 330]].forEach(function (x) {
      g.fillStyle = css(x[1]);
      roundRect(g, x[2], 70, 80, 80, 18); g.fill();
      g.fillStyle = '#3B3530'; g.font = '900 44px ' + font; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(x[0]), x[2] + 40, 112);
    });
    g.strokeStyle = css('--text'); g.lineWidth = 6; g.setLineDash([3, 12]); g.lineCap = 'round';
    g.beginPath(); g.moveTo(270, 110); g.lineTo(330, 110); g.stroke(); g.setLineDash([]);
    g.fillStyle = css('--text'); g.textAlign = 'center';
    g.font = '900 40px ' + font; g.fillText(t('title'), W / 2, 210);
    g.fillStyle = css('--accent'); g.font = '900 150px ' + font; g.fillText(String(S.score), W / 2, 360);
    g.fillStyle = css('--muted'); g.font = '700 26px ' + font; g.fillText(t('points'), W / 2, 450);
    g.fillStyle = css('--muted'); g.font = '500 16px ' + font; g.fillText(location.host || 'nine.duruwap.com', W / 2, 572);
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
      var file = blob && typeof File === 'function' ? new File([blob], 'nine-link.png', { type: 'image/png' }) : null;
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
        a.download = 'nine-link.png';
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      }
      if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
      toast(t('saved'));
    }, 'image/png');
  }

  // ---------- Input ----------
  boardEl.addEventListener('click', function (e) {
    var el = e.target.closest('.tile');
    if (!el || el === ghost || el.classList.contains('matched')) return;
    if (S) {
      S.keyboard = false;
      S.cursor = { r: el._r, c: el._c };
    }
    select(el._r, el._c);
  });

  document.addEventListener('keydown', function (e) {
    var gameOn = S && !screens.game.hidden;
    if (e.key === 'Escape') {
      var open = document.querySelector('#rules-modal:not([hidden]), #settings-modal:not([hidden])');
      if (open) { open.hidden = true; return; }
      if (!$('lang-menu').hidden) { closeLang(); return; }
      if (gameOn) { if (S.paused) resume(); else pause(); }
      return;
    }
    if (!gameOn || !canPlay()) return;
    var dir = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
    if (dir) {
      e.preventDefault();
      if (S.keyboard) {
        S.cursor = {
          r: Math.max(0, Math.min(S.rows - 1, S.cursor.r + dir[0])),
          c: Math.max(0, Math.min(S.cols - 1, S.cursor.c + dir[1]))
        };
      }
      S.keyboard = true;
      placeAll();
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      S.keyboard = true;
      select(S.cursor.r, S.cursor.c);
      placeAll();
    }
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause();
  });

  window.addEventListener('resize', function () { if (S && !S.over) { layout(); placeAll(); } });
  if (window.ResizeObserver) new ResizeObserver(function () { if (S && !S.over) layout(); }).observe(boardWrap);

  // Prevent pinch/double-tap zoom on iOS where user-scalable is ignored.
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  var lastTouch = 0;
  document.addEventListener('touchend', function (e) {
    var now = Date.now();
    if (now - lastTouch < 300 && e.target.closest('.board')) e.preventDefault();
    lastTouch = now;
  }, { passive: false });

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
    store.set('nine.theme', next);
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
