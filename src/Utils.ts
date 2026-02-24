export const MOVE_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  h: [-1, 0], j: [0, 1], k: [0, -1], l: [1, 0]
};

export function bresenham(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const pts: [number, number][] = [];
  let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  
  while (true) {
    pts.push([x0, y0]);
    if (x0 === x1 && y0 === y1) 
      break;
    const e2 = 2 * err;
    if (e2 >= dy) { 
      err += dy; 
      x0 += sx; 
    }
    if (e2 <= dx) { 
      err += dx; 
      y0 += sy; 
    }
  }
  
  return pts;
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(bx - ax), Math.abs(by - ay));
}

export function indefArticle(s: string): string {
  const first = s[0];
  if (first >= '0' && first <= '9') 
    return s;

  return 'aeiouAEIOUyY'.includes(first) ? `an ${s}` : `a ${s}`;
}

export const adj8: [number, number][] = [
  [-1, 0], [1, 0], [0, 1], [0, -1],
  [-1, -1], [-1, 1], [1, -1], [1, 1]
];

export function adj8Locs(x: number, y: number): [number, number][] {
  return adj8.map(([dx, dy]) => [x + dx, y + dy]);
}

