import * as ROT from "rot-js";
import { Adventurer } from "./Actor";
import { GameState } from "./GameState";
import { TERRAIN_DEF } from "./Terrain";
import { bresenham, distance } from "./Utils";

type Cell = { glyph: string; fg: string; bg: string | null; sx: number; sy: number };

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

  readonly MAP_Y = 1; // row 0 is the status bar

  drawChar(row: number, col: number, ch: string, fg: string, bg: string): void {
    this.display.draw(col, row, ch, fg, bg);
  }

  drawText(row: number, col: number, txt: string, fg: string, bg: string): void {
    this.display.draw(col, row, txt, fg, bg);
  }

  cameraFor(state: GameState): { camX: number, camY: number, vpW: number, vpH: number } {
    const vpW = this.width;
    const vpH = this.height - this.MAP_Y - 3;
    const camX = Math.max(0, Math.min(state.width  - vpW, state.player.x - Math.floor(vpW / 2)));
    const camY = Math.max(0, Math.min(state.height - vpH, state.player.y - Math.floor(vpH / 2)));
    return { camX, camY, vpW, vpH };
  }

  drawGameArea(state: GameState): void {
    this.display.clear();

    const { camX, camY, vpW, vpH } = this.cameraFor(state);
    const cells: Record<string, Cell> = {};
    const barkCells: Record<string, Cell> = {};

    for (const key in state.map) {
      const [wx, wy] = key.split(",").map(Number);
      const sx = wx - camX;
      const sy = wy - camY;
      if (sx < 0 || sx >= vpW || sy < 0 || sy >= vpH)
        continue;

      const def = TERRAIN_DEF[state.map[key]];

      if (state.visible[key]) {
        const cell = { glyph: def.glyph, fg: def.fg, bg: null, sx: sx, sy: sy};
        cells[`${sx},${sy}`] = cell;
      } else if (state.explored[key]) {
        const cell = { glyph: def.glyph, fg: "#222", bg: null, sx: sx, sy: sy};
        cells[`${sx},${sy}`] = cell;
      }
    }

    for (const item of Object.values(state.items)) {
      const loc = `${item.x},${item.y}`;
      if (!state.visible[loc])
        continue;

      const sx = item.x - camX;
      const sy = item.y - camY;
      const fg = state.examinedLoc === loc ? "#000" : item.colour;
      const bg = state.examinedLoc === loc ? "#cf8acb" : null;
      cells[`${sx},${sy}`] = { glyph: item.ch, fg: fg, bg: bg, sx: sx, sy: sy };
    }

    for (const actor of state.villagers) {
      const loc = `${actor.x},${actor.y}`;
      if (!state.visible[loc])
        continue;

      const sx = actor.x - camX;
      const sy = actor.y - camY;
      const fg = state.examinedLoc === loc ? "#000" : actor.colour;
      const bg = state.examinedLoc === loc ? "#cf8acb" : null;
      cells[`${sx},${sy}`] = { glyph: '@', fg: fg, bg: bg, sx: sx, sy: sy };

      for (const key of actor.attentionCone) {
        if (!state.visible[key])
          continue;
        const [wx, wy] = key.split(",").map(Number);
        const asx = wx - camX;
        const asy = wy - camY;
        if (cells[`${asx},${asy}`]) {
          cells[`${asx},${asy}`].bg = "#2a1515";
        }
      }

      if (actor.barkText && sy >= 2) {
        const bark = (actor instanceof Adventurer && distance(actor.x, actor.y, state.player.x, state.player.y) > 3)
          ? "*mumble, mumble*"
          : actor.barkText;
        const textStart = Math.max(0, Math.min(vpW - bark.length, sx - Math.floor(bark.length / 2)));
        for (let i = 0; i < bark.length; i++) {
          barkCells[`${textStart + i},${sy - 2}`] = { glyph: bark[i], fg: "#fff", bg: "#333", sx: textStart + i, sy: sy - 2 };
        }
        if (sx > 0) {
          barkCells[`${sx - 1},${sy - 1}`] = { glyph: "\\", fg: "#aaa", bg: "#333", sx: sx - 1, sy: sy - 1 };
        }
      }
    }

    for (const cell of Object.values(cells)) {
      this.display.draw(cell.sx, cell.sy + this.MAP_Y, cell.glyph, cell.fg, cell.bg);
    }

    for (const cell of Object.values(barkCells)) {
      this.display.draw(cell.sx, cell.sy + this.MAP_Y, cell.glyph, cell.fg, cell.bg);
    }

    if (state.throwTarget) {
      const line = bresenham(state.player.x, state.player.y, state.throwTarget.x, state.throwTarget.y);
      for (let i = 1; i < line.length; i++) {
        const [wx, wy] = line[i];
        const sx = wx - camX;
        const sy = wy - camY;
        if (sx < 0 || sx >= vpW || sy < 0 || sy >= vpH) continue;
        const isEndpoint = i === line.length - 1;
        const existing = cells[`${sx},${sy}`];
        this.display.draw(sx, sy + this.MAP_Y, existing?.glyph ?? ' ', existing?.fg ?? '#fff', isEndpoint ? '#ede19e' : '#3a3a00');
      }
    }

    if (state.thrownItem) {
      const { item, x, y } = state.thrownItem;
      const sx = x - camX;
      const sy = y - camY;
      if (sx >= 0 && sx < vpW && sy >= 0 && sy < vpH) {
        this.display.draw(sx, sy + this.MAP_Y, item.ch, item.colour, null);
      }
    }

    this.display.draw(state.player.x - camX, state.player.y - camY + this.MAP_Y, "k", "#b45252", null);
  }

  drawUi(state: GameState): void {
    let col = 1;

    for (let i = 0; i < state.player.maxHealth; i++) {
      const filled = i < state.player.health;
      this.display.draw(col++, 0, filled ? "\u2665" : "\u2661", filled ? "#b45252" : "#500", "#111");
    }

    const rest = `  Turn: ${state.turn}  ${state.player.y},${state.player.x}`;
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
