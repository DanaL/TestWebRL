import * as ROT from "rot-js";
import { Actor, Wasp } from "./Actor";
import { Player } from "./Player";
import { Game } from "./Game";
import { Popup } from "./Popup";
import { InfoPopupController } from "./InputController";
import { Item } from "./Item";
import { Terrain, TERRAIN_DEF } from "./Terrain";
import type { TerrainType } from "./Terrain";
import { loadMap } from "./MapLoader";
import { bresenham, adj8Locs } from "./Utils";

export class GameState {
  readonly width: number;
  readonly height: number;

  map: Record<string, TerrainType> = {};
  freeCells: string[] = [];
  items: Record<string, Item> = {};
  visible: Record<string, boolean> = {};
  explored: Record<string, boolean> = {};

  player!: Player;
  villagers: Actor[] = [];
  examinedLoc: string = "";
  throwTarget: { x: number; y: number } | null = null;
  thrownItem: { item: Item; x: number; y: number } | null = null;
  isAnimating: boolean = false;
  fovRadius = 10;
  turn = 0;
  messages: string[] = ["Move with arrow keys or WASD. 'x' to Examine."];

  fov: InstanceType<typeof ROT.FOV.PreciseShadowcasting>;

  constructor() {
    const loaded = loadMap();
    this.width = loaded.width;
    this.height = loaded.height;
    this.map = loaded.map;
    this.freeCells = loaded.freeCells;

    this.player = new Player(6, 48);

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

  computeAttentionCone(actor: Actor): Set<string> {
    const cone = new Set<string>();
    if (actor.attentionRadius <= 0) return cone;

    const HALF_ANGLE_COS = Math.cos(25 * Math.PI / 180);
    const facingMag = Math.sqrt(actor.facingDx ** 2 + actor.facingDy ** 2);

    const fov = new ROT.FOV.PreciseShadowcasting((x, y) => {
      const terrain = this.map[`${x},${y}`];
      return terrain !== undefined && !TERRAIN_DEF[terrain].opaque;
    });

    fov.compute(actor.x, actor.y, actor.attentionRadius, (x, y, _r, visibility) => {
      if (!visibility) return;
      const dx = x - actor.x;
      const dy = y - actor.y;
      if (dx === 0 && dy === 0) return;
      const dot = dx * actor.facingDx + dy * actor.facingDy;
      const mag = Math.sqrt(dx * dx + dy * dy) * facingMag;
      if (dot / mag >= HALF_ANGLE_COS) {
        cone.add(`${x},${y}`);
      }
    });

    return cone;
  }

  floodFill(startX: number, startY: number, radius: number): Set<string> {
    const reachable = new Set<string>();
    const visited = new Set<string>();
    const queue: [number, number, number][] = [[startX, startY, 0]];
    visited.add(`${startX},${startY}`);

    while (queue.length > 0) {
      const [x, y, dist] = queue.shift()!;
      reachable.add(`${x},${y}`);
      if (dist >= radius) 
        continue;

      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        const key = `${nx},${ny}`;
        if (visited.has(key)) 
          continue;
        visited.add(key);
        const terrain = this.map[key];

        // Doors are passable but will block sound
        if (terrain === undefined || terrain === Terrain.Door) 
          continue;
        if (TERRAIN_DEF[terrain].walkable || terrain === Terrain.Water) {
          queue.push([nx, ny, dist + 1]);
        }
      }
    }

    return reachable;
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

  private checkForWin(game: Game | null): void {
    if (this.player.inventory.filter(i => i.name === "dragon egg").length > 0) {
      const popup = new Popup("[#cf8acb VICTORY!!]", `You have succeeded in retrieving [#b45252 Skittlebix]'s stolen egg!!\n\nSurely you will be praised as a brave and clever kobold, and won't be eaten by your dragon overlord.\n\nYou retrieved the egg in ${this.turn} turns.`, 3, 10, 50);
      game!.pushPopup(popup);
      game!.pushInputController(new InfoPopupController(game!));
    } else {
      const popup = new Popup("", "You need to return with the stolen egg or risk the wrath of [#b45252 Skittlebix]!", 3, 10, 50);
      game!.pushPopup(popup);
      game!.pushInputController(new InfoPopupController(game!));
    }
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
    } else if (this.occupied(nx, ny)) {
      if (actor instanceof Player)
        this.addMessage("There's someone in your way!");
      return;
    } else if (actor instanceof Player && terrain === Terrain.Goal) {
      this.checkForWin(game);
    }

    actor.x = nx;
    actor.y = ny;
    if (actor instanceof Player && this.items[key]) {
      const item = this.items[key];
      item.x = 0;
      item.y = 0;
      this.addMessage(`You pick up the ${item.name}.`);
      this.player.inventory.push(item);
      delete this.items[key];
    }
  }

  async throwItem(item: Item, targetX: number, targetY: number, game: Game): Promise<void> {
    const FRAME_MS = 50;
    let path: [number, number][] = [];
    for (const loc of bresenham(this.player.x, this.player.y, targetX, targetY).slice(1)) {
      path.push(loc);
      if (this.occupied(loc[0], loc[1]))
        break;
    }

    this.isAnimating = true;
    for (const [x, y] of path) {
      this.thrownItem = { item, x, y };
      await new Promise<void>(resolve => setTimeout(resolve, FRAME_MS));
    }
    this.thrownItem = null;
    this.isAnimating = false;

    const loc = `${targetX},${targetY}`;
    const terrain = this.map[loc];
    if (terrain == Terrain.Water) {
      this.addMessage(`The ${item.name} disappears with a splash!`);
    } else {      
      if (item.name == "rock") {
        this.handleNoise(targetX, targetY, 20);
      } else if (item.name == "wasp's nest") {
        this.waspNestLands(targetX, targetY, game);
        return;
      }

      this.itemLands(targetX, targetY, loc, item);
    }    
  }
  
  private waspNestLands(x: number, y: number, game: Game) {
    let adj = adj8Locs(x, y);
    adj.push([x, y]);
    adj = ROT.RNG.shuffle(adj);

    let i = 0;    
    for (let j = 0; j < 3; j++) {
      while (i < adj.length) {
        const loc = adj[i];
        const terrain = this.map[`${loc[0]},${loc[1]}`];
        ++i;
        if (!(this.occupied(loc[0], loc[1]) || terrain === undefined || !TERRAIN_DEF[terrain].walkable)) {
          let wasp = new Wasp(loc[0], loc[1], this, game.scheduler);
          game.scheduler.add(wasp, true);
          this.villagers.push(wasp);
          break;
        }        
      }
    }
  }

  private itemLands(x: number, y: number, loc: string, item: Item) {
    item.x = x;
    item.y = y;
    this.items[loc] = item;
  }

  private handleNoise(x: number, y: number, radius: number): void {
    const area = this.floodFill(x, y, radius);
    for (const mob of this.villagers) {
      if (area.has(`${mob.x},${mob.y}`)) {
        mob.hearNoise(x, y);    
      }
    }
  }
}
