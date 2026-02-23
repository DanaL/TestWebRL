import * as ROT from "rot-js";
import { Actor } from "./Actor";
import { GameState } from "./GameState";
import { Renderer } from "./Renderer";
import { InputController } from "./InputController";
import { Popup } from "./Popup";
import type Scheduler from "rot-js/lib/scheduler/scheduler";

export class Game {
  readonly state: GameState;
  readonly renderer: Renderer;

  private controllerStack: InputController[] = [];
  private popupStack: Popup[] = [];
  private inputQueue: KeyboardEvent[] = [];
  private engine: ROT.Engine;

  constructor(state: GameState, renderer: Renderer) {
    this.state = state;
    this.renderer = renderer;

    const scheduler = new ROT.Scheduler.Simple();
    scheduler.add(state.player, true);

    this.setupVillagers(scheduler);

    this.engine = new ROT.Engine(scheduler);
    this.engine.start();
  }

  private setupVillagers(scheduler: Scheduler): void {
    let guard1 = new Actor(107, 10, "Guard");
    scheduler.add(guard1, true);
    this.state.villagers.push(guard1);
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

  queueInput(e: KeyboardEvent): void {
    this.inputQueue.push(e);
  }

  get isAnimating(): boolean {
    return false; // stub — set to true while animations are playing
  }

  update(_deltaMs: number): void {
    if (!this.isAnimating && this.inputQueue.length > 0) {
      const e = this.inputQueue.shift()!;
      this.currentController?.handleInput(e);
    }
  }
}
