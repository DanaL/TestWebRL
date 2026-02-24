import * as ROT from "rot-js";
import { Guard, Adventurer, Barmaid, Barfly, ActorState } from "./Actor";
import { GameState } from "./GameState";
import { Renderer } from "./Renderer";
import { InputController } from "./InputController";
import { Popup } from "./Popup";
import { Item } from "./Item";
import type Scheduler from "rot-js/lib/scheduler/scheduler";

export class Game {
  readonly state: GameState;
  readonly renderer: Renderer;

  private controllerStack: InputController[] = [];
  private popupStack: Popup[] = [];
  private inputQueue: KeyboardEvent[] = [];
  private engine: ROT.Engine;
  readonly scheduler: Scheduler;

  constructor(state: GameState, renderer: Renderer) {
    this.state = state;
    this.renderer = renderer;

    let eggLocation = Math.floor(ROT.RNG.getUniform() * 3);
    eggLocation = 1;
    this.scheduler = new ROT.Scheduler.Simple();
    const scheduler = this.scheduler;
    scheduler.add(state.player, true);

    this.setupVillagers(scheduler, state, eggLocation);
    this.placeEgg(state, eggLocation);

    scheduler.add({ act: () => { state.turn++; return Promise.resolve(); } }, true);

    this.engine = new ROT.Engine(scheduler);
    this.engine.start();
  }

  private placeEgg(state: GameState, eggLocation: number): void {
    let x: number;
    let y: number;
    switch (eggLocation) {
      case 0: // alchemist        
        x = 134;
        y = 32;
        break;
      case 1: // mayor
        x = 180;
        y = 25;
        break;
      default: // temple
        x = 161;
        y = 6;
        break;
    }

    let egg = new Item(x, y, "dragon egg", "A leathery egg emanating warmth and a faint glow.", "O", "#f2f0e5");
    state.items[`${x},${y}`] = egg;
  }

  private setupVillagers(scheduler: Scheduler, gs: GameState, eggLocation: number): void {    
    const patrolPath: [number, number][] = [
      [107, 10], [135, 10], [135, 11], [140, 11], [140, 12], [141, 12],
      [141, 24], [132, 24], [132, 25], [131, 25], [131, 26], [123, 26],
      [123, 23], [115, 23], [115, 20], [113, 20], [113, 19], [107, 19],
    ];
    let guard1 = new Guard(107, 10, "#b8b5b9", "Guard", ActorState.Patrolling, gs, patrolPath);
    guard1.description = "A stinky human who's carrying a sword.";    
    scheduler.add(guard1, true);
    this.state.villagers.push(guard1);
    
    let guard2 = new Guard(160, 12, "#b8b5b9", "Guard", ActorState.Guarding, gs);
    guard2.description = "A stinky human who's holding a spear.";    
    guard2.facingDx = 0;
    guard2.facingDy = 1;
    scheduler.add(guard2, true);
    this.state.villagers.push(guard2);

    let guard3 = new Guard(168, 20, "#b8b5b9", "Guard", ActorState.Guarding, gs);
    guard3.description = "A stinky human who's holding a club.";
    guard3.facingDx = 0;
    guard3.facingDy = -1;
    scheduler.add(guard3, true);
    this.state.villagers.push(guard3);

    let guard4 = new Guard(182, 26, "#b8b5b9", "Guard", ActorState.Guarding, gs);
    guard4.description = "A stinky human with a guisarme.";
    guard4.facingDx = -1;
    guard4.facingDy = -1;
    scheduler.add(guard4, true);
    this.state.villagers.push(guard4);

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

    let adven1 = new Adventurer(97, 23, "#cf8acb", "Sorceress", [
      "My mana is low, but it was worth it.",
      "Another cup of wine, please.",
      "Hmm. Bloodstains on my robe.",
      b1
    ], gs);
    
    adven1.description = "One of the stinky humans what robbed your clan.";
    scheduler.add(adven1, true);
    this.state.villagers.push(adven1);

    let adven2 = new Adventurer(98, 24, "#45444f", "Rogue", [
      "I wish the kobolds had more treasure!",
      "There were so many traps.",
      "You guys were too noisy.",
      b2
    ], gs);
    adven2.description = "One of the stinky humans what robbed your clan.";
    scheduler.add(adven2, true);
    this.state.villagers.push(adven2);

    let adven3 = new Adventurer(96, 24, "#c2d368", "Warrior", [
      "God, that cave was stinky.",
      "Nothing like good ale after a dungeon crawl!",
      "Maybe I'll by a new sword.",
      b3
    ], gs);
    adven3.description = "One of the stinky humans what robbed your clan.";
    scheduler.add(adven3, true);
    this.state.villagers.push(adven3);

    let barmaid = new Barmaid(96, 21, "#edc8c4", "Barmaid", gs);
    barmaid.description = "A stinky human carrying a tray of mugs.";
    scheduler.add(barmaid, true);
    this.state.villagers.push(barmaid);

    let barfly1 = new Barfly(95, 18, "#4b80ca", "Barfly", gs);
    barfly1.description = "Another stinky human.";
    scheduler.add(barfly1, true);
    this.state.villagers.push(barfly1);

    let barfly2 = new Barfly(104, 23, "#4b80ca", "Barfly", gs);
    barfly2.description = "Another stinky human.";
    scheduler.add(barfly2, true);
    this.state.villagers.push(barfly2);
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
    return this.state.isAnimating;
  }

  update(_deltaMs: number): void {
    if (!this.isAnimating && this.inputQueue.length > 0) {
      const e = this.inputQueue.shift()!;
      this.currentController?.handleInput(e);
    }
  }
}
