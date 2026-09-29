// Run with: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../static/js/logic.js');

const T = L.CONFIG.maxTurns;

// Build a grid from rows of digits; '.' = empty.
function g(rows) {
  let id = 1;
  return rows.map((row) => [...row].map((ch) => (ch === '.' ? null : { id: id++, v: Number(ch) })));
}

function turns(path) { return path.length - 2; }
function values(grid) { return L.tilePositions(grid).map((p) => grid[p.r][p.c].v).sort().join(); }

test('rules: digits 1-9, at most one turn', () => {
  assert.deepEqual(L.CONFIG.values, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(T, 1);
});

test('adjacent tiles connect with no turns', () => {
  const p = L.findPath(g(['18', '..']), { r: 0, c: 0 }, { r: 0, c: 1 }, T);
  assert.ok(p);
  assert.equal(turns(p), 0);
});

test('L-shape is one turn', () => {
  const p = L.findPath(g(['1..', '...', '..8']), { r: 0, c: 0 }, { r: 2, c: 2 }, 1);
  assert.ok(p);
  assert.equal(turns(p), 1);
});

test('blocked straight line needs two turns (rejected at one)', () => {
  const grid = g(['.....', '.151.', '.....']);
  assert.equal(L.findPath(grid, { r: 1, c: 1 }, { r: 1, c: 3 }, 1), null);
  assert.equal(turns(L.findPath(grid, { r: 1, c: 1 }, { r: 1, c: 3 }, 2)), 2);
});

test('outer ring only matters with 2+ turns; one-turn corners stay inside the board', () => {
  const grid = g(['1555', '5555', '8555']);
  const two = L.findPath(grid, { r: 0, c: 0 }, { r: 2, c: 0 }, 2);
  assert.ok(two.some((q) => q.c === -1)); // left ring
  assert.equal(L.findPath(grid, { r: 0, c: 0 }, { r: 2, c: 0 }, 1), null);
  const rng = L.makeRng(3);
  for (let i = 0; i < 20; i++) {
    const b = L.createBoard(8, 6, { rng });
    L.tilePositions(b).forEach((p) => { if (rng() < 0.5) b[p.r][p.c] = null; });
    for (const m of L.findPairs(b, null, 1, 0)) {
      assert.ok(m.path.every((q) => q.r >= 0 && q.c >= 0 && q.r < 8 && q.c < 6));
    }
  }
});

test('path points are corners only', () => {
  const p = L.findPath(g(['1....', '.....', '....8']), { r: 0, c: 0 }, { r: 2, c: 4 }, 1);
  assert.equal(p.length, 3);
});

test('reachableFrom matches pairwise findPath', () => {
  const rng = L.makeRng(11);
  for (let trial = 0; trial < 30; trial++) {
    const grid = L.createBoard(8, 6, { rng });
    // Punch random holes so paths get interesting.
    L.tilePositions(grid).forEach((p) => { if (rng() < 0.4) grid[p.r][p.c] = null; });
    const pos = L.tilePositions(grid);
    for (const a of pos) {
      const reach = new Set(L.reachableFrom(grid, a, T).map((q) => q.r + ',' + q.c));
      for (const b of pos) {
        if (a === b) continue;
        assert.equal(reach.has(b.r + ',' + b.c), !!L.findPath(grid, a, b, T));
      }
    }
  }
});

test('deck spreads digits evenly: 112 tiles → 12-13 of each', () => {
  const deck = L.makeDeck(112, L.CONFIG.values, L.makeRng(1));
  assert.equal(deck.length, 112);
  for (let v = 1; v <= 9; v++) {
    const n = deck.filter((x) => x === v).length;
    assert.ok(n === 12 || n === 13, `${v}: ${n}`);
  }
});

test('pickTarget always names a sum that can be played right now', () => {
  const rng = L.makeRng(5);
  for (let i = 0; i < 50; i++) {
    const grid = L.createBoard(14, 8, { rng });
    const target = L.pickTarget(grid, T, rng);
    assert.ok(target >= 2 && target <= 18);
    assert.ok(L.hasMove(grid, target, T));
  }
});

test('ensureMove makes any value-feasible target playable without changing tiles', () => {
  const rng = L.makeRng(7);
  for (let trial = 0; trial < 150; trial++) {
    const grid = L.createBoard(14, 8, { rng });
    L.tilePositions(grid).forEach((p) => { if (rng() < 0.8) grid[p.r][p.c] = null; });
    const target = 2 + Math.floor(rng() * 17);
    const before = values(grid);
    const res = L.ensureMove(grid, target, T, rng);
    assert.equal(values(grid), before);
    if (res === 'impossible') {
      const vs = L.tilePositions(grid).map((p) => grid[p.r][p.c].v);
      assert.ok(!vs.some((v, i) => vs.some((w, j) => i !== j && v + w === target)));
    } else if (res !== 'empty') {
      assert.ok(L.hasMove(grid, target, T), `trial ${trial}: ${res}`);
    }
  }
});

test('full game with rolling targets always clears the 14x8 board', () => {
  const rng = L.makeRng(42);
  for (let game = 0; game < 15; game++) {
    const grid = L.createBoard(14, 8, { rng });
    const queue = [L.pickTarget(grid, T, rng), L.pickTarget(grid, T, rng), L.pickTarget(grid, T, rng)];
    let steps = 0;
    while (L.countTiles(grid) > 0) {
      if (L.ensureMove(grid, queue[0], T, rng) === 'impossible') queue[0] = L.pickTarget(grid, T, rng);
      const [m] = L.findPairs(grid, queue[0], T, 1);
      assert.ok(m, `game ${game} step ${steps}: no move for ${queue[0]}`);
      grid[m.a.r][m.a.c] = null;
      grid[m.b.r][m.b.c] = null;
      queue.shift();
      if (L.countTiles(grid)) queue.push(L.pickTarget(grid, T, rng, queue[queue.length - 1]));
      steps++;
    }
    assert.equal(steps, 56);
  }
});

test('transpose swaps dimensions and keeps tiles', () => {
  const t = L.transpose(g(['123', '456']));
  assert.equal(t.length, 3);
  assert.equal(t[0].length, 2);
  assert.equal(t[2][1].v, 6);
});
