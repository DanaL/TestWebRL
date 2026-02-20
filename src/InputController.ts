import { Game } from "./Game";

export abstract class InputController {
  abstract handleInput(e: KeyboardEvent): void;
}

export class InfoPopupController extends InputController {
  private game: Game;
  
  constructor(game: Game) {
    super();
    this.game = game;
  }

  handleInput(_: KeyboardEvent): void {
    this.game.popPopup();
    this.game.popInputController();
  }
}
