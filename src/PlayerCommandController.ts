import { InputController } from "./InputController";
import { Game } from "./Game";
import { indefArticle, MOVE_KEYS } from "./Utils";
import { InventoryMenu, MenuController } from "./Inventory";
import { ExamineController } from "./ExamineController";
import { ThrowMenuController } from "./ThrowController";

export class PlayerCommandController extends InputController {
  private game: Game;

  constructor(game: Game) {
    super();
    this.game = game;
  }

  handleInput(e: KeyboardEvent): void {
    if (e.key === "x") {
      const { state } = this.game;
      const actors = state.villagers.filter(a => state.visible[`${a.x},${a.y}`]);
      const items = Object.values(state.items).filter(i => state.visible[`${i.x},${i.y}`]);
      const targets = [...actors, ...items];
      if (targets.length > 0) {
        this.game.pushInputController(new ExamineController(this.game, targets));
      } else {
        state.addMessage("There is nothing interesting to examine.");
      }
      return;
    }

    if (e.key === "t") {
      const inv = this.game.state.player.inventory;
      if (inv.length === 0) {
        this.game.state.addMessage("You have nothing to throw.");
        return;
      }
      const menu = new InventoryMenu("Throw what?", "You have nothing to throw.", inv, 3, 10);
      this.game.pushPopup(menu);
      this.game.pushInputController(new ThrowMenuController(menu, this.game));
      return;
    }

    if (e.key == "i") {
      var txt: string = "";
      for (const item of this.game.state.player.inventory) {
        txt += indefArticle(item.name) + "\n";
      }

      const popup = new InventoryMenu("Inventory", "You are empty handed.", this.game.state.player.inventory, 3, 10);
      const controller = new MenuController(popup, this.game);

      this.game.pushPopup(popup);
      this.game.pushInputController(controller);

      return;
    }

    const dir = MOVE_KEYS[e.key];
    if (dir) {
      e.preventDefault();
      this.game.state.tryMove(dir[0], dir[1], this.game, this.game.state.player);
      this.game.state.computeFov();
      this.game.state.player.endTurn();
    } else if (e.key == ' ' || e.key == '.') {
      // A pass action
      this.game.state.computeFov();
      this.game.state.player.endTurn();
    }
  }
}
