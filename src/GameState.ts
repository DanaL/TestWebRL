import * as ROT from "rot-js";
import { Player } from "./Player";

export class GameState {
  readonly width: number;
  readonly height: number;

  map: Record<string, string> = {};
  freeCells: string[] = [];
  items: Record<string, string> = {};
  visible: Record<string, boolean> = {};
  explored: Record<string, boolean> = {};

  player!: Player;
  score = 0;
  messages: string[] = ["Move with arrow keys or WASD. Walk over * to collect items."];

  private fov: ROT.FOV.PreciseShadowcasting;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;

    const caver = new ROT.Map.Cellular(width, height);
    caver.randomize(0.45);
    for (let i = 0; i < 2; i++)
      caver.create();

    caver.create((x: number, y: number, wall: number) => {
      const key = `${x},${y}`;
      if (wall) {
        this.map[key] = "#";
      } else {
        this.map[key] = ".";
        this.freeCells.push(key);
      }
    });

    const playerStart = this.freeCells[Math.floor(ROT.RNG.getUniform() * this.freeCells.length)];
    const [px, py] = playerStart.split(",").map(Number);
    this.player = new Player(px, py);

    for (let i = 0; i < 10; i++) {
      const key = this.freeCells[Math.floor(ROT.RNG.getUniform() * this.freeCells.length)];
      this.items[key] = "*";
    }

    this.fov = new ROT.FOV.PreciseShadowcasting((x, y) => {
      return this.map[`${x},${y}`] === ".";
    });
  }

  computeFov(): void {
    for (const k in this.visible) delete this.visible[k];
    this.fov.compute(this.player.x, this.player.y, 10, (x: number, y: number, _r: number, visibility: number) => {
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
    if (this.map[key] !== ".") {
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
