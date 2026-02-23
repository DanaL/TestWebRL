import * as ROT from "rot-js";

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

  act(): Promise<void> {
    this.x += this.dir;
    this.dir *= -1;
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
