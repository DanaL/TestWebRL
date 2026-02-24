import * as ROT from "rot-js";
import type { GameState } from "./GameState";
import { Terrain, TERRAIN_DEF } from "./Terrain";
import { distance, adj8 } from "./Utils";

const ActorState = {
  Idle: "Idle",
  Afraid: "Afraid",
  Angry: "Angry",
  Patrolling: "Patrolling",
  Guarding: "Guarding",
  Investigating: "Investigating"
} as const;
type ActorState = typeof ActorState[keyof typeof ActorState];

export { ActorState }

export abstract class Actor {
  x: number;
  y: number;
  ch: string = "@";
  colour: string;
  name: string;
  description: string = "";
  barkText: string | null = null;
  facingDx: number = 1;
  facingDy: number = 0;
  attentionRadius: number = 0;
  attentionCone: Set<string> = new Set();
  state: ActorState = ActorState.Idle;

  fearX: number = 0;
  fearY: number = 0;
  fearTurnsLeft: number = 0;
  fleePhase: "flee" | "return" = "flee";
  fleeTargetX: number = 0;
  fleeTargetY: number = 0;
  fleeReturnX: number = 0;
  fleeReturnY: number = 0;
  prevStateBeforeFear: ActorState = ActorState.Idle;

  constructor(x: number, y: number, colour: string, name: string) {
    this.x = x;
    this.y = y;
    this.colour = colour;
    this.name = name;
  }

  abstract act(): Promise<void>;

  hearNoise(_x: number, _y: number): void {}

  becomeAfraid(fearX: number, fearY: number, gs: GameState): void {
    if (this.state === ActorState.Afraid) 
      return;

    gs.addMessage(`The ${this.name} becomes frightened!`);
    this.prevStateBeforeFear = this.state;
    this.fleeReturnX = this.x;
    this.fleeReturnY = this.y;
    this.fearX = fearX;
    this.fearY = fearY;
    this.fearTurnsLeft = 50 + Math.floor(ROT.RNG.getUniform() * 6);
    this.fleePhase = "flee";
    // Project a flee target 20 tiles away in the direction opposite to the fear source
    const awayDx = this.x - fearX;
    const awayDy = this.y - fearY;
    const mag = Math.sqrt(awayDx ** 2 + awayDy ** 2);
    if (mag > 0) {
      this.fleeTargetX = Math.round(this.x + (awayDx / mag) * 20);
      this.fleeTargetY = Math.round(this.y + (awayDy / mag) * 20);
    } else {
      this.fleeTargetX = this.x + 20;
      this.fleeTargetY = this.y;
    }
    this.fleeTargetX = Math.max(0, Math.min(gs.width - 1, this.fleeTargetX));
    this.fleeTargetY = Math.max(0, Math.min(gs.height - 1, this.fleeTargetY));
    this.state = ActorState.Afraid;
  }

  protected actAfraid(gs: GameState): void {
    this.fearTurnsLeft--;

    if (this.fleePhase === "flee") {
      if (this.fearTurnsLeft <= 0) {
        this.fleePhase = "return";
      } else {
        const astar = new ROT.Path.AStar(this.fleeTargetX, this.fleeTargetY, (x, y) => {
          const t = gs.map[`${x},${y}`];
          return t !== undefined && TERRAIN_DEF[t].walkable;
        }, { topology: 4 });
        let step = 0, nextX = this.x, nextY = this.y;
        astar.compute(this.x, this.y, (x, y) => {
          if (step === 1) { nextX = x; nextY = y; }
          step++;
        });
        const dx = nextX - this.x, dy = nextY - this.y;
        if (dx !== 0 || dy !== 0) {
          this.facingDx = dx;
          this.facingDy = dy;
          gs.tryMove(dx, dy, null, this);
        }
      }
    }

    if (this.fleePhase === "return") {
      if (distance(this.x, this.y, this.fleeReturnX, this.fleeReturnY) === 0) {
        this.state = this.prevStateBeforeFear;
        return;
      }
      const astar = new ROT.Path.AStar(this.fleeReturnX, this.fleeReturnY, (x, y) => {
        const t = gs.map[`${x},${y}`];
        return t !== undefined && TERRAIN_DEF[t].walkable;
      }, { topology: 4 });
      let step = 0, nextX = this.x, nextY = this.y;
      astar.compute(this.x, this.y, (x, y) => {
        if (step === 1) { nextX = x; nextY = y; }
        step++;
      });
      const dx = nextX - this.x, dy = nextY - this.y;
      if (dx !== 0 || dy !== 0) {
        this.facingDx = dx;
        this.facingDy = dy;
        gs.tryMove(dx, dy, null, this);
      }
    }
  }
}

export class Guard extends Actor {
  private rotDir = 1;
  private readonly gs: GameState;
  private readonly patrolPath: [number, number][];
  private patrolIndex = 0;

  private prevState: ActorState = ActorState.Idle;
  private returnX = 0;
  private returnY = 0;
  private investigateX = 0;
  private investigateY = 0;
  private investigatePhase: "goto" | "return" = "goto";

  constructor(x: number, y: number, colour: string, name: string, state: ActorState, gs: GameState, patrolPath: [number, number][] = []) {
    super(x, y, colour, name);
    this.gs = gs;
    this.attentionRadius = 7;
    this.state = state;
    this.patrolPath = patrolPath;
  }

  override hearNoise(x: number, y: number): void {
    if (this.state === ActorState.Investigating || this.state === ActorState.Afraid)
      return;
    this.prevState = this.state;
    this.returnX = this.x;
    this.returnY = this.y;
    this.investigateX = x;
    this.investigateY = y;
    this.investigatePhase = "goto";
    this.state = ActorState.Investigating;

    this.gs.addMessage(`The ${this.name} says, "What's that?"`);
  }

  private rotatedFacing(degrees: number): [number, number] {
    const a = degrees * Math.PI / 180;
    return [
      this.facingDx * Math.cos(a) - this.facingDy * Math.sin(a),
      this.facingDx * Math.sin(a) + this.facingDy * Math.cos(a),
    ];
  }

  act(): Promise<void> {
    switch (this.state) {
      case ActorState.Patrolling: {
        if (this.patrolPath.length === 0) break;
        const [tx, ty] = this.patrolPath[this.patrolIndex];
        const dx = Math.sign(tx - this.x);
        const dy = Math.sign(ty - this.y);
        this.gs.tryMove(dx, dy, null, this);
        if (this.x === tx && this.y === ty) {
          this.patrolIndex = (this.patrolIndex + 1) % this.patrolPath.length;
        }
        // Face direction of travel, but 1-in-3 chance to glance left or right
        if (dx !== 0 || dy !== 0) {
          this.facingDx = dx;
          this.facingDy = dy;
          if (ROT.RNG.getUniform() < 1/3) {
            const side = ROT.RNG.getUniform() < 0.5 ? 1 : -1;
            [this.facingDx, this.facingDy] = this.rotatedFacing(20 * side);
          }
        }
        break;
      }
      case ActorState.Guarding: {
        // Preview the candidate facing; reverse scan direction if it hits a wall
        const [testDx, testDy] = this.rotatedFacing(this.rotDir * 20);
        const terrain = this.gs.map[`${this.x + Math.round(testDx)},${this.y + Math.round(testDy)}`];
        if (terrain !== undefined && TERRAIN_DEF[terrain].opaque) {
          this.rotDir *= -1;
        }
        [this.facingDx, this.facingDy] = this.rotatedFacing(this.rotDir * 20);
        break;
      }
      case ActorState.Afraid: {
        this.actAfraid(this.gs);
        break;
      }
      case ActorState.Investigating: {
        const [targetX, targetY] = this.investigatePhase === "goto"
          ? [this.investigateX, this.investigateY]
          : [this.returnX, this.returnY];

        const dist = distance(this.x, this.y, targetX, targetY);
        const arrived = this.investigatePhase === "goto" ? dist <= 1 : dist === 0;

        if (arrived) {
          if (this.investigatePhase === "goto") {
            this.gs.addMessage(`The ${this.name} says, "Hmmm."`);
            this.investigatePhase = "return";
          } else {
            this.state = this.prevState;
          }
          break;
        }

        // Use A* to find next step toward target
        const astar = new ROT.Path.AStar(targetX, targetY, (x, y) => {
          const t = this.gs.map[`${x},${y}`];
          return t !== undefined && TERRAIN_DEF[t].walkable;
        }, { topology: 4 });

        let step = 0;
        let nextX = this.x;
        let nextY = this.y;
        astar.compute(this.x, this.y, (x, y) => {
          if (step === 1) { nextX = x; nextY = y; }
          step++;
        });

        const dx = nextX - this.x;
        const dy = nextY - this.y;
        if (dx !== 0 || dy !== 0) {
          this.facingDx = dx;
          this.facingDy = dy;
          this.gs.tryMove(dx, dy, null, this);
        }
        break;
      }
    }

    this.attentionCone = this.gs.computeAttentionCone(this);
    if (this.attentionCone.has(`${this.gs.player.x},${this.gs.player.y}`)) {
      this.gs.addMessage(`The ${this.name} sees you!`);
    }

    return Promise.resolve();
  }
}

export class Barmaid extends Actor {
  private readonly gs: GameState;
  private barkDisplayTurns = 0;
  private barkCooldown: number;

  constructor(x: number, y: number, colour: string, name: string, state: GameState) {
    super(x, y, colour, name);
    this.gs = state;
    this.attentionRadius = 3;
    this.barkCooldown = 3 + Math.floor(ROT.RNG.getUniform() * 5);
  }

  act(): Promise<void> {
    if (this.state === ActorState.Afraid) {
      this.actAfraid(this.gs);
      this.attentionCone = this.gs.computeAttentionCone(this);
      return Promise.resolve();
    }

    let dx = 0;
    let dy = 0;
    const dir = Math.floor(ROT.RNG.getUniform() * 4);

    switch (dir) {
      case 0: dy = -1; break; // north
      case 1: dy =  1; break; // south
      case 2: dx =  1; break; // east
      case 3: dx = -1; break; // west
    }

    this.facingDx = dx;
    this.facingDy = dy;

    // Barmaid won't leave the tavern normally
    const nx = this.x + dx;
    const ny = this.y + dy;
    const terrain = this.gs.map[`${nx},${ny}`];

    if (terrain === Terrain.Floor) {
      this.gs.tryMove(dx, dy, null, this);
    }
    
    this.attentionCone = this.gs.computeAttentionCone(this);
    if (this.attentionCone.has(`${this.gs.player.x},${this.gs.player.y}`)) {
      this.gs.addMessage(`The ${this.name} sees you!`);
    }

    if (this.barkDisplayTurns > 0) {
      this.barkDisplayTurns--;
      if (this.barkDisplayTurns === 0) {
        this.barkText = null;
        this.barkCooldown = 4 + Math.floor(ROT.RNG.getUniform() * 6);
      }
    } else if (this.barkCooldown > 0) {
      this.barkCooldown--;
      if (this.barkCooldown === 0) {        
        switch (Math.floor(ROT.RNG.getUniform() * 3)) {
          case 0:
            this.barkText = "The mutton is excellent tonight.";
            break;
          case 1:
            this.barkText = "Another ale?";
            break;
          case 2:
            this.barkText = "Adventurers never tip well.";
            break;
        }        
        this.barkDisplayTurns = 3;      
      }
    }

    return Promise.resolve();
  }
}

export class Barfly extends Actor {
  private readonly gs: GameState;
  
  constructor(x: number, y: number, colour: string, name: string, state: GameState) {
    super(x, y, colour, name);
    this.gs = state;
    this.attentionRadius = 3;
  }

  act(): Promise<void> {
    if (this.state === ActorState.Afraid) {
      this.actAfraid(this.gs);
      this.attentionCone = this.gs.computeAttentionCone(this);
      return Promise.resolve();
    }

    let dx = 0;
    let dy = 0;
    const dir = Math.floor(ROT.RNG.getUniform() * 4);

    switch (dir) {
      case 0: dy = -1; break; // north
      case 1: dy =  1; break; // south
      case 2: dx =  1; break; // east
      case 3: dx = -1; break; // west
    }

    this.facingDx = dx;
    this.facingDy = dy;

    // Barfly won't leave the tavern normally
    const nx = this.x + dx;
    const ny = this.y + dy;
    const terrain = this.gs.map[`${nx},${ny}`];

    if (terrain === Terrain.Floor) {
      this.gs.tryMove(dx, dy, null, this);
    }

    this.attentionCone = this.gs.computeAttentionCone(this);
    if (this.attentionCone.has(`${this.gs.player.x},${this.gs.player.y}`)) {
      this.gs.addMessage(`The ${this.name} sees you!`);
    }
    
    return Promise.resolve();
  }
}

export class Adventurer extends Actor {
  private static anyoneBarking = false;

  private readonly barks: string[];
  private barkDisplayTurns = 0;
  private barkCooldown: number;
  private readonly gs: GameState;

  constructor(x: number, y: number, colour: string, name: string, barks: string[], state: GameState) {
    super(x, y, colour, name);
    this.barks = barks;
    this.gs = state;
    this.attentionRadius = 2;
    this.barkCooldown = 3 + Math.floor(ROT.RNG.getUniform() * 5);
  }

  act(): Promise<void> {
    if (this.state === ActorState.Afraid) {
      this.actAfraid(this.gs);
      this.attentionCone = this.gs.computeAttentionCone(this);
      return Promise.resolve();
    }

    const d = adj8[Math.floor(ROT.RNG.getUniform() * 8)];
    this.facingDx = d[0];
    this.facingDy = d[1];
    this.attentionCone = this.gs.computeAttentionCone(this);
    if (this.attentionCone.has(`${this.gs.player.x},${this.gs.player.y}`)) {
      this.gs.addMessage(`The ${this.name} sees you!`);
    }

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

export class Wasp extends Actor {
  private readonly gs: GameState;
  private duration: number;
  private readonly scheduler: InstanceType<typeof ROT.Scheduler.Simple>;
  
  constructor(x: number, y: number, state: GameState, scheduler: InstanceType<typeof ROT.Scheduler.Simple>) {
    super(x, y, "#ede19e", "wasp");
    this.gs = state;
    this.description = "An angry, buzzing wasp.";
    this.ch = "I";
    this.duration = 5 + Math.floor(ROT.RNG.getUniform() * 3);
    this.scheduler = scheduler;
  }

  act(): Promise<void> {
    let dx = 0;
    let dy = 0;
    const dir = Math.floor(ROT.RNG.getUniform() * 4);

    switch (dir) {
      case 0: dy = -1; break; // north
      case 1: dy =  1; break; // south
      case 2: dx =  1; break; // east
      case 3: dx = -1; break; // west
    }

    this.gs.tryMove(dx, dy, null, this);

    // TODO: wasp will still kobold if they are adjacent and fright nearby non-wasp villagers
    const fov = new ROT.FOV.PreciseShadowcasting((x, y) => {
      const terrain = this.gs.map[`${x},${y}`];
      return terrain !== undefined && !TERRAIN_DEF[terrain].opaque;
    });

    fov.compute(this.x, this.y, 5, (x, y, _r, visibility) => {
      if (!visibility) 
        return;      
      if (dx === 0 && dy === 0) 
        return;

      for (let actor of this.gs.villagers) {
        if (actor.name !== "wasp" && actor.x === x && actor.y === y) {
          actor.becomeAfraid(this.x, this.y, this.gs);          
        }
      }
    });

    // Wasps disappear after a few turns
    if (--this.duration < 0) {
      this.gs.villagers = this.gs.villagers.filter(v => v !== this);
      this.scheduler.remove(this);
    }

    return Promise.resolve();
  }
}
