import { GameState } from "./GameState";
import { Renderer } from "./Renderer";
import { InputController } from "./InputController";

export class Game {
  readonly state: GameState;
  readonly renderer: Renderer;

  private controllerStack: InputController[] = [];

  constructor(state: GameState, renderer: Renderer) {
    this.state = state;
    this.renderer = renderer;
  }

  push(controller: InputController): void {
    this.controllerStack.push(controller);
  }

  pop(): void {
    this.controllerStack.pop();
  }

  get currentController(): InputController | undefined {
    return this.controllerStack.at(-1);
  }

  render(): void {
    this.renderer.draw(this.state);
    this.renderer.drawUi(this.state);
  }

  handleInput(e: KeyboardEvent): void {
    this.currentController?.handleInput(e);
  }
}
