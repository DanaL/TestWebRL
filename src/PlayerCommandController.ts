import { InputController } from "./InputController";
import { Game } from "./Game";
import { indefArticle } from "./Utils";
import { InventoryMenu, MenuController } from "./Inventory";

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
    if (e.key == "i") {
      var txt: string = "";
      for (const item of this.game.state.player.inventory) {
        txt += indefArticle(item) + "\n";
      }

      //const popup = new InventoryMenu("Inventory", txt.trim(), 3, 10, 30);
      const popup = new InventoryMenu("Inventory", "You are empty handed.", this.game.state.player.inventory, 3, 10);
      const controller = new MenuController(popup, this.game);

      this.game.pushPopup(popup);
      this.game.pushInputController(controller);

      return;
    }

    const dir = MOVE_KEYS[e.key];
    if (dir) {
      e.preventDefault();
      this.game.state.tryMove(dir[0], dir[1]);
      this.game.state.computeFov();
    }
  }
}
