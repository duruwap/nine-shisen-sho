// Run with: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../static/js/logic.js');

// Build a grid from rows of digits; '.' = empty.
function g(rows) {
  let id = 1;
  return rows.map((row) => [...row].map((ch) => (ch === '.' ? null : { id: id++, v: Number(ch) })));
}

test('rules: digits 1-9, rectangles need at least two tiles', () => {
  assert.deepEqual(L.CONFIG.values, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(L.CONFIG.minTiles, 2);
});

test('rect normalizes any drag direction', () => {
  assert.deepEqual(L.rect({ r: 3, c: 1 }, { r: 0, c: 4 }), { r1: 0, c1: 1, r2: 3, c2: 4 });
});

test('rectStats sums tiles and treats empty cells as 0', () => {
  const grid = g(['12.', '3.4', '567']);
  assert.deepEqual(L.rectStats(grid, { r1: 0, c1: 0, r2: 1, c2: 2 }), { sum: 10, count: 4 });
  assert.deepEqual(L.rectStats(grid, { r1: 0, c1: 2, r2: 0, c2: 2 }), { sum: 0, count: 0 });
  assert.equal(L.tilesInRect(grid, { r1: 0, c1: 1, r2: 1, c2: 2 }).length, 2);
});

test('findRect matches brute force and respects minTiles', () => {
  const grid = g(['9..', '...', '..1']);
  // 9 alone is one tile: not allowed. 9 + 1 needs the full 3x3 rectangle.
  assert.equal(L.findRect(grid, 9), null);
  assert.deepEqual(L.findRect(grid, 10), { r1: 0, c1: 0, r2: 2, c2: 2 });
  const rng = L.makeRng(4);
  for (let i = 0; i < 20; i++) {
    const b = L.createBoard(6, 5, { rng });
    const target = 3 + Math.floor(rng() * 20);
    let brute = false;
    for (let r1 = 0; r1 < 6; r1++) for (let r2 = r1; r2 < 6; r2++)
      for (let c1 = 0; c1 < 5; c1++) for (let c2 = c1; c2 < 5; c2++) {
        const s = L.rectStats(b, { r1, c1, r2, c2 });
        if (s.count >= 2 && s.sum === target) brute = true;
      }
    const hit = L.findRect(b, target);
    assert.equal(!!hit, brute);
    if (hit) assert.equal(L.rectStats(b, hit).sum, target);
  }
});

test('deck spreads digits evenly: 170 tiles → 18-19 of each', () => {
  const deck = L.makeDeck(170, L.CONFIG.values, L.makeRng(1));
  for (let v = 1; v <= 9; v++) {
    const n = deck.filter((x) => x === v).length;
    assert.ok(n === 18 || n === 19, `${v}: ${n}`);
  }
});

test('pickTarget names a playable sum, in range while the board is full', () => {
  const rng = L.makeRng(5);
  for (let i = 0; i < 30; i++) {
    const grid = L.createBoard(17, 10, { rng });
    const t = L.pickTarget(grid, rng, 10);
    assert.ok(t >= 5 && t <= 15 && t !== 10);
    assert.ok(L.hasRect(grid, t));
  }
  assert.equal(L.pickTarget(g(['5..', '...']), rng), null); // one tile left
  assert.equal(L.pickTarget(g(['9.', '.9']), rng), 18);     // only sum left, out of range
});

test('a whole game with rolling targets always has a move until < 2 tiles remain', () => {
  const rng = L.makeRng(42);
  for (let game = 0; game < 10; game++) {
    const grid = L.createBoard(17, 10, { rng });
    const queue = [L.pickTarget(grid, rng), L.pickTarget(grid, rng), L.pickTarget(grid, rng)];
    let moves = 0;
    while (L.countTiles(grid) >= 2) {
      if (!L.hasRect(grid, queue[0])) queue[0] = L.pickTarget(grid, rng, queue[1]);
      const rc = L.findRect(grid, queue[0]);
      assert.ok(rc, `game ${game}: no rect for ${queue[0]}`);
      L.tilesInRect(grid, rc).forEach((p) => { grid[p.r][p.c] = null; });
      queue.shift();
      queue.push(L.pickTarget(grid, rng, queue[queue.length - 1]));
      moves++;
    }
    assert.ok(moves > 20);
  }
});

test('transpose swaps dimensions and keeps tiles', () => {
  const t = L.transpose(g(['123', '456']));
  assert.equal(t.length, 3);
  assert.equal(t[0].length, 2);
  assert.equal(t[2][1].v, 6);
});
