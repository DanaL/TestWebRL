import * as ROT from "rot-js";
import { Player } from "./Player";
import { TERRAIN_DEF } from "./Terrain";
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
  fovRadius = 10;
  score = 0;
  messages: string[] = ["Move with arrow keys or WASD. Walk over * to collect items."];

  private fov: ROT.FOV.PreciseShadowcasting;

  constructor() {
    const loaded = loadMap();
    this.width = loaded.width;
    this.height = loaded.height;
    this.map = loaded.map;
    this.freeCells = loaded.freeCells;

    const playerStart = this.freeCells[Math.floor(ROT.RNG.getUniform() * this.freeCells.length)];
    const [px, py] = playerStart.split(",").map(Number);
    this.player = new Player(6, 55);

    for (let i = 0; i < 10; i++) {
      const key = this.freeCells[Math.floor(ROT.RNG.getUniform() * this.freeCells.length)];
      this.items[key] = "*";
    }

    this.fov = new ROT.FOV.PreciseShadowcasting((x, y) => {
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

  tryMove(dx: number, dy: number): void {
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;
    const key = `${nx},${ny}`;
    const terrain = this.map[key];
    if (terrain === undefined || !TERRAIN_DEF[terrain].walkable) {
      this.addMessage("Blocked!");
      return;
    }
    this.player.x = nx;
    this.player.y = ny;
    if (this.items[key]) {
      this.score++;
      this.addMessage(`Picked up an item! (${this.score} total)`);
      delete this.items[key];
    }
  }
}
