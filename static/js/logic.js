/*
 * 넘버 사천성 core rules — pure functions, no DOM.
 *
 * Board model: `grid[r][c]` is either null (empty) or a tile `{ id, v }`.
 * Path finding works on a virtual padded grid where row/col -1 and
 * rows/cols are the always-empty outer ring, so edge tiles can connect
 * around the outside like classic Shisen-sho.
 *
 * Each move has a target sum. Targets are drawn from pairs that are
 * connectable on the board, so a move always exists (see ensureMove).
 */
(function (root) {
  'use strict';

  var DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]];

  // Digits 1-9 on the tiles, path may turn at most once.
  var CONFIG = { maxTurns: 1, values: [1, 2, 3, 4, 5, 6, 7, 8, 9] };

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

  function rowsOf(grid) { return grid.length; }
  function colsOf(grid) { return grid[0].length; }

  function inPadded(grid, r, c) {
    return r >= -1 && c >= -1 && r <= rowsOf(grid) && c <= colsOf(grid);
  }

  function isEmpty(grid, r, c) {
    if (r < 0 || c < 0 || r >= rowsOf(grid) || c >= colsOf(grid)) return true;
    return grid[r][c] == null;
  }

  /*
   * Minimum-segment BFS from `a`. Each expansion walks a straight line through
   * empty cells, so a cell's level is the number of segments needed to reach
   * it (segments - 1 = turns). Parent pointers land exactly on the corners.
   *
   * With `b` set, returns the path [a, corner..., b] (padded coordinates) or
   * null. Without `b`, returns every tile position reachable from `a`.
   */
  function search(grid, a, b, maxTurns) {
    var W = colsOf(grid) + 2;
    var H = rowsOf(grid) + 2;
    var key = function (r, c) { return (r + 1) * W + (c + 1); };
    var seen = new Uint8Array(W * H);
    var parent = new Int32Array(W * H).fill(-1);
    var hits = b ? null : [];
    var startK = key(a.r, a.c);
    var endK = b ? key(b.r, b.c) : -1;
    seen[startK] = 1;
    var frontier = [[a.r, a.c]];

    for (var s = 1; s <= maxTurns + 1 && frontier.length; s++) {
      var next = [];
      for (var i = 0; i < frontier.length; i++) {
        var fr = frontier[i][0];
        var fc = frontier[i][1];
        var fk = key(fr, fc);
        for (var d = 0; d < 4; d++) {
          var r = fr + DIRS[d][0];
          var c = fc + DIRS[d][1];
          while (inPadded(grid, r, c)) {
            var k = key(r, c);
            if (k === endK) {
              parent[k] = fk;
              return buildPath(parent, k, startK, W);
            }
            if (!isEmpty(grid, r, c)) {
              if (hits && !seen[k]) { seen[k] = 1; hits.push({ r: r, c: c }); }
              break;
            }
            if (!seen[k]) {
              seen[k] = 1;
              parent[k] = fk;
              next.push([r, c]);
            }
            r += DIRS[d][0];
            c += DIRS[d][1];
          }
        }
      }
      frontier = next;
    }
    return hits;
  }

  function findPath(grid, a, b, maxTurns) {
    if (a.r === b.r && a.c === b.c) return null;
    return search(grid, a, b, maxTurns);
  }

  function reachableFrom(grid, a, maxTurns) {
    return search(grid, a, null, maxTurns);
  }

  function buildPath(parent, k, startK, W) {
    var pts = [];
    while (k !== -1) {
      pts.push({ r: Math.floor(k / W) - 1, c: (k % W) - 1 });
      if (k === startK) break;
      k = parent[k];
    }
    return pts.reverse();
  }

  function tilePositions(grid) {
    var out = [];
    for (var r = 0; r < grid.length; r++) {
      for (var c = 0; c < grid[r].length; c++) {
        if (grid[r][c]) out.push({ r: r, c: c });
      }
    }
    return out;
  }

  /*
   * Connectable pairs whose values sum to `target` (any sum when null).
   * One BFS per tile. `limit` stops early (1 = "is there any move?").
   */
  function findPairs(grid, target, maxTurns, limit) {
    var pos = tilePositions(grid);
    var cols = colsOf(grid);
    var out = [];
    for (var i = 0; i < pos.length; i++) {
      var p = pos[i];
      var pv = grid[p.r][p.c].v;
      var reach = reachableFrom(grid, p, maxTurns);
      for (var j = 0; j < reach.length; j++) {
        var q = reach[j];
        if (q.r * cols + q.c <= p.r * cols + p.c) continue; // each pair once
        if (target != null && pv + grid[q.r][q.c].v !== target) continue;
        out.push({ a: p, b: q, path: findPath(grid, p, q, maxTurns) });
        if (limit && out.length >= limit) return out;
      }
    }
    return out;
  }

  function hasMove(grid, target, maxTurns) {
    return findPairs(grid, target, maxTurns, 1).length > 0;
  }

  /* Pick the next target: the sum of a random connectable pair. */
  function pickTarget(grid, maxTurns, rng, avoid) {
    rng = rng || Math.random;
    var pos = shuffleInPlace(tilePositions(grid), rng);
    var fallback = null;
    for (var i = 0; i < pos.length; i++) {
      var reach = reachableFrom(grid, pos[i], maxTurns);
      if (!reach.length) continue;
      var q = reach[Math.floor(rng() * reach.length)];
      var sum = grid[pos[i].r][pos[i].c].v + grid[q.r][q.c].v;
      if (sum !== avoid) return sum;
      if (fallback == null) fallback = sum;
      if (i > 8) break;
    }
    return fallback;
  }

  /* Roughly even spread of each digit (112 tiles → 12-13 of each). */
  function makeDeck(count, values, rng) {
    var deck = [];
    for (var i = 0; i < count; i++) deck.push(values[i % values.length]);
    return shuffleInPlace(deck, rng);
  }

  var nextId = 1;

  function createBoard(rows, cols, opts) {
    opts = opts || {};
    var rng = opts.rng || Math.random;
    var cfg = opts.config || CONFIG;
    for (;;) {
      var deck = makeDeck(rows * cols, cfg.values, rng);
      var grid = [];
      for (var r = 0; r < rows; r++) {
        var row = [];
        for (var c = 0; c < cols; c++) row.push({ id: nextId++, v: deck[r * cols + c] });
        grid.push(row);
      }
      if (hasMove(grid, null, cfg.maxTurns)) return grid;
    }
  }

  /*
   * Make sure a pair summing to `target` can be connected. Mutates `grid`.
   *  1) up to 10 position-only shuffles of the remaining tiles,
   *  2) otherwise move two tiles x + y = target onto a connectable pair of cells.
   * Tile values never change, only positions.
   * Returns 'ok' | 'shuffled' | 'fixed' | 'impossible' | 'empty'.
   * 'impossible' means no two remaining tiles add up to `target`.
   */
  function ensureMove(grid, target, maxTurns, rng) {
    rng = rng || Math.random;
    var pos = tilePositions(grid);
    if (pos.length === 0) return 'empty';
    if (hasMove(grid, target, maxTurns)) return 'ok';

    var xy = findValuePair(grid, pos, target);
    if (!xy) return 'impossible';

    for (var i = 0; i < 10; i++) {
      shuffleTiles(grid, pos, rng);
      if (hasMove(grid, target, maxTurns)) return 'shuffled';
    }

    var cells = findPairs(grid, null, maxTurns, 1)[0];
    if (!cells) return 'shuffled';
    xy = findValuePair(grid, pos, target);
    var px = xy[0];
    var py = xy[1];
    swap(grid, cells.a, px);
    if (py.r === cells.a.r && py.c === cells.a.c) py = px;
    swap(grid, cells.b, py);
    return 'fixed';
  }

  function findValuePair(grid, pos, target) {
    var byVal = {};
    for (var i = 0; i < pos.length; i++) {
      var v = grid[pos[i].r][pos[i].c].v;
      var w = target - v;
      var partner = byVal[w];
      if (partner && partner.length) return [partner[0], pos[i]];
      (byVal[v] = byVal[v] || []).push(pos[i]);
    }
    return null;
  }

  function swap(grid, p, q) {
    var tmp = grid[p.r][p.c];
    grid[p.r][p.c] = grid[q.r][q.c];
    grid[q.r][q.c] = tmp;
  }

  function shuffleTiles(grid, pos, rng) {
    var tiles = pos.map(function (p) { return grid[p.r][p.c]; });
    shuffleInPlace(tiles, rng);
    pos.forEach(function (p, i) { grid[p.r][p.c] = tiles[i]; });
  }

  /* Rotate a rows×cols board into cols×rows (portrait ⇄ landscape). */
  function transpose(grid) {
    var out = [];
    for (var c = 0; c < colsOf(grid); c++) {
      var row = [];
      for (var r = 0; r < rowsOf(grid); r++) row.push(grid[r][c]);
      out.push(row);
    }
    return out;
  }

  function countTiles(grid) { return tilePositions(grid).length; }

  var api = {
    CONFIG: CONFIG,
    makeRng: makeRng,
    findPath: findPath,
    reachableFrom: reachableFrom,
    findPairs: findPairs,
    hasMove: hasMove,
    pickTarget: pickTarget,
    makeDeck: makeDeck,
    createBoard: createBoard,
    ensureMove: ensureMove,
    transpose: transpose,
    countTiles: countTiles,
    tilePositions: tilePositions
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NumberLogic = api;
})(this);
