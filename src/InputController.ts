import { Game } from "./Game";

export abstract class InputController {
  abstract handleInput(e: KeyboardEvent): void;
}

export class InfoPopupController extends InputController {
  private game: Game;
  private onDismiss: (() => void) | null;

  constructor(game: Game, onDismiss: (() => void) | null = null) {
    super();
    this.game = game;
    this.onDismiss = onDismiss;
  }

  handleInput(_: KeyboardEvent): void {
    this.game.popPopup();
    this.game.popInputController();
    this.onDismiss?.();
  }
}
