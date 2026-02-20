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

  drawChar(row: number, col: number, ch: string, fg: string, bg: string): void {
    this.display.draw(col, row, ch, fg, bg);
  }

  drawText(row: number, col: number, txt: string, fg: string, bg: string): void {
    this.display.draw(col, row, txt, fg, bg);
  }

  drawGameArea(state: GameState): void {
    this.display.clear();
    for (const key in state.map) {
      const [x, y] = key.split(",").map(Number);
      const drawY = y + this.MAP_Y;
      if (state.visible[key]) {
        const ch = state.items[key] || state.map[key];
        const fg = state.items[key] ? "#ede19e" : state.map[key] === "#" ? "#888" : "#444";
        this.display.draw(x, drawY, ch, fg, null);
      } else if (state.explored[key]) {
        this.display.draw(x, drawY, state.map[key], "#222", null);
      }
    }
    this.display.draw(state.player.x, state.player.y + this.MAP_Y, "k", "#8ab060", null);
  }

  drawUi(state: GameState): void {
    let col = 1;

    for (let i = 0; i < state.player.maxHealth; i++) {
      const filled = i < state.player.health;
      this.display.draw(col++, 0, filled ? "\u2665" : "\u2661", filled ? "#b45252" : "#500", "#111");
    }

    const rest = `  Score: ${state.score}  ${state.player.y},${state.player.x}`;
    for (let i = 0; i < Math.min(rest.length, this.width - col); i++) {
      this.display.draw(col++, 0, rest[i], "#aaa", "#111");
    }

    // Write message log
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
