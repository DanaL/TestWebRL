import { Actor } from "./Actor";
import { Item } from "./Item";

export class Player extends Actor {
  health: number;
  readonly maxHealth: number;
  inventory: Item[] = [];
  turnsSinceSeen: number = 0;

  constructor(x: number, y: number, maxHealth: number = 3) {
    super(x, y, "#b45252", "Snerk");
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.inventory = [ 
      new Item(-1, -1, "rock", "Has a good weight and heft for throwing.", "*", "#868188"),
      new Item(-1, -1, "rock", "Has a good weight and heft for throwing.", "*", "#868188"),
      new Item(-1, -1, "wasp's nest", "It is buzzing with angry insects.", "&", "#ede19e")
     ];
  }

  get isAlive(): boolean {
    return this.health > 0;
  }

  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  private _endTurn: (() => void) | null = null;

  act(): Promise<void> {
    return new Promise(resolve => {
      this._endTurn = resolve;
    });
  }

  endTurn(): void {
    this.turnsSinceSeen++;
    this._endTurn?.();
    this._endTurn = null;
  }
}
