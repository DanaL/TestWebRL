import { LineScanner } from "./LineScanner";
import { Renderer } from "./Renderer";

export class Popup {
  private title: string;
  private text: string;
  private maxWidth: number;
  private row: number;
  private col: number;

  constructor(title: string, text: string, row: number, col: number, maxWidth: number = -1){
    this.title = title;
    this.text = text;
    this.maxWidth = maxWidth;
    this.row = row;
    this.col = col;
  }

  draw(renderer: Renderer)
  {
    let scanner = new LineScanner(this.title);
    let titleTokens = scanner.scan();

    let row = this.row;
    let col = this.col;

    renderer.drawChar(row, col++, '┍', "#fff", "#000");
    for (; col < this.maxWidth + 2; col++) {
      renderer.drawChar(row, col, '─', "#fff", "#000");
    }
    renderer.drawChar(row, col++, '┑', "#fff", "#000");
    ++row;
    col = this.col;
    renderer.drawChar(row, col++, '┕', "#fff", "#000");
    for (; col < this.maxWidth + 2; col++) {
      renderer.drawChar(row, col, '─', "#fff", "#000");
    }
    renderer.drawChar(row, col++, '┙', "#fff", "#000");
  }
}