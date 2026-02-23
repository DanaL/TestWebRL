import * as ROT from "rot-js";
import type { GameState } from "./GameState";

export abstract class Actor {
  x: number;
  y: number;
  colour: string;
  name: string;
  barkText: string | null = null;

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
  }

  act(): Promise<void> {
    this.state.tryMove(this.dir, 0, null, this);
    this.dir *= -1;
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

    this.state.tryMove(dx, dy, null, this);

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

export class Adventurer extends Actor {
  private static anyoneBarking = false;

  private readonly barks: string[];
  private barkDisplayTurns = 0;
  private barkCooldown: number;

  constructor(x: number, y: number, colour: string, name: string, barks: string[]) {
    super(x, y, colour, name);
    this.barks = barks;
    this.barkCooldown = 3 + Math.floor(ROT.RNG.getUniform() * 5);
  }

  act(): Promise<void> {
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
