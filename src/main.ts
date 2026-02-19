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

const state = new GameState(WIDTH, MAP_ROWS);
const renderer = new Renderer(WIDTH, DISPLAY_HEIGHT, 18);
const game = new Game(state, renderer);

document.getElementById("app")!.appendChild(renderer.getContainer());

game.pushInputController(new PlayerCommandController(game));

// Greetings pop-up
const popup = new Popup("[#91db69 Welcome to Snerk the Sneak!!]", "This is just a tech demo for a web-based game I plan to make for the 2026 7DRL.\n\nMove around with the [#a884f3 arrow keys] or [#a884f3 WASD] and pick up treasure.", 3, 10, 50);
game.pushPopup(popup);
game.pushInputController(new InfoPopupController(game));
game.state.computeFov();

window.addEventListener("keydown", (e) => game.queueInput(e));

let lastTime = 0;
function gameLoop(timestamp: number): void {
  const deltaMs = timestamp - lastTime;
  lastTime = timestamp;
  game.update(deltaMs);
  game.render();
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
