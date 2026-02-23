import { Actor } from "./Actor";

export class Player extends Actor {
  health: number;
  readonly maxHealth: number;
  inventory: string[] = [];

  constructor(x: number, y: number, maxHealth: number = 3) {
    super(x, y, "#b45252", "Snerk");
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.inventory = [ "rock", "rock", "wasps' nest" ];
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
    this._endTurn?.();
    this._endTurn = null;
  }
}
