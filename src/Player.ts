export class Player {
  x: number;
  y: number;
  health: number;
  readonly maxHealth: number;
  inventory: string[] = [];

  constructor(x: number, y: number, maxHealth: number = 3) {
    this.x = x;
    this.y = y;
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
}
