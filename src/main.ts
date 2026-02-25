import { GameState } from "./GameState";
import { Renderer } from "./Renderer";
import { Game } from "./Game";
import { InfoPopupController } from "./InputController";
import { PlayerCommandController } from "./PlayerCommandController";
import { Popup } from "./Popup";

const WIDTH = 80;
const MAP_ROWS = 32;
const NUM_MSG_ROWS = 3;
const DISPLAY_HEIGHT = 1 + MAP_ROWS + NUM_MSG_ROWS;

const state = new GameState();
state.fovRadius = Math.ceil(Math.hypot(WIDTH / 2, MAP_ROWS / 2));
const renderer = new Renderer(WIDTH, DISPLAY_HEIGHT, 18);
const game = new Game(state, renderer);

document.getElementById("app")!.appendChild(renderer.getContainer());

game.pushInputController(new PlayerCommandController(game));

// Greetings pop-up
const popup = new Popup("[#8ab060 Welcome to Snerk the Sneak!!]", "You are a small, hapless kobold tasked with sneaking into the nearby village to steal back an egg that belongs to your dragon overload! The egg was stolen by very rude adventurers and [#b45252 Skittlebix] demands its return. Be steathly, avoid the humans and return to your cave (the [#68c2d3 >]).\n\nMove around with the [#6a536e arrow keys] or [#6a536e WASD]\n\n([#6a536e i]) shows your inventory\n([#6a536e t]) lets you throw an item\n([#6a536e x]) to get info on items and creatures", 3, 10, 50);
game.pushPopup(popup);
game.pushInputController(new InfoPopupController(game));
game.state.computeFov();

window.addEventListener("keydown", (e) => { if (e.key === "Tab") e.preventDefault(); game.queueInput(e); });

let lastTime = 0;
function gameLoop(timestamp: number): void {
  const deltaMs = timestamp - lastTime;
  lastTime = timestamp;
  game.update(deltaMs);
  game.render();
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
