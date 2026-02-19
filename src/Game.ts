import { GameState } from "./GameState";
import { Renderer } from "./Renderer";
import { InputController } from "./InputController";
import { Popup } from "./Popup";

export class Game {
  readonly state: GameState;
  readonly renderer: Renderer;

  private controllerStack: InputController[] = [];
  private popupStack: Popup[] = [];

  constructor(state: GameState, renderer: Renderer) {
    this.state = state;
    this.renderer = renderer;
  }

  pushInputController(controller: InputController): void {
    this.controllerStack.push(controller);
  }

  popInputController(): void {
    this.controllerStack.pop();
  }

  pushPopup(popup: Popup): void {
    this.popupStack.push(popup);
  }

  popPopup(): void {
    this.popupStack.pop();
  }

  get currentController(): InputController | undefined {
    return this.controllerStack.at(-1);
  }

  render(): void {
    this.renderer.drawGameArea(this.state);
    this.renderer.drawUi(this.state);
    for (const popup of this.popupStack) {
      popup.draw(this.renderer);
    }
  }

  handleInput(e: KeyboardEvent): void {
    this.currentController?.handleInput(e);
  }
}
