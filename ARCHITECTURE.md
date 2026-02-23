# Snerk the Sneak — Architecture Notes

## Overview

A browser-based roguelike built with TypeScript and [ROT.js](https://ondras.github.io/rot.js/). The game runs in a continuous `requestAnimationFrame` loop for rendering, but is logically turn-based — the world only advances when the player takes a meaningful in-game action.

---

## File Map

| File | Responsibility |
|------|---------------|
| `main.ts` | Entry point. Wires everything together, starts the game loop |
| `Game.ts` | Central coordinator. Owns the input controller stack, popup stack, and input queue |
| `GameState.ts` | All mutable game world data: map, player, items, FOV, messages |
| `Player.ts` | Player stats and inventory |
| `Renderer.ts` | Draws map, UI, and popups using ROT.js Display |
| `InputController.ts` | Abstract base class for input handlers; also `InfoPopupController` |
| `PlayerCommandController.ts` | Handles movement keys and inventory key during normal play |
| `Terrain.ts` | Terrain type constants and their properties (glyph, colour, walkable, opaque) |
| `MapLoader.ts` | Parses `map.txt` into the terrain map used by GameState |
| `Popup.ts` | Renders popup windows with ROT.js markup text |
| `Inventory.ts` | Inventory menu popup and its controller |
| `LineScanner.ts` | Parses ROT.js-style inline colour markup (e.g. `[#f00 red text]`) |
| `Utils.ts` | Small helpers (e.g. `indefArticle`) |

---

## The Game Loop

```
requestAnimationFrame (every ~16ms)
  └── game.update(deltaMs)
  │     └── if not animating AND input queue non-empty:
  │           pop one KeyboardEvent → currentController.handleInput(e)
  └── game.render()
        ├── renderer.drawGameArea(state)   ← map + player
        ├── renderer.drawUi(state)         ← health bar, score, messages
        └── popup.draw(renderer)           ← any open popups (top of stack)
```

Keyboard events are captured by a `window` listener and pushed onto `game.inputQueue`. The update step drains one event per frame. Animations (when implemented) can set `game.isAnimating = true` to pause input processing while a move plays out.

---

## Input Controller Stack

`Game` maintains a stack of `InputController` objects. Only the **top** controller receives input.

```
[PlayerCommandController]          ← normal play
[PlayerCommandController]
[InfoPopupController]              ← popup is open; any key dismisses it
```

Pushing a controller (e.g. opening inventory) does **not** destroy the one below it — popping returns to the previous state automatically.

Current controllers:
- **`PlayerCommandController`** — arrows/WASD to move, `i` to open inventory
- **`InfoPopupController`** — any key dismisses an info popup and pops itself
- **`MenuController`** (in `Inventory.ts`) — handles inventory menu navigation

**Key distinction for future turn-based logic:** `PlayerCommandController` already separates "free" actions (opening inventory — just pushes a controller and returns) from "game" actions (movement — calls `tryMove` + `computeFov`). This boundary is where NPC turns would be triggered.

---

## GameState

All live world data lives here. Key fields:

```typescript
map: Record<string, TerrainType>    // "x,y" → terrain constant
freeCells: string[]                 // walkable "x,y" keys (for spawning)
items: Record<string, string>       // "x,y" → item glyph
visible: Record<string, boolean>    // currently in FOV
explored: Record<string, boolean>   // seen at least once
player: Player
fovRadius: number                   // set from viewport size in main.ts
messages: string[]                  // last 3 messages, newest first
```

`tryMove(dx, dy, game)` — attempts to move the player. Blocks on unwalkable terrain. Special-cases `Terrain.Goal` to show a popup. Does **not** call `computeFov` — that's the caller's responsibility (so future NPC turns can happen between move and FOV recompute if needed).

---

## Terrain System

Defined in `Terrain.ts`. Two exports work together:

**`Terrain`** — a `const` object of named numeric IDs (the values stored in the map):
```typescript
Terrain.Grass, Terrain.Wall, Terrain.Door, Terrain.Goal, ...
```

**`TERRAIN_DEF`** — a lookup table from terrain ID → properties:
```typescript
{ glyph: string, fg: string, walkable: boolean, opaque: boolean }
```

**`TerrainType`** — a TypeScript type alias, only exists at compile time. Use `Terrain.X` (not `TerrainType.X`) in runtime code.

Adding a new terrain type = add an entry to `Terrain` + a row in `TERRAIN_DEF` + optionally a character in `MapLoader`'s `CHAR_TO_TERRAIN`.

Current terrain types and their map characters:

| Char | Terrain | walkable | opaque |
|------|---------|----------|--------|
| `.` | Grass | yes | no |
| ` ` | Floor | yes | no |
| `'` | Road | yes | no |
| `=` | Bridge | yes | no |
| `T` | Tree | yes | no |
| `+` | Door | yes | **yes** |
| `>` | Goal | yes | no |
| `#` | Wall | no | yes |
| `^` | Mountain | no | yes |
| `}` | Water | no | no |
| `-` | HWindow | no | no |
| `\|` | VWindow | no | no |

Doors are opaque but walkable — the FOV callback special-cases the player's own tile so standing on a door doesn't black out the screen.

---

## Map Loading

`map.txt` is imported as a raw string at build time (Vite's `?raw` import). `MapLoader.loadMap()` splits it into lines, maps each character to a `TerrainType` via `CHAR_TO_TERRAIN`, and builds:
- `map` — the terrain record
- `freeCells` — all walkable tile keys (used for random item/actor placement)
- `width` / `height` — derived from the file dimensions

Unknown characters are silently skipped (no entry added to `map`), so the FOV and movement code treat them as out-of-bounds.

---

## Rendering & Camera

`Renderer.drawGameArea` computes a camera offset each frame so the player stays centred in the viewport:

```typescript
camX = clamp(player.x - vpW/2,  0, mapWidth  - vpW)
camY = clamp(player.y - vpH/2,  0, mapHeight - vpH)
screenX = worldX - camX
screenY = worldY - camY + 1   // +1 for the status bar row
```

Tiles outside the viewport are skipped. Tiles are drawn in three states:
- **Visible** (in current FOV): full colour from `TERRAIN_DEF`, items override the glyph
- **Explored** (seen before, now dark): terrain glyph in `#222`
- **Unseen**: not drawn

The display is fixed at 80×36 (80 wide, 1 status + 32 map + 3 message rows). The map itself is ~246×51 — much larger than the viewport.

FOV radius is set in `main.ts` to `Math.ceil(Math.hypot(WIDTH/2, MAP_ROWS/2))` ≈ 44, enough to reach every corner of the viewport from the player's position.

---

## Planned: Turn-Based Actor System

When NPCs are added, the plan is to use **ROT.js Scheduler + Engine**.

The two loops coexist without interfering:

```
ROT.js Engine (async chain)         rAF Loop (60fps, unaffected)
───────────────────────────         ────────────────────────────
engine.start()
  → player.act() — awaiting           render()
    ...waiting for input...            render()   ← inventory open, etc.
    ...waiting for input...            render()
    player presses 'w' (move)
    PlayerCommandController
      → tryMove() succeeds
      → player.endTurn()  ←── promise resolves
  → guard.act()  (synchronous)         render()
  → guard.act()  (synchronous)         render()
  → player.act() — awaiting again      render()
```

### Player actor

`Player` stores a resolve function from its current `act()` promise. `endTurn()` calls it, which signals the engine to proceed to the NPC turns.

```typescript
// In Player.ts
private _endTurn: (() => void) | null = null;

act(): Promise<void> {
  return new Promise(resolve => {
    this._endTurn = resolve;
  });
}

// Called only when a real game action has been taken
endTurn(): void {
  this._endTurn?.();
  this._endTurn = null;
}
```

### NPC actors

NPCs implement `act()` synchronously — no Promise needed. The engine moves on immediately after each one.

```typescript
class Guard {
  act(state: GameState): void {
    // pathfind toward player, patrol, etc.
    // runs and returns in the same microtask tick
  }
}
```

### Engine setup (in Game.ts)

```typescript
private scheduler = new ROT.Scheduler.Simple();
private engine   = new ROT.Engine(this.scheduler);

start(): void {
  this.scheduler.add(this.state.player, true);  // true = repeat each round
  this.engine.start();
}

addActor(actor: Guard): void {
  this.scheduler.add(actor, true);
}
```

### PlayerCommandController — the turn/free-action boundary

The distinction already exists in the current code. When NPCs are added, movement just needs `player.endTurn()` after a successful move:

```typescript
handleInput(e: KeyboardEvent): void {
  // ── free actions: push a controller and return, engine keeps waiting ──
  if (e.key === 'i') {
    this.game.pushPopup(new InventoryMenu(...));
    this.game.pushInputController(new MenuController(...));
    return;  // no endTurn() — NPCs do not act
  }

  // ── game actions: take effect, then end the turn so NPCs act ──
  const dir = MOVE_KEYS[e.key];
  if (dir) {
    const moved = this.game.state.tryMove(dir[0], dir[1], this.game);
    if (moved) {
      this.game.state.computeFov();
      this.game.state.player.endTurn();  // ← NPCs now take their turns
    }
    // if tryMove failed (blocked), endTurn is not called — player tries again
  }
}
```

Note: `tryMove` currently returns `void`; it would need to return `boolean` to indicate success so the controller knows whether to call `endTurn()`.

`game.isAnimating` (currently a stub returning `false`) will pause input processing during move animations, independently of the turn system.
