export abstract class Actor {
  x: number;
  y: number;
  colour: string;
  name: string;

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
  act(): Promise<void> {
    return Promise.resolve();
  }
}
