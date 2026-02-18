import * as ROT from "rot-js";

const WIDTH = 80;
const HEIGHT = 32;

const display = new ROT.Display({ width: WIDTH, height: HEIGHT, fontSize: 18 });
document.getElementById("app")!.appendChild(display.getContainer()!);

// Generate map
const map: Record<string, string> = {};
const freeCells: string[] = [];

const digger = new ROT.Map.Digger(WIDTH, HEIGHT - 2);
digger.create((x, y, wall) => {
  const key = `${x},${y}`;
  if (wall) {
    map[key] = "#";
  } else {
    map[key] = ".";
    freeCells.push(key);
  }
});

// Place player on a random free cell
const playerStart = freeCells[Math.floor(ROT.RNG.getUniform() * freeCells.length)];
const [px, py] = playerStart.split(",").map(Number);
let player = { x: px, y: py };

// Place some items
const items: Record<string, string> = {};
for (let i = 0; i < 10; i++) {
  const idx = Math.floor(ROT.RNG.getUniform() * freeCells.length);
  const key = freeCells[idx];
  items[key] = "*";
}

// FOV
const fov = new ROT.FOV.PreciseShadowcasting((x, y) => {
  return map[`${x},${y}`] === ".";
});

const visible: Record<string, boolean> = {};
const explored: Record<string, boolean> = {};

function computeFov() {
  for (const k in visible) delete visible[k];
  fov.compute(player.x, player.y, 10, (x, y, _r, visibility) => {
    if (visibility) {
      const key = `${x},${y}`;
      visible[key] = true;
      explored[key] = true;
    }
  });
}

function draw() {
  display.clear();
  for (const key in map) {
    const [x, y] = key.split(",").map(Number);
    if (visible[key]) {
      const ch = items[key] || map[key];
      const fg = items[key] ? "#ff0" : map[key] === "#" ? "#888" : "#444";
      display.draw(x, y, ch, fg, null);
    } else if (explored[key]) {
      display.draw(x, y, map[key], "#222", null);
    }
  }
  display.draw(player.x, player.y, "@", "#0f0", null);
}

// Message log
let message = "Move with arrow keys or WASD. Walk over * to collect items.";
let score = 0;

function drawUi() {
  const line = `HP: 10/10  Score: ${score}  ${player.y},${player.x}  | ${message}`;
  for (let i = 0; i < Math.min(line.length, WIDTH); i++) {
    display.draw(i, HEIGHT - 1, line[i], "#aaa", "#111");
  }
}

function tryMove(dx: number, dy: number) {
  const nx = player.x + dx;
  const ny = player.y + dy;
  const key = `${nx},${ny}`;
  if (map[key] !== ".") {
    message = "Blocked!";
    return;
  }
  player = { x: nx, y: ny };
  if (items[key]) {
    score++;
    message = `Picked up an item! (${score} total)`;
    delete items[key];
  } else {
    message = "";
  }
}

window.addEventListener("keydown", (e) => {
  const keyMap: Record<string, [number, number]> = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  };
  const dir = keyMap[e.key];
  if (!dir) 
    return;
  e.preventDefault();
  tryMove(dir[0], dir[1]);
  computeFov();
  draw();
  drawUi();
});

// Initial render
computeFov();
draw();
drawUi();
