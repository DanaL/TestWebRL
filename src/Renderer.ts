import * as ROT from "rot-js";
import { GameState } from "./GameState";
import { TERRAIN_DEF } from "./Terrain";

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

    const vpW = this.width;
    const vpH = this.height - this.MAP_Y - 3; // minus status bar and 3 message rows
    const camX = Math.max(0, Math.min(state.width  - vpW, state.player.x - Math.floor(vpW / 2)));
    const camY = Math.max(0, Math.min(state.height - vpH, state.player.y - Math.floor(vpH / 2)));

    for (const key in state.map) {
      const [wx, wy] = key.split(",").map(Number);
      const sx = wx - camX;
      const sy = wy - camY;
      if (sx < 0 || sx >= vpW || sy < 0 || sy >= vpH) 
        continue;

      if (state.visible[key]) {
        const def = TERRAIN_DEF[state.map[key]];
        const ch = state.items[key] ?? def.glyph;
        const fg = state.items[key] ? "#ede19e" : def.fg;
        this.display.draw(sx, sy + this.MAP_Y, ch, fg, null);
      } else if (state.explored[key]) {
        const def = TERRAIN_DEF[state.map[key]];
        this.display.draw(sx, sy + this.MAP_Y, def.glyph, "#222", null);
      }
    }

    for (const actor of state.villagers) {
      const sx = actor.x - camX;
      const sy = actor.y - camY;

      this.display.draw(sx, sy + this.MAP_Y, "@", "#b8b5b9", null)
    }

    this.display.draw(state.player.x - camX, state.player.y - camY + this.MAP_Y, "k", "#b45252", null);
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
