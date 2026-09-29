// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../static/js/logic.js');

const M = L.MODE;

// Build a grid from rows of digits; '.' = empty.
function g(rows) {
  let id = 1;
  return rows.map((row) => [...row].map((ch) => (ch === '.' ? null : { id: id++, v: Number(ch) })));
}

function turns(path) { return path.length - 2; }

test('adjacent tiles connect with no turns', () => {
  const grid = g(['18', '..']);
  const p = L.findPath(grid, { r: 0, c: 0 }, { r: 0, c: 1 }, 2);
  assert.ok(p);
  assert.equal(turns(p), 0);
});

test('blocked straight line needs a detour', () => {
  const grid = g(['.....', '.1x8.', '.....'].map((r) => r.replace('x', '5')));
  const p = L.findPath(grid, { r: 1, c: 1 }, { r: 1, c: 3 }, 2);
  assert.ok(p);
  assert.equal(turns(p), 2);
  assert.equal(L.findPath(grid, { r: 1, c: 1 }, { r: 1, c: 3 }, 1), null);
});

test('edge tiles connect around the outer ring', () => {
  // Both tiles on the top row, fully boxed in below and between.
  const grid = g(['1558', '5555']);
  const p = L.findPath(grid, { r: 0, c: 0 }, { r: 0, c: 3 }, 2);
  assert.ok(p);
  assert.equal(turns(p), 2);
  assert.equal(p[1].r, -1); // goes through the padded ring
});

test('L-shape is one turn', () => {
  const grid = g(['1..', '...', '..8']);
  const p = L.findPath(grid, { r: 0, c: 0 }, { r: 2, c: 2 }, 1);
  assert.ok(p);
  assert.equal(turns(p), 1);
});

test('three turns is rejected (but found when allowed)', () => {
  // Zig-zag corridor: right, down, right, down = 3 turns.
  const grid = g([
    '555555',
    '51.555',
    '55.555',
    '55..55',
    '555.55',
    '555855',
  ]);
  const a = { r: 1, c: 1 }, b = { r: 5, c: 3 };
  assert.equal(L.findPath(grid, a, b, 2), null);
  const p = L.findPath(grid, a, b, 3);
  assert.ok(p);
  assert.equal(turns(p), 3);
});

test('path points are corners only (straight runs collapsed)', () => {
  const grid = g(['1....', '.....', '....8']);
  const p = L.findPath(grid, { r: 0, c: 0 }, { r: 2, c: 4 }, 2);
  for (let i = 1; i < p.length - 1; i++) {
    const a = p[i - 1], b = p[i], c = p[i + 1];
    const d1 = [Math.sign(b.r - a.r), Math.sign(b.c - a.c)];
    const d2 = [Math.sign(c.r - b.r), Math.sign(c.c - b.c)];
    assert.notDeepEqual(d1, d2);
  }
});

test('deck is balanced: 6 of each pair type for 24 pairs', () => {
  const deck = L.makeDeck(24, M, L.makeRng(1));
  assert.equal(deck.length, 48);
  const count = (v) => deck.filter((x) => x === v).length;
  for (const [a, b] of [[1, 8], [2, 7], [3, 6], [4, 5]]) {
    assert.equal(count(a), 6);
    assert.equal(count(b), 6);
  }
});

test('first board has at least 3 connectable pairs', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const grid = L.createBoard(8, 6, M, { rng: L.makeRng(seed), minPairs: 3 });
    assert.ok(L.findPairs(grid, 9, 1, 3).length >= 3);
  }
});

test('ensureMove keeps pair counts and always leaves a move', () => {
  const rng = L.makeRng(7);
  for (let trial = 0; trial < 200; trial++) {
    // Random sparse, balanced board that is often stuck under the 1-turn rule.
    const grid = L.createBoard(8, 6, M, { rng });
    const pos = L.tilePositions(grid);
    // Remove random balanced pairs to create mid-game boards.
    const byVal = {};
    pos.forEach((p) => (byVal[grid[p.r][p.c].v] ||= []).push(p));
    const removeTypes = Math.floor(rng() * 20);
    for (let i = 0; i < removeTypes; i++) {
      const v = 1 + Math.floor(rng() * 4);
      const a = byVal[v].pop(), b = byVal[9 - v].pop();
      if (a && b) { grid[a.r][a.c] = null; grid[b.r][b.c] = null; }
    }
    const before = L.tilePositions(grid).map((p) => grid[p.r][p.c].v).sort().join();
    const res = L.ensureMove(grid, M, rng);
    const after = L.tilePositions(grid).map((p) => grid[p.r][p.c].v).sort().join();
    assert.equal(before, after);
    if (res !== 'empty') assert.ok(L.hasMove(grid, M), `trial ${trial} stuck after ${res}`);
  }
});

test('full game can always be cleared by greedy play with ensureMove', () => {
  const rng = L.makeRng(42);
  for (let game = 0; game < 40; game++) {
    const grid = L.createBoard(8, 6, M, { rng, minPairs: 3 });
    let steps = 0;
    while (L.countTiles(grid) > 0) {
      L.ensureMove(grid, M, rng);
      const [m] = L.findPairs(grid, M.target, M.maxTurns, 1);
      assert.ok(m);
      grid[m.a.r][m.a.c] = null;
      grid[m.b.r][m.b.c] = null;
      assert.ok(++steps <= 24);
    }
    assert.equal(steps, 24);
  }
});

test('transpose swaps dimensions and keeps tiles', () => {
  const grid = g(['123', '456']);
  const t = L.transpose(grid);
  assert.equal(t.length, 3);
  assert.equal(t[0].length, 2);
  assert.equal(t[2][1].v, 6);
});

test('large 14x8 board: balanced deck and always clearable', () => {
  const deck = L.makeDeck(56, M, L.makeRng(3));
  for (const v of [1, 2, 3, 4, 5, 6, 7, 8]) assert.equal(deck.filter((x) => x === v).length, 14);
  const rng = L.makeRng(99);
  for (let game = 0; game < 15; game++) {
    const grid = L.createBoard(14, 8, M, { rng, minPairs: 3 });
    assert.ok(L.findPairs(grid, 9, 1, 3).length >= 3);
    let steps = 0;
    while (L.countTiles(grid) > 0) {
      L.ensureMove(grid, M, rng);
      const [m] = L.findPairs(grid, M.target, M.maxTurns, 1);
      assert.ok(m);
      grid[m.a.r][m.a.c] = null;
      grid[m.b.r][m.b.c] = null;
      steps++;
    }
    assert.equal(steps, 56);
  }
});
