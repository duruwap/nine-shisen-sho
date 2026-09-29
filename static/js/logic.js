/*
 * 9천성 core rules — pure functions, no DOM.
 *
 * Board model: `grid[r][c]` is either null (empty) or a tile `{ id, v }`.
 * Path finding works on a virtual padded grid where row/col -1 and
 * rows/cols are the always-empty outer ring, so edge tiles can connect
 * around the outside like classic Shisen-sho.
 */
(function (root) {
  'use strict';

  var DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]];

  var MODES = {
    normal: { target: 9, maxTurns: 2, values: [1, 2, 3, 4, 5, 6, 7, 8] },
    hard: { target: 9, maxTurns: 1, values: [1, 2, 3, 4, 5, 6, 7, 8] }
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
   * Minimum-segment BFS. Each expansion walks a straight line through empty
   * cells, so the level of a cell is the number of segments needed to reach
   * it; segments - 1 = turns. Parent pointers land exactly on the corners,
   * which is what the dotted-line renderer needs.
   *
   * Returns the list of points [start, corner..., end] in padded-grid
   * coordinates (row/col may be -1 or rows/cols), or null.
   */
  function findPath(grid, a, b, maxTurns) {
    if (a.r === b.r && a.c === b.c) return null;
    var rows = rowsOf(grid);
    var cols = colsOf(grid);
    var W = cols + 2;
    var H = rows + 2;
    var key = function (r, c) { return (r + 1) * W + (c + 1); };
    var seg = new Int8Array(W * H).fill(-1);
    var parent = new Int32Array(W * H).fill(-1);
    var maxSeg = maxTurns + 1;

    var startK = key(a.r, a.c);
    var endK = key(b.r, b.c);
    seg[startK] = 0;
    var frontier = [[a.r, a.c]];

    for (var s = 1; s <= maxSeg && frontier.length; s++) {
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
            if (!isEmpty(grid, r, c)) break;
            if (seg[k] === -1) {
              seg[k] = s;
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
    return null;
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
   * Collect connectable pairs whose values sum to `target`.
   * `limit` stops early (1 = "is there any move?").
   * When `target` is null any two tiles count (used by the swap fix).
   */
  function findPairs(grid, target, maxTurns, limit) {
    var pos = tilePositions(grid);
    var out = [];
    for (var i = 0; i < pos.length; i++) {
      var p = pos[i];
      var pv = grid[p.r][p.c].v;
      for (var j = i + 1; j < pos.length; j++) {
        var q = pos[j];
        if (target != null && pv + grid[q.r][q.c].v !== target) continue;
        var path = findPath(grid, p, q, maxTurns);
        if (path) {
          out.push({ a: p, b: q, path: path });
          if (limit && out.length >= limit) return out;
        }
      }
    }
    return out;
  }

  function hasMove(grid, mode) {
    return findPairs(grid, mode.target, mode.maxTurns, 1).length > 0;
  }

  /* Balanced deck: every pair type appears equally often (6 each for 24 pairs). */
  function makeDeck(pairCount, mode, rng) {
    var types = [];
    mode.values.forEach(function (v) {
      var w = mode.target - v;
      if (v < w && mode.values.indexOf(w) !== -1) types.push([v, w]);
    });
    var deck = [];
    for (var i = 0; i < pairCount; i++) {
      var t = types[i % types.length];
      deck.push(t[0], t[1]);
    }
    return shuffleInPlace(deck, rng);
  }

  var nextId = 1;

  function createBoard(rows, cols, mode, opts) {
    opts = opts || {};
    var rng = opts.rng || Math.random;
    var minPairs = opts.minPairs || 1;
    var best = null;
    var bestCount = -1;
    for (var attempt = 0; attempt < 200; attempt++) {
      var deck = makeDeck((rows * cols) / 2, mode, rng);
      var grid = [];
      for (var r = 0; r < rows; r++) {
        var row = [];
        for (var c = 0; c < cols; c++) row.push({ id: nextId++, v: deck[r * cols + c] });
        grid.push(row);
      }
      var n = findPairs(grid, mode.target, mode.maxTurns, minPairs).length;
      if (n >= minPairs) return grid;
      if (n > bestCount) { best = grid; bestCount = n; }
    }
    if (bestCount < 1) ensureMove(best, mode, rng);
    return best;
  }

  /*
   * Stuck handling from the spec:
   *  1) up to 10 position-only shuffles of the remaining tiles,
   *  2) otherwise pick two connectable cells p, q and swap q with a tile
   *     holding (target - p) so pair counts stay balanced.
   * Mutates `grid`. Returns 'ok' | 'shuffled' | 'fixed' | 'empty'.
   */
  function ensureMove(grid, mode, rng) {
    rng = rng || Math.random;
    var pos = tilePositions(grid);
    if (pos.length === 0) return 'empty';
    if (hasMove(grid, mode)) return 'ok';

    for (var i = 0; i < 10; i++) {
      shuffleTiles(grid, pos, rng);
      if (hasMove(grid, mode)) return 'shuffled';
    }

    var cand = findPairs(grid, null, mode.maxTurns, 1)[0];
    if (!cand) return 'shuffled';
    var p = cand.a;
    var q = cand.b;
    var want = mode.target - grid[p.r][p.c].v;
    for (var j = 0; j < pos.length; j++) {
      var t = pos[j];
      if (t.r === p.r && t.c === p.c) continue;
      if (grid[t.r][t.c].v === want) {
        var tmp = grid[q.r][q.c];
        grid[q.r][q.c] = grid[t.r][t.c];
        grid[t.r][t.c] = tmp;
        return 'fixed';
      }
    }
    return 'shuffled';
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
    MODES: MODES,
    makeRng: makeRng,
    findPath: findPath,
    findPairs: findPairs,
    hasMove: hasMove,
    makeDeck: makeDeck,
    createBoard: createBoard,
    ensureMove: ensureMove,
    transpose: transpose,
    countTiles: countTiles,
    tilePositions: tilePositions
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NineLogic = api;
})(this);
