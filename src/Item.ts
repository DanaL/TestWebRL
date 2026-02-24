export class Item {
  name: string;
  description: string;
  ch: string;
  colour: string;
  x: number;
  y: number;

  constructor(x: number, y: number, name: string, description: string, ch: string, colour: string) {
    this.x = x;
    this.y = y;
    this.colour = colour;
    this.name = name;
    this.description = description;
    this.ch = ch;
  }
}