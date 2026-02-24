import * as ROT from "rot-js";
import type { GameState } from "./GameState";
import { Terrain, TERRAIN_DEF } from "./Terrain";

const ActorState = {
  Idle: "Idle",
  Afraid: "Afraid",
  Angry: "Angry",
  Patrolling: "Patrolling",
  Guarding: "Guarding",
  Investigating: "Investigating"
} as const;
type ActorState = typeof ActorState[keyof typeof ActorState];

export { ActorState }

export abstract class Actor {
  x: number;
  y: number;
  colour: string;
  name: string;
  description: string = "";
  barkText: string | null = null;
  facingDx: number = 1;
  facingDy: number = 0;
  attentionRadius: number = 0;
  attentionCone: Set<string> = new Set();
  state: ActorState = ActorState.Idle;

  constructor(x: number, y: number, colour: string, name: string) {
    this.x = x;
    this.y = y;
    this.colour = colour;
    this.name = name;
  }

  abstract act(): Promise<void>;
}

export class Guard extends Actor {
  private rotDir = 1;
  private readonly gs: GameState;
  private readonly patrolPath: [number, number][];
  private patrolIndex = 0;

  constructor(x: number, y: number, colour: string, name: string, state: ActorState, gs: GameState, patrolPath: [number, number][] = []) {
    super(x, y, colour, name);
    this.gs = gs;
    this.attentionRadius = 7;
    this.state = state;
    this.patrolPath = patrolPath;
  }

  private rotatedFacing(degrees: number): [number, number] {
    const a = degrees * Math.PI / 180;
    return [
      this.facingDx * Math.cos(a) - this.facingDy * Math.sin(a),
      this.facingDx * Math.sin(a) + this.facingDy * Math.cos(a),
    ];
  }

  act(): Promise<void> {
    switch (this.state) {
      case ActorState.Patrolling: {
        if (this.patrolPath.length === 0) break;
        const [tx, ty] = this.patrolPath[this.patrolIndex];
        const dx = Math.sign(tx - this.x);
        const dy = Math.sign(ty - this.y);
        this.gs.tryMove(dx, dy, null, this);
        if (this.x === tx && this.y === ty) {
          this.patrolIndex = (this.patrolIndex + 1) % this.patrolPath.length;
        }
        // Face direction of travel, but 1-in-3 chance to glance left or right
        if (dx !== 0 || dy !== 0) {
          this.facingDx = dx;
          this.facingDy = dy;
          if (ROT.RNG.getUniform() < 1/3) {
            const side = ROT.RNG.getUniform() < 0.5 ? 1 : -1;
            [this.facingDx, this.facingDy] = this.rotatedFacing(20 * side);
          }
        }
        break;
      }
      case ActorState.Guarding: {
        // Preview the candidate facing; reverse scan direction if it hits a wall
        const [testDx, testDy] = this.rotatedFacing(this.rotDir * 20);
        const terrain = this.gs.map[`${this.x + Math.round(testDx)},${this.y + Math.round(testDy)}`];
        if (terrain !== undefined && TERRAIN_DEF[terrain].opaque) {
          this.rotDir *= -1;
        }
        [this.facingDx, this.facingDy] = this.rotatedFacing(this.rotDir * 20);
        break;
      }
    }

    this.attentionCone = this.gs.computeAttentionCone(this);
    if (this.attentionCone.has(`${this.gs.player.x},${this.gs.player.y}`)) {
      this.gs.addMessage(`The ${this.name} sees you!`);
    }

    return Promise.resolve();
  }
}

export class Barmaid extends Actor {
  private readonly gs: GameState;
  private barkDisplayTurns = 0;
  private barkCooldown: number;

  constructor(x: number, y: number, colour: string, name: string, state: GameState) {
    super(x, y, colour, name);
    this.gs = state;
    this.attentionRadius = 3;
    this.barkCooldown = 3 + Math.floor(ROT.RNG.getUniform() * 5);
  }

  act(): Promise<void> {
    let dx = 0;
    let dy = 0;
    const dir = Math.floor(ROT.RNG.getUniform() * 4);

    switch (dir) {
      case 0: dy = -1; break; // north
      case 1: dy =  1; break; // south
      case 2: dx =  1; break; // east
      case 3: dx = -1; break; // west
    }

    this.facingDx = dx;
    this.facingDy = dy;

    // Barmaid won't leave the tavern normally
    const nx = this.x + dx;
    const ny = this.y + dy;
    const terrain = this.gs.map[`${nx},${ny}`];

    if (terrain === Terrain.Floor) {
      this.gs.tryMove(dx, dy, null, this);
    }
    
    this.attentionCone = this.gs.computeAttentionCone(this);
    if (this.attentionCone.has(`${this.gs.player.x},${this.gs.player.y}`)) {
      this.gs.addMessage(`The ${this.name} sees you!`);
    }

    if (this.barkDisplayTurns > 0) {
      this.barkDisplayTurns--;
      if (this.barkDisplayTurns === 0) {
        this.barkText = null;
        this.barkCooldown = 4 + Math.floor(ROT.RNG.getUniform() * 6);
      }
    } else if (this.barkCooldown > 0) {
      this.barkCooldown--;
      if (this.barkCooldown === 0) {        
        switch (Math.floor(ROT.RNG.getUniform() * 3)) {
          case 0:
            this.barkText = "The mutton is excellent tonight.";
            break;
          case 1:
            this.barkText = "Another ale?";
            break;
          case 2:
            this.barkText = "Adventurers never tip well.";
            break;
        }        
        this.barkDisplayTurns = 3;      
      }
    }

    return Promise.resolve();
  }
}

export class Barfly extends Actor {
  private readonly gs: GameState;
  
  constructor(x: number, y: number, colour: string, name: string, state: GameState) {
    super(x, y, colour, name);
    this.gs = state;
    this.attentionRadius = 3;
  }

  act(): Promise<void> {
    let dx = 0;
    let dy = 0;
    const dir = Math.floor(ROT.RNG.getUniform() * 4);

    switch (dir) {
      case 0: dy = -1; break; // north
      case 1: dy =  1; break; // south
      case 2: dx =  1; break; // east
      case 3: dx = -1; break; // west
    }

    this.facingDx = dx;
    this.facingDy = dy;

    // Barfly won't leave the tavern normally
    const nx = this.x + dx;
    const ny = this.y + dy;
    const terrain = this.gs.map[`${nx},${ny}`];

    if (terrain === Terrain.Floor) {
      this.gs.tryMove(dx, dy, null, this);
    }

    this.attentionCone = this.gs.computeAttentionCone(this);
    if (this.attentionCone.has(`${this.gs.player.x},${this.gs.player.y}`)) {
      this.gs.addMessage(`The ${this.name} sees you!`);
    }
    
    return Promise.resolve();
  }
}

const DIRS_8: [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [-1, 1], [1, -1], [-1, -1],
];

export class Adventurer extends Actor {
  private static anyoneBarking = false;

  private readonly barks: string[];
  private barkDisplayTurns = 0;
  private barkCooldown: number;
  private readonly gs: GameState;

  constructor(x: number, y: number, colour: string, name: string, barks: string[], state: GameState) {
    super(x, y, colour, name);
    this.barks = barks;
    this.gs = state;
    this.attentionRadius = 2;
    this.barkCooldown = 3 + Math.floor(ROT.RNG.getUniform() * 5);
  }

  act(): Promise<void> {
    const d = DIRS_8[Math.floor(ROT.RNG.getUniform() * 8)];
    this.facingDx = d[0];
    this.facingDy = d[1];
    this.attentionCone = this.gs.computeAttentionCone(this);
    if (this.attentionCone.has(`${this.gs.player.x},${this.gs.player.y}`)) {
      this.gs.addMessage(`The ${this.name} sees you!`);
    }

    if (this.barkDisplayTurns > 0) {
      this.barkDisplayTurns--;
      if (this.barkDisplayTurns === 0) {
        this.barkText = null;
        Adventurer.anyoneBarking = false;
        this.barkCooldown = 4 + Math.floor(ROT.RNG.getUniform() * 6);
      }
    } else if (this.barkCooldown > 0) {
      this.barkCooldown--;
      if (this.barkCooldown === 0) {
        if (!Adventurer.anyoneBarking) {
          this.barkText = this.barks[Math.floor(ROT.RNG.getUniform() * this.barks.length)];
          this.barkDisplayTurns = 3;
          Adventurer.anyoneBarking = true;
        } else {
          this.barkCooldown = 1 + Math.floor(ROT.RNG.getUniform() * 3);
        }
      }
    }

    return Promise.resolve();
  }
}
