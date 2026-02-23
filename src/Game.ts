import * as ROT from "rot-js";
import { Guard, Adventurer } from "./Actor";
import { GameState } from "./GameState";
import { Renderer } from "./Renderer";
import { InputController } from "./InputController";
import { Popup } from "./Popup";
import type Scheduler from "rot-js/lib/scheduler/scheduler";

const EggLocation = {
  Alchemist: 0,
  Mayor:  1,
  Church: 2
} as const;

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

    let eggLocation = Math.floor(ROT.RNG.getUniform() * 3);

    const scheduler = new ROT.Scheduler.Simple();
    scheduler.add(state.player, true);

    this.setupVillagers(scheduler, eggLocation);

    scheduler.add({ act: () => { state.turn++; return Promise.resolve(); } }, true);

    this.engine = new ROT.Engine(scheduler);
    this.engine.start();
  }

  private setupVillagers(scheduler: Scheduler, eggLocation: number): void {
    let guard1 = new Guard(107, 10, "#b8b5b9", "Guard");
    scheduler.add(guard1, true);
    this.state.villagers.push(guard1);
    
    let b1 = ""; 
    let b2 = ""; 
    let b3 = "";
    switch (eggLocation) {
      case 0:
        b1 = "The alchemist will make good use of the egg!";
        b2 = "The alchemist had a lot of shiny things in his shop...";
        b3 = "Can't believe we sold the egg to that dork!"
        break;
      case 1:
        b1 = "Is the mayor really going to eat the dragon egg?";
        b2 = "The mayor has a guard protecting the egg.";
        b3 = "They could have at least invited us to the feast."
        break;
      case 2:
        b1 = "What does a priest want with a dragon egg?";
        b2 = "The priest is so judgmental.";
        b3 = "I'm glad a holy man has the egg now ."
        break;
    }

    let adven1 = new Adventurer(98, 22, "#cf8acb", "Sorceress", [
      "My mana is low, but it was worth it.",
      "Another cup of wine, please.",
      "Hmm. Bloodstains on my robe.",
      b1
    ]);
    
    scheduler.add(adven1, true);
    this.state.villagers.push(adven1);

    let adven2 = new Adventurer(99, 23, "#45444f", "Rogue", [
      "I wish the kobolds had more treasure!",
      "There were so many traps.",
      "You guys were too noisy.",
      b2
    ]);
    scheduler.add(adven2, true);
    this.state.villagers.push(adven2);

    let adven3 = new Adventurer(97, 23, "#c2d368", "Warrior", [
      "God, that cave was stinky.",
      "Nothing like good ale after a dungeon crawl!",
      "Maybe I'll by a new sword.",
      b3
    ]);
    scheduler.add(adven3, true);
    this.state.villagers.push(adven3);
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
