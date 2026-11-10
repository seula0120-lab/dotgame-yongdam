// 순수 로직. canvas와 DOM을 모른다. GAME_DESIGN.md 2.1, 2.1.1 기준.

export const TILE = 16;
export const COLS = 16;
export const ROWS = 12;
export const SCALE = 3;
export const MOVE_MS = 600;
export const DT_CAP_MS = 100;

// 위, 아래, 왼쪽, 오른쪽 순서가 동시 입력 우선순위다 (2.1.1).
export const DIR_ORDER = ["up", "down", "left", "right"];

const DELTA = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const KEY_TO_DIR = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

// 방향키와 WASD는 같은 방향으로 합쳐 본다. event.code 기준.
export function keyToDir(code) {
  return KEY_TO_DIR[code] ?? null;
}

// 문자 격자 -> { rows, start }. 좌표를 따로 적지 않고 격자에서 읽는다.
export function parseLevel(grid) {
  let start = null;
  const rows = grid.map((line, y) => {
    const x = line.indexOf("S");
    if (x !== -1) start = { x, y };
    return line.replace("S", ".");
  });
  return { rows, start };
}

export function tileAt(level, x, y) {
  if (y < 0 || y >= level.rows.length) return null;
  if (x < 0 || x >= level.rows[y].length) return null;
  return level.rows[y][x];
}

// 바닥만 들어갈 수 있다. 벽, 울타리, 맵 가장자리 밖은 막힌다.
export function isWalkable(level, x, y) {
  return tileAt(level, x, y) === ".";
}

export function createState(level) {
  return { pos: { ...level.start }, move: null };
}

// pressed: 이번 프레임에 새로 눌린 방향 목록 (키 반복 제외는 호출 쪽).
// 이동 중 들어온 입력은 모두 버린다. 완료 프레임의 초과 시간도 버린다.
export function tick(state, level, pressed, dtMs) {
  const dt = Math.min(dtMs, DT_CAP_MS);

  if (state.move) {
    const elapsedMs = state.move.elapsedMs + dt;
    if (elapsedMs >= MOVE_MS) {
      return { pos: { ...state.move.to }, move: null };
    }
    return { pos: state.pos, move: { ...state.move, elapsedMs } };
  }

  const dir = DIR_ORDER.find((d) => pressed.includes(d));
  if (!dir) return state;
  const to = { x: state.pos.x + DELTA[dir].x, y: state.pos.y + DELTA[dir].y };
  if (!isWalkable(level, to.x, to.y)) return state;
  return { pos: state.pos, move: { from: { ...state.pos }, to, elapsedMs: 0 } };
}

// 화면용 타일 좌표. 이동 중에는 from, to 사이를 경과/600으로 선형 보간.
export function renderPos(state) {
  if (!state.move) return { x: state.pos.x, y: state.pos.y };
  const t = state.move.elapsedMs / MOVE_MS;
  const { from, to } = state.move;
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}
