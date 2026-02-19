import { InputController } from "./InputController";
import { Game } from "./Game";

const MOVE_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
};

export class PlayerCommandController extends InputController {
  private game: Game;

  constructor(game: Game) {
    super();
    this.game = game;
  }

  handleInput(e: KeyboardEvent): void {
    const dir = MOVE_KEYS[e.key];
    if (!dir) return;

    e.preventDefault();
    this.game.state.tryMove(dir[0], dir[1]);
    this.game.state.computeFov();
  }
}
