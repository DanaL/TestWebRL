import { GameState } from "./GameState";
import { Renderer } from "./Renderer";
import { Game } from "./Game";
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

const popup = new Popup("Welcome to Snerk the Sneak", "This is just a tech demo", 3, 10, 50);
game.pushPopup(popup);

game.pushInputController(new PlayerCommandController(game));
game.state.computeFov();
game.render();

window.addEventListener("keydown", (e) => game.handleInput(e));
