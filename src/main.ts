import { GameState } from "./GameState";
import { Renderer } from "./Renderer";

const WIDTH = 80;
const HEIGHT = 32;

const state = new GameState(WIDTH, HEIGHT);
const renderer = new Renderer(WIDTH, HEIGHT, 18);

document.getElementById("app")!.appendChild(renderer.getContainer());

function render() {
  renderer.draw(state);
  renderer.drawUi(state);
}

state.computeFov();
render();

window.addEventListener("keydown", (e) => {
  const keyMap: Record<string, [number, number]> = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  };
  const dir = keyMap[e.key];
  if (!dir) return;
  e.preventDefault();
  state.tryMove(dir[0], dir[1]);
  state.computeFov();
  render();
});
