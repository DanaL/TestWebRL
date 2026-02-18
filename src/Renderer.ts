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

  draw(state: GameState): void {
    this.display.clear();
    for (const key in state.map) {
      const [x, y] = key.split(",").map(Number);
      if (state.visible[key]) {
        const ch = state.items[key] || state.map[key];
        const fg = state.items[key] ? "#ff0" : state.map[key] === "#" ? "#888" : "#444";
        this.display.draw(x, y, ch, fg, null);
      } else if (state.explored[key]) {
        this.display.draw(x, y, state.map[key], "#222", null);
      }
    }
    this.display.draw(state.player.x, state.player.y, "k", "#0f0", null);
  }

  drawUi(state: GameState): void {
    const line = `HP: 10/10  Score: ${state.score}  ${state.player.y},${state.player.x}  | ${state.message}`;
    for (let i = 0; i < Math.min(line.length, this.width); i++) {
      this.display.draw(i, this.height - 1, line[i], "#aaa", "#111");
    }
  }
}
