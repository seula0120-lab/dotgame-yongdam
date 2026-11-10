import test from "node:test";
import assert from "node:assert/strict";
import { LEVEL_1 } from "../src/levels.js";
import { PALETTE, FLOOR, WALL, FENCE, SNAIL } from "../src/sprites.js";
import {
  TILE,
  COLS,
  ROWS,
  SCALE,
  parseLevel,
  createState,
  tick,
  keyToDir,
  renderPos,
} from "../src/logic.js";

// 기대값은 GAME_DESIGN.md 숫자: 0.60초/칸, 16x16 타일, 16x12칸, 256x192, 768x576.

function run(state, level, ms, step = 50) {
  let s = state;
  for (let t = 0; t < ms; t += step) s = tick(s, level, [], step);
  return s;
}

const level1 = parseLevel(LEVEL_1);

test("논리 해상도 256x192, 표시 768x576 (2.1, R1-3, R1-4)", () => {
  assert.equal(COLS * TILE, 256);
  assert.equal(ROWS * TILE, 192);
  assert.equal(COLS * TILE * SCALE, 768);
  assert.equal(ROWS * TILE * SCALE, 576);
});

test("레벨 1 격자는 16열 x 12행이고 시작 칸은 한 곳 (5장)", () => {
  assert.equal(level1.rows.length, 12);
  for (const row of level1.rows) assert.equal(row.length, 16);
  assert.deepEqual(level1.start, { x: 4, y: 4 });
});

test("한 번 누르면 정확히 한 칸, 600ms에 도착. 599ms는 미완료 (R1-1)", () => {
  let s = createState(level1);
  s = tick(s, level1, ["up"], 0);
  assert.deepEqual(s.move.to, { x: 4, y: 3 });
  // 599ms = 100*5 + 99
  for (let i = 0; i < 5; i++) s = tick(s, level1, [], 100);
  s = tick(s, level1, [], 99);
  assert.notEqual(s.move, null);
  assert.deepEqual(s.pos, { x: 4, y: 4 });
  s = tick(s, level1, [], 1);
  assert.equal(s.move, null);
  assert.deepEqual(s.pos, { x: 4, y: 3 });
});

test("이동 중 화면 위치는 경과/600 선형 (2.1.1)", () => {
  let s = tick(createState(level1), level1, ["right"], 0);
  s = run(s, level1, 300);
  assert.deepEqual(renderPos(s), { x: 4.5, y: 4 });
});

test("이동 중 들어온 입력은 모두 무시하고, 끝난 뒤 따로 누르지 않으면 더 가지 않는다", () => {
  let s = tick(createState(level1), level1, ["up"], 0);
  s = tick(s, level1, ["left"], 100);
  s = run(s, level1, 600);
  assert.deepEqual(s.pos, { x: 4, y: 3 });
  assert.equal(s.move, null);
});

test("프레임 시간 상한 100ms: 아주 큰 dt도 100ms만 진행 (2.1.1)", () => {
  let s = tick(createState(level1), level1, ["up"], 0);
  s = tick(s, level1, [], 10000);
  assert.equal(s.move.elapsedMs, 100);
  assert.deepEqual(s.pos, { x: 4, y: 4 });
});

test("울타리 쪽 입력은 이동하지 않는다 (R1-2)", () => {
  // (3,4)에서 위 (3,3)은 울타리 F
  let s = tick(createState(level1), level1, ["left"], 0);
  s = run(s, level1, 600);
  assert.deepEqual(s.pos, { x: 3, y: 4 });
  const blocked = tick(s, level1, ["up"], 0);
  assert.equal(blocked.move, null);
  assert.deepEqual(blocked.pos, { x: 3, y: 4 });
});

test("벽 쪽 입력은 이동하지 않는다 (R1-2)", () => {
  const lv = parseLevel(["S#"]);
  assert.equal(tick(createState(lv), lv, ["right"], 0).move, null);
  // 레벨 1: (1,1)에서 위 (1,0)는 바깥 테두리 벽
  let s = createState(level1);
  s = { pos: { x: 1, y: 1 }, move: null };
  assert.equal(tick(s, level1, ["up"], 0).move, null);
});

test("맵 가장자리 밖 입력은 이동하지 않는다 (R1-2)", () => {
  const lv = parseLevel(["S."]);
  for (const dir of ["left", "up", "down"]) {
    const s = tick(createState(lv), lv, [dir], 0);
    assert.equal(s.move, null, dir);
  }
});

test("여러 방향 동시 입력은 위, 아래, 왼쪽, 오른쪽 순으로 우선 (2.1.1)", () => {
  const lv = parseLevel(["...", ".S.", "..."]);
  const pick = (dirs) => tick(createState(lv), lv, dirs, 0).move.to;
  assert.deepEqual(pick(["right", "left", "down", "up"]), { x: 1, y: 0 });
  assert.deepEqual(pick(["right", "left", "down"]), { x: 1, y: 2 });
  assert.deepEqual(pick(["right", "left"]), { x: 0, y: 1 });
  assert.deepEqual(pick(["right"]), { x: 2, y: 1 });
});

test("WASD는 같은 방향의 방향키와 같다 (R1-1)", () => {
  const pairs = [
    ["KeyW", "ArrowUp", "up"],
    ["KeyS", "ArrowDown", "down"],
    ["KeyA", "ArrowLeft", "left"],
    ["KeyD", "ArrowRight", "right"],
  ];
  for (const [wasd, arrow, dir] of pairs) {
    assert.equal(keyToDir(wasd), dir);
    assert.equal(keyToDir(arrow), dir);
  }
  assert.equal(keyToDir("Space"), null);
  assert.equal(keyToDir("KeyR"), null);
});

test("스프라이트는 16x16이고 색은 6장 8색 인덱스뿐 (R1-4, R1-5)", () => {
  assert.equal(PALETTE.length, 8);
  for (const sp of [FLOOR, WALL, FENCE, SNAIL]) {
    assert.equal(sp.length, TILE);
    for (const row of sp) {
      assert.equal(row.length, TILE);
      for (const idx of row) assert.ok(idx >= -1 && idx <= 7 && Number.isInteger(idx));
    }
  }
});
