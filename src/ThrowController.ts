import { InputController } from "./InputController";
import { Game } from "./Game";
import { Item } from "./Item";
import { InventoryMenu } from "./Inventory";
import { Popup } from "./Popup";
import { distance } from "./Utils";
import { TERRAIN_DEF } from "./Terrain";

const MOVE_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
};

export class ThrowMenuController extends InputController {
  private game: Game;
  private menu: InventoryMenu;
  
  constructor(menu: InventoryMenu, game: Game) {
    super();
    this.game = game;
    this.menu = menu;
  }

  handleInput(e: KeyboardEvent): void {
    if (e.key === 's' || e.key === 'ArrowDown') {
      e.preventDefault();
      this.menu.currRow = Math.min(this.menu.currRow + 1, this.menu.itemCount - 1);
    } else if (e.key === 'w' || e.key === 'ArrowUp') {
      e.preventDefault();
      this.menu.currRow = Math.max(this.menu.currRow - 1, 0);
    } else if (e.key === 'Enter') {
      const item = this.game.state.player.inventory[this.menu.currRow];
      this.game.popPopup();
      this.game.popInputController();
      this.game.pushInputController(new ThrowTargetController(this.game, item));
    } else if (e.key === 'Escape') {
      this.game.popPopup();
      this.game.popInputController();
    }
  }
}

export class ThrowTargetController extends InputController {
  private game: Game;
  private item: Item;
  private tx: number;
  private ty: number;
  private popupOpen: boolean = true;
  private readonly MAX_RANGE = 10;

  constructor(game: Game, item: Item) {
    super();
    this.game = game;
    this.item = item;
    this.tx = game.state.player.x;
    this.ty = game.state.player.y;
    game.state.throwTarget = { x: this.tx, y: this.ty };
    game.pushPopup(new Popup(
      "",
      "Move cursor to target.\n[#68c2d3 Enter] to throw. [#68c2d3 Esc] to cancel.",
      3, 3, 40
    ));
  }

  private checkMove(nx: number, ny: number): boolean {
    if (distance(this.game.state.player.x, this.game.state.player.y, nx, ny) > this.MAX_RANGE)
      return false;

    const terrain = this.game.state.map[`${nx},${ny}`];
    if (terrain === undefined || !TERRAIN_DEF[terrain].walkable)
      return false;

    return true;
  }

  handleInput(e: KeyboardEvent): void {
    if (this.popupOpen) {
      this.game.popPopup();
      this.popupOpen = false;
    }
    
    const dir = MOVE_KEYS[e.key];

    if (dir) {
      e.preventDefault();

      const nx = this.tx + dir[0];
      const ny = this.ty + dir[1];
      if (this.checkMove(nx, ny)) {
        this.tx += dir[0];
        this.ty += dir[1];
      }
      
      this.game.state.throwTarget = { x: this.tx, y: this.ty };
    } else if (e.key === 'Enter') {
      this.game.popPopup();
      this.game.state.throwTarget = null;
      this.game.popInputController();
      // TODO: implement actual throw mechanics
      this.game.state.addMessage(`You throw the ${this.item.name}.`);
    } else if (e.key === 'Escape') {
      this.game.popPopup();
      this.game.state.throwTarget = null;
      this.game.popInputController();
      this.game.state.addMessage("Cancelled.");
    }
  }
}
