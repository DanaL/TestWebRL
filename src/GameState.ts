import * as ROT from "rot-js";
import { Actor } from "./Actor";
import { Player } from "./Player";
import { Game } from "./Game";
import { Popup } from "./Popup";
import { InfoPopupController } from "./InputController";
import { Terrain, TERRAIN_DEF } from "./Terrain";
import type { TerrainType } from "./Terrain";
import { loadMap } from "./MapLoader";

export class GameState {
  readonly width: number;
  readonly height: number;

  map: Record<string, TerrainType> = {};
  freeCells: string[] = [];
  items: Record<string, string> = {};
  visible: Record<string, boolean> = {};
  explored: Record<string, boolean> = {};

  player!: Player;
  villagers: Actor[] = [];
  fovRadius = 10;
  score = 0;
  turn = 0;
  messages: string[] = ["Move with arrow keys or WASD. Walk over * to collect items."];

  private fov: ROT.FOV.PreciseShadowcasting;

  constructor() {
    const loaded = loadMap();
    this.width = loaded.width;
    this.height = loaded.height;
    this.map = loaded.map;
    this.freeCells = loaded.freeCells;

    this.player = new Player(6, 48);

    for (let i = 0; i < 10; i++) {
      const key = this.freeCells[Math.floor(ROT.RNG.getUniform() * this.freeCells.length)];
      this.items[key] = "*";
    }

    this.fov = new ROT.FOV.PreciseShadowcasting((x, y) => {
      if (x === this.player.x && y === this.player.y) 
        return true;
      const terrain = this.map[`${x},${y}`];
      return terrain !== undefined && !TERRAIN_DEF[terrain].opaque;
    });
  }

  computeFov(): void {
    for (const k in this.visible) delete this.visible[k];
    this.fov.compute(this.player.x, this.player.y, this.fovRadius, (x: number, y: number, _r: number, visibility: number) => {
      if (visibility) {
        const key = `${x},${y}`;
        this.visible[key] = true;
        this.explored[key] = true;
      }
    });
  }

  addMessage(msg: string): void {
    this.messages.unshift(msg);
    if (this.messages.length > 3) this.messages.length = 3;
  }

  private occupied(x: number, y: number) {
    if (this.player.x === x && this.player.y === y)
      return true;

    for (const actor of this.villagers) {
      if (actor.x === x && actor.y === y)
      return true;
    }

    return false;
  }

  tryMove(dx: number, dy: number, game: Game | null, actor: Actor): void {
    const nx = actor.x + dx;
    const ny = actor.y + dy;
    const key = `${nx},${ny}`;
    const terrain = this.map[key];

    if (terrain === undefined || !TERRAIN_DEF[terrain].walkable) {
      if (actor instanceof Player)
        this.addMessage("You cannot go that way!");
      return;
    }
    else if (this.occupied(nx, ny)) {
      if (actor instanceof Player)
        this.addMessage("There's someone in your way!");
      return;
    }
    else if (actor instanceof Player && terrain === Terrain.Goal) {
      const popup = new Popup("", "You need to return with the stolen egg or risk the wrath of [#b45252 Skittlebix]!", 3, 10, 50);
      game!.pushPopup(popup);
      game!.pushInputController(new InfoPopupController(game!));
    }

    actor.x = nx;
    actor.y = ny;
    if (actor instanceof Player && this.items[key]) {
      this.score++;
      this.addMessage(`Picked up an item! (${this.score} total)`);
      delete this.items[key];
    }
  }
}
