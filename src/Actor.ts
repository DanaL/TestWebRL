export class Actor {
  x: number;
  y: number;
  name: string;
  dir: number;

  constructor(x: number, y: number, name: string) {
    this.x = x;
    this.y = y;
    this.name = name;
    this.dir = 1;
  }

  act(): Promise<void> {
    this.x += this.dir;
    this.dir *= -1;
    return Promise.resolve();
  }
}