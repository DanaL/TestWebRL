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
    scanner = new LineScanner(this.text);
    let textTokens = scanner.scan();

    let row = this.row;
    let col = this.col;

    renderer.drawChar(row, col++, '┌', "#fff", "#000");
    for (; col < this.maxWidth + 2; col++) {
      renderer.drawChar(row, col, '─', "#fff", "#000");
    }
    renderer.drawChar(row, col++, '┐', "#fff", "#000");
    ++row;

    if (this.title != "") {
      col = this.col;
      renderer.drawChar(row, col++, '│', "#FFF", "#000");
      renderer.drawChar(row, col++, ' ', "#FFF", "#000");

      for (const token of titleTokens) {
        for (const ch of token.text) {
          renderer.drawChar(row, col++, ch, token.colour, "#000");
        }
      }

      while (col <= this.maxWidth + 1) {
        renderer.drawChar(row, col++, ' ', "#FFF", "#000");
      }
      renderer.drawChar(row, col++, '│', "#FFF", "#000");
      row++;
      this.drawBlankRow(renderer, row++);
    }

    col = this.openContentRow(renderer, row);
    for (const token of textTokens) {
      if (token.text === '\n') {
        this.closeContentRow(renderer, row++, col);
        col = this.openContentRow(renderer, row);
        continue;
      }

      if (col + token.text.length > this.maxWidth + 2) {
        this.closeContentRow(renderer, row++, col);
        col = this.openContentRow(renderer, row);
      }

      for (const ch of token.text) {
        renderer.drawChar(row, col++, ch, token.colour, "#000");
      }
    }
    this.closeContentRow(renderer, row++, col);

    col = this.col;
    renderer.drawChar(row, col++, '└', "#fff", "#000");
    for (; col < this.maxWidth + 2; col++) {
      renderer.drawChar(row, col, '─', "#fff", "#000");
    }
    renderer.drawChar(row, col++, '┘', "#fff", "#000");
  }

  private openContentRow(renderer: Renderer, row: number): number {
    let col = this.col;
    renderer.drawChar(row, col++, '│', "#FFF", "#000");
    renderer.drawChar(row, col++, ' ', "#FFF", "#000");
    return col;
  }

  private closeContentRow(renderer: Renderer, row: number, col: number): void {
    while (col <= this.maxWidth + 1) {
      renderer.drawChar(row, col++, ' ', "#FFF", "#000");
    }
    renderer.drawChar(row, col, '│', "#FFF", "#000");
  }

  private drawBlankRow(renderer: Renderer, row: number): void {
    let col = this.col;
    renderer.drawChar(row, col++, '│', "#FFF", "#000");
    while (col <= this.maxWidth + 1) {
      renderer.drawChar(row, col++, ' ', "#FFF", "#000");
    }
    renderer.drawChar(row, col, '│', "#FFF", "#000");
  }
}