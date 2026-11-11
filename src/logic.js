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

// 문자 격자 -> { rows, start, letters, timeLimitMs }. 좌표를 따로 적지 않고 격자에서 읽는다.
// S(시작)와 L(편지)은 바닥으로 바꿔 rows에 남기고, M(우편함)은 타일로 남긴다.
export function parseLevel(grid, timeLimitMs = null) {
  let start = null;
  const letters = [];
  const rows = grid.map((line, y) =>
    [...line]
      .map((c, x) => {
        if (c === "S") start = { x, y };
        if (c === "L") letters.push({ x, y });
        return c === "S" || c === "L" ? "." : c;
      })
      .join(""),
  );
  return { rows, start, letters, timeLimitMs };
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
  return {
    pos: { ...level.start },
    move: null,
    letters: level.letters.map((l) => ({ ...l })),
    delivered: 0,
    remainingMs: level.timeLimitMs,
    status: "playing", // playing | won | lost (2.2)
  };
}

function letterIndexAt(state, x, y) {
  return state.letters.findIndex((l) => l.x === x && l.y === y);
}

// 이동 시작 판정. 막히면 null. 편지 칸이면 한 칸 민다 (2.2 밀기).
function startMove(state, level, dir) {
  const to = { x: state.pos.x + DELTA[dir].x, y: state.pos.y + DELTA[dir].y };
  const li = letterIndexAt(state, to.x, to.y);
  if (li === -1) {
    if (!isWalkable(level, to.x, to.y)) return null; // 우편함 칸도 막힘
    return { from: { ...state.pos }, to, elapsedMs: 0, push: null };
  }
  const dest = { x: to.x + DELTA[dir].x, y: to.y + DELTA[dir].y };
  const t = tileAt(level, dest.x, dest.y);
  if (t !== "." && t !== "M") return null;
  if (letterIndexAt(state, dest.x, dest.y) !== -1) return null;
  return { from: { ...state.pos }, to, elapsedMs: 0, push: { index: li, to: dest } };
}

// 이동 완료 프레임에 편지 위치를 확정하고, 우편함이면 배달한다 (2.2 D17).
function commitMove(state, level) {
  const { to, push } = state.move;
  let letters = state.letters;
  let delivered = state.delivered;
  if (push) {
    if (tileAt(level, push.to.x, push.to.y) === "M") {
      letters = letters.filter((_, i) => i !== push.index);
      delivered += 1;
    } else {
      letters = letters.map((l, i) => (i === push.index ? { ...push.to } : l));
    }
  }
  return { ...state, pos: { ...to }, move: null, letters, delivered };
}

// pressed: 이번 프레임에 새로 눌린 방향 목록 (키 반복 제외는 호출 쪽).
// 처리 순서 (2.2): 이동 진행/완료 -> 편지 확정과 배달 -> 클리어 -> 시간 감소 -> 실패.
// 이동 중 들어온 입력은 모두 버린다. 완료 프레임의 초과 시간은 이동에서만 버린다.
export function tick(state, level, pressed, dtMs) {
  if (state.status !== "playing") return state;
  const dt = Math.min(dtMs, DT_CAP_MS);

  let s = state;
  if (s.move) {
    const elapsedMs = s.move.elapsedMs + dt;
    s = elapsedMs >= MOVE_MS ? commitMove(s, level) : { ...s, move: { ...s.move, elapsedMs } };
  } else {
    const dir = DIR_ORDER.find((d) => pressed.includes(d));
    if (dir) {
      const move = startMove(s, level, dir);
      if (move) s = { ...s, move };
    }
  }

  if (level.letters.length > 0 && s.letters.length === 0) return { ...s, status: "won" };

  if (s.remainingMs === null) return s;
  const remainingMs = Math.max(0, s.remainingMs - dt);
  if (remainingMs <= 0) return { ...s, remainingMs: 0, move: null, status: "lost" };
  return { ...s, remainingMs };
}

// 화면용 타일 좌표. 이동 중에는 from, to 사이를 경과/600으로 선형 보간.
export function renderPos(state) {
  if (!state.move) return { x: state.pos.x, y: state.pos.y };
  const t = state.move.elapsedMs / MOVE_MS;
  const { from, to } = state.move;
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

// 화면용 편지 좌표. 밀리는 편지는 달팽이와 같은 0.60초 선형 (2.1.1).
export function letterPositions(state) {
  const push = state.move?.push;
  const t = state.move ? state.move.elapsedMs / MOVE_MS : 0;
  return state.letters.map((l, i) =>
    push && push.index === i
      ? { x: l.x + (push.to.x - l.x) * t, y: l.y + (push.to.y - l.y) * t }
      : { x: l.x, y: l.y },
  );
}

// 타이머 표시 값: 올림(남은 ms / 1000) (2.2).
export function timerDisplay(state) {
  return Math.ceil(state.remainingMs / 1000);
}
