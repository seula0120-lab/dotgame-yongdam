import { LEVEL_1 } from "./levels.js";
import { PALETTE, FLOOR, WALL, FENCE, SNAIL } from "./sprites.js";
import {
  TILE,
  COLS,
  ROWS,
  parseLevel,
  createState,
  tick,
  keyToDir,
  tileAt,
  renderPos,
} from "./logic.js";

const level = parseLevel(LEVEL_1);
let state = createState(level);

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

// 이번 프레임에 새로 눌린 방향. 키 반복(event.repeat)은 버린다.
let pressed = [];
window.addEventListener("keydown", (e) => {
  const dir = keyToDir(e.code);
  if (!dir) return;
  e.preventDefault();
  if (e.repeat) return;
  pressed.push(dir);
});

function drawSprite(sprite, px, py) {
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const idx = sprite[y][x];
      if (idx < 0) continue;
      ctx.fillStyle = PALETTE[idx];
      ctx.fillRect(Math.round(px) + x, Math.round(py) + y, 1, 1);
    }
  }
}

function render() {
  ctx.fillStyle = PALETTE[3];
  ctx.fillRect(0, 0, COLS * TILE, ROWS * TILE);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = tileAt(level, x, y);
      const sprite = t === "#" ? WALL : t === "F" ? FENCE : FLOOR;
      drawSprite(sprite, x * TILE, y * TILE);
    }
  }
  const p = renderPos(state);
  drawSprite(SNAIL, p.x * TILE, p.y * TILE);
}

let last = null;
function frame(now) {
  const dt = last === null ? 0 : now - last;
  last = now;
  state = tick(state, level, pressed, dt);
  pressed = [];
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
