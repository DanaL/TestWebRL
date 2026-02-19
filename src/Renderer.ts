import * as ROT from "rot-js";
import { GameState } from "./GameState";

export class Renderer {
  private display: ROT.Display;
  private width: number;
  private height: number;

  constructor(width: number, height: number, fontSize: number) {
    this.width = width;
    this.height = height;
    this.display = new ROT.Display({ width, height, fontSize });
  }

  getContainer(): HTMLElement {
    return this.display.getContainer()!;
  }

  private readonly MAP_Y = 1; // row 0 is the status bar

  draw(state: GameState): void {
    this.display.clear();
    for (const key in state.map) {
      const [x, y] = key.split(",").map(Number);
      const drawY = y + this.MAP_Y;
      if (state.visible[key]) {
        const ch = state.items[key] || state.map[key];
        const fg = state.items[key] ? "#ff0" : state.map[key] === "#" ? "#888" : "#444";
        this.display.draw(x, drawY, ch, fg, null);
      } else if (state.explored[key]) {
        this.display.draw(x, drawY, state.map[key], "#222", null);
      }
    }
    this.display.draw(state.player.x, state.player.y + this.MAP_Y, "k", "#0f0", null);
  }

  drawUi(state: GameState): void {
    // Status bar on row 0
    const status = `HP: 10/10  Score: ${state.score}  ${state.player.y},${state.player.x}`;
    for (let i = 0; i < Math.min(status.length, this.width); i++) {
      this.display.draw(i, 0, status[i], "#aaa", "#111");
    }

    // Message log on the last 3 rows: newest at bottom, oldest at top
    const msgColors = ["#444", "#777", "#bbb"]; // oldest → newest
    const msgStartY = this.height - 3;
    for (let age = 0; age < 3; age++) {
      const msg = state.messages[age] ?? "";
      const row = msgStartY + (2 - age); // age 0 (newest) → bottom row
      const color = msgColors[2 - age];  // age 0 (newest) → brightest color
      for (let j = 0; j < Math.min(msg.length, this.width); j++) {
        this.display.draw(j, row, msg[j], color, "#111");
      }
    }
  }
}
