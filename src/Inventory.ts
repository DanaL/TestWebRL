import { Game } from "./Game";
import { LineScanner } from "./LineScanner";
import { Renderer } from "./Renderer";
import { Popup } from "./Popup";
import { InputController } from "./InputController";
import { Item } from "./Item";

export class MenuController extends InputController {
  private game: Game;
  private menu: InventoryMenu;

  constructor(menu: InventoryMenu, game: Game) {
    super();
    this.game = game;
    this.menu = menu;
  }

  handleInput(e: KeyboardEvent): void {
    if (e.key === 's' || e.key === 'ArrowDown' || e.key === 'j') {
      this.menu.currRow = Math.min(this.menu.currRow + 1, this.menu.itemCount - 1);
    } else if (e.key === 'w' || e.key === 'ArrowUp' || e.key === 'k') {
      this.menu.currRow = Math.max(this.menu.currRow - 1, 0);
    } else if (e.key === 'Escape') {
      this.game.popPopup();
      this.game.popInputController();
    }
  }
}

export class InventoryMenu extends Popup {
  public currRow: number;
  private items: Item[];
  private emptyMsg: string;
  private showDescription: boolean;

  get itemCount(): number { return this.items.length; }

  constructor(title: string, emptyMsg: string, items: Item[], row: number, col: number, showDescription: boolean = true) {
    let maxWidth: number = items.length > 0 ? title.length : emptyMsg.length;

    for (let item of items) {
      if (item.name.length + 1 > maxWidth)
        maxWidth = item.name.length + 1;
      if (showDescription && item.description.length + 2 > maxWidth)
        maxWidth = item.description.length + 2;
    }

    super(title, "", row, col, maxWidth);
    this.items = items;
    this.emptyMsg = emptyMsg;
    this.currRow = 0;
    this.showDescription = showDescription;
  }

  protected override drawContent(renderer: Renderer, row: number): number {
      const titleTokens = new LineScanner(this.items.length > 0 ? this.title : this.emptyMsg).scan();      
    
      let col = this.col;
      renderer.drawChar(row, col++, '│', "#FFF", "#000");
      renderer.drawChar(row, col++, ' ', "#FFF", "#000");

      for (const token of titleTokens) {
        for (const ch of token.text) {
          renderer.drawChar(row, col++, ch, token.colour, "#000");
        }
      }

      while (col <= this.col + this.maxWidth + 2) {
        renderer.drawChar(row, col++, ' ', "#FFF", "#000");
      }
      renderer.drawChar(row, col++, '│', "#FFF", "#000");
      row++;
      this.drawBlankRow(renderer, row++);
        
      for (let r = 0; r < this.items.length; r++) {
        let col = this.openContentRow(renderer, row);
        const bg = r === this.currRow ? "#ede19e" : "#000";
        const fg = r === this.currRow ? "#000" : "#fff";
        for (const ch of this.items[r].name) {
          renderer.drawChar(row, col++, ch, fg, bg);
        }
        while (col <= this.col + this.maxWidth + 1) {
          renderer.drawChar(row, col++, ' ', "#FFF", bg);
        }
        renderer.drawChar(row, col++, ' ', "#FFF", "#000");
        renderer.drawChar(row, col, '│', "#FFF", "#000");
        row++;

        if (this.showDescription && r === this.currRow) {
          let col = this.openContentRow(renderer, row);
          renderer.drawChar(row, col++, ' ', "#b8b5b9", "#000");
          renderer.drawChar(row, col++, ' ', "#b8b5b9", "#000");
          for (const ch of this.items[r].description) {
            renderer.drawChar(row, col++, ch, "#b8b5b9", "#000");
          }
          this.closeContentRow(renderer, row, col);
          row++;
        }
      }

      return row;
    }
}


