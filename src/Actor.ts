import * as ROT from "rot-js";
import type { GameState } from "./GameState";
import { Terrain } from "./Terrain";

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

  constructor(x: number, y: number, colour: string, name: string) {
    this.x = x;
    this.y = y;
    this.colour = colour;
    this.name = name;
  }

  abstract act(): Promise<void>;
}

export class Guard extends Actor {
  private dir = 1;
  private readonly state: GameState;

  constructor(x: number, y: number, colour: string, name: string, state: GameState) {
    super(x, y, colour, name);
    this.state = state;
    this.attentionRadius = 9;
  }

  act(): Promise<void> {
    this.facingDx = this.dir;
    this.facingDy = 0;
    this.state.tryMove(this.dir, 0, null, this);
    this.dir *= -1;
    this.attentionCone = this.state.computeAttentionCone(this);
    if (this.attentionCone.has(`${this.state.player.x},${this.state.player.y}`)) {
      this.state.addMessage(`The ${this.name} sees you!`);
    }
    return Promise.resolve();
  }
}

export class Barmaid extends Actor {
  private readonly state: GameState;
  private barkDisplayTurns = 0;
  private barkCooldown: number;

  constructor(x: number, y: number, colour: string, name: string, state: GameState) {
    super(x, y, colour, name);
    this.state = state;
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
    const terrain = this.state.map[`${nx},${ny}`];

    if (terrain === Terrain.Floor) {
      this.state.tryMove(dx, dy, null, this);
    }
    
    this.attentionCone = this.state.computeAttentionCone(this);
    if (this.attentionCone.has(`${this.state.player.x},${this.state.player.y}`)) {
      this.state.addMessage(`The ${this.name} sees you!`);
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
  private readonly state: GameState;
  
  constructor(x: number, y: number, colour: string, name: string, state: GameState) {
    super(x, y, colour, name);
    this.state = state;
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
    const terrain = this.state.map[`${nx},${ny}`];

    if (terrain === Terrain.Floor) {
      this.state.tryMove(dx, dy, null, this);
    }

    this.attentionCone = this.state.computeAttentionCone(this);
    if (this.attentionCone.has(`${this.state.player.x},${this.state.player.y}`)) {
      this.state.addMessage(`The ${this.name} sees you!`);
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
  private readonly state: GameState;

  constructor(x: number, y: number, colour: string, name: string, barks: string[], state: GameState) {
    super(x, y, colour, name);
    this.barks = barks;
    this.state = state;
    this.attentionRadius = 2;
    this.barkCooldown = 3 + Math.floor(ROT.RNG.getUniform() * 5);
  }

  act(): Promise<void> {
    const d = DIRS_8[Math.floor(ROT.RNG.getUniform() * 8)];
    this.facingDx = d[0];
    this.facingDy = d[1];
    this.attentionCone = this.state.computeAttentionCone(this);
    if (this.attentionCone.has(`${this.state.player.x},${this.state.player.y}`)) {
      this.state.addMessage(`The ${this.name} sees you!`);
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
