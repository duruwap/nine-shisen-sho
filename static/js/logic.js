/*
 * 드래그 넘버 core rules — pure functions, no DOM.
 *
 * Board model: `grid[r][c]` is either null (empty) or a tile `{ id, v }`.
 * Like the apple game: drag a rectangle; if the tiles inside add up to the
 * current target they pop. Empty cells inside the rectangle count as 0.
 *
 * Targets are drawn from sums that some rectangle on the board actually
 * makes, so the current target is always playable.
 */
(function (root) {
  'use strict';

  var CONFIG = {
    values: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    minTiles: 2,     // a single tile never counts
    targetMin: 5,    // preferred target range while the board is full enough
    targetMax: 15,
    weightTiles: 3   // targets are weighted by small drags (2-3 tiles) first
  };

  function makeRng(seed) {
    if (seed == null) return Math.random;
    // mulberry32: small seeded PRNG (daily-challenge ready).
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleInPlace(arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  /* Roughly even spread of each digit (170 tiles → 18-19 of each). */
  function makeDeck(count, values, rng) {
    var deck = [];
    for (var i = 0; i < count; i++) deck.push(values[i % values.length]);
    return shuffleInPlace(deck, rng);
  }

  var nextId = 1;

  function createBoard(rows, cols, opts) {
    opts = opts || {};
    var rng = opts.rng || Math.random;
    var deck = makeDeck(rows * cols, (opts.config || CONFIG).values, rng);
    var grid = [];
    for (var r = 0; r < rows; r++) {
      var row = [];
      for (var c = 0; c < cols; c++) row.push({ id: nextId++, v: deck[r * cols + c] });
      grid.push(row);
    }
    return grid;
  }

  /* Normalize two corner cells into { r1, c1, r2, c2 } (inclusive). */
  function rect(a, b) {
    return {
      r1: Math.min(a.r, b.r), c1: Math.min(a.c, b.c),
      r2: Math.max(a.r, b.r), c2: Math.max(a.c, b.c)
    };
  }

  function rectStats(grid, rc) {
    var sum = 0, count = 0;
    for (var r = rc.r1; r <= rc.r2; r++) {
      for (var c = rc.c1; c <= rc.c2; c++) {
        var t = grid[r][c];
        if (t) { sum += t.v; count++; }
      }
    }
    return { sum: sum, count: count };
  }

  function tilesInRect(grid, rc) {
    var out = [];
    for (var r = rc.r1; r <= rc.r2; r++) {
      for (var c = rc.c1; c <= rc.c2; c++) if (grid[r][c]) out.push({ r: r, c: c });
    }
    return out;
  }

  /*
   * Visit every rectangle holding minTiles..maxTiles tiles, using 2-D prefix
   * sums (10×17 board ≈ 8k rectangles, O(1) each). `fn(sum, r1, c1, r2, c2)`
   * may return true to stop early.
   */
  function eachRect(grid, minTiles, fn, maxTiles) {
    maxTiles = maxTiles || Infinity;
    var R = grid.length, C = grid[0].length;
    var S = [], N = [];
    for (var r = 0; r <= R; r++) { S.push(new Int32Array(C + 1)); N.push(new Int32Array(C + 1)); }
    for (r = 1; r <= R; r++) {
      for (var c = 1; c <= C; c++) {
        var t = grid[r - 1][c - 1];
        S[r][c] = (t ? t.v : 0) + S[r - 1][c] + S[r][c - 1] - S[r - 1][c - 1];
        N[r][c] = (t ? 1 : 0) + N[r - 1][c] + N[r][c - 1] - N[r - 1][c - 1];
      }
    }
    for (var r1 = 0; r1 < R; r1++) {
      for (var r2 = r1; r2 < R; r2++) {
        for (var c1 = 0; c1 < C; c1++) {
          for (var c2 = c1; c2 < C; c2++) {
            var n = N[r2 + 1][c2 + 1] - N[r1][c2 + 1] - N[r2 + 1][c1] + N[r1][c1];
            if (n < minTiles || n > maxTiles) continue;
            var sum = S[r2 + 1][c2 + 1] - S[r1][c2 + 1] - S[r2 + 1][c1] + S[r1][c1];
            if (fn(sum, r1, c1, r2, c2)) return;
          }
        }
      }
    }
  }

  /* A rectangle whose tiles add up to `target`, or null. */
  function findRect(grid, target, minTiles) {
    var hit = null;
    eachRect(grid, minTiles == null ? CONFIG.minTiles : minTiles, function (sum, r1, c1, r2, c2) {
      if (sum !== target) return false;
      hit = { r1: r1, c1: c1, r2: r2, c2: c2 };
      return true;
    });
    return hit;
  }

  function hasRect(grid, target, minTiles) { return !!findRect(grid, target, minTiles); }

  /* How many rectangles make each sum: { sum: count }. */
  function sumCounts(grid, minTiles, maxTiles) {
    var counts = {};
    eachRect(grid, minTiles == null ? CONFIG.minTiles : minTiles, function (sum) {
      counts[sum] = (counts[sum] || 0) + 1;
      return false;
    }, maxTiles);
    return counts;
  }

  /*
   * Next target: a sum some rectangle makes right now, weighted by how many
   * small rectangles make it, preferring targetMin..targetMax and a different
   * value from `avoid`. Returns null when fewer than minTiles tiles remain.
   */
  function pickTarget(grid, rng, avoid, cfg) {
    rng = rng || Math.random;
    cfg = cfg || CONFIG;
    var counts = sumCounts(grid, cfg.minTiles, cfg.weightTiles);
    var sums = Object.keys(counts).map(Number);
    if (!sums.some(function (s) { return s >= cfg.targetMin && s <= cfg.targetMax; })) {
      counts = sumCounts(grid, cfg.minTiles); // sparse board: any rectangle size
      sums = Object.keys(counts).map(Number);
    }
    if (!sums.length) return null;
    var tiers = [
      sums.filter(function (s) { return s >= cfg.targetMin && s <= cfg.targetMax && s !== avoid; }),
      sums.filter(function (s) { return s >= cfg.targetMin && s <= cfg.targetMax; }),
      sums.filter(function (s) { return s !== avoid; }),
      sums
    ];
    var pool = tiers.filter(function (t) { return t.length; })[0];
    var total = pool.reduce(function (acc, s) { return acc + counts[s]; }, 0);
    var x = rng() * total;
    for (var i = 0; i < pool.length; i++) {
      x -= counts[pool[i]];
      if (x < 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  /* Rotate a rows×cols board into cols×rows (portrait ⇄ landscape). */
  function transpose(grid) {
    var out = [];
    for (var c = 0; c < grid[0].length; c++) {
      var row = [];
      for (var r = 0; r < grid.length; r++) row.push(grid[r][c]);
      out.push(row);
    }
    return out;
  }

  function countTiles(grid) {
    var n = 0;
    for (var r = 0; r < grid.length; r++) for (var c = 0; c < grid[r].length; c++) if (grid[r][c]) n++;
    return n;
  }

  var api = {
    CONFIG: CONFIG,
    makeRng: makeRng,
    makeDeck: makeDeck,
    createBoard: createBoard,
    rect: rect,
    rectStats: rectStats,
    tilesInRect: tilesInRect,
    findRect: findRect,
    hasRect: hasRect,
    sumCounts: sumCounts,
    pickTarget: pickTarget,
    transpose: transpose,
    countTiles: countTiles
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DragLogic = api;
})(this);
