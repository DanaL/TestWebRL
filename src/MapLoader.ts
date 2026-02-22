import mapText from '../map.txt?raw';
import { Terrain, TERRAIN_DEF } from './Terrain';
import type { TerrainType } from './Terrain';

const CHAR_TO_TERRAIN: Record<string, TerrainType> = {
  '.': Terrain.Grass,
  '^': Terrain.Mountain,
  '}': Terrain.Water,
  'T': Terrain.Tree,
  '#': Terrain.Wall,
  ' ': Terrain.Floor,
  "'": Terrain.Road,
  '+': Terrain.ClosedDoor,
  '-': Terrain.HWindow,
  '|': Terrain.VWindow,
  '=': Terrain.Bridge,
};

export interface LoadedMap {
  map: Record<string, TerrainType>;
  freeCells: string[];
  width: number;
  height: number;
}

export function loadMap(): LoadedMap {
  const lines = mapText.split('\n');
  if (lines.at(-1) === '') lines.pop();

  const height = lines.length;
  const width = Math.max(...lines.map(l => l.length));

  const map: Record<string, TerrainType> = {};
  const freeCells: string[] = [];

  for (let y = 0; y < lines.length; y++) {
    const line = lines[y];
    for (let x = 0; x < line.length; x++) {
      const terrain = CHAR_TO_TERRAIN[line[x]];
      if (terrain !== undefined) {
        const key = `${x},${y}`;
        map[key] = terrain;
        if (TERRAIN_DEF[terrain].walkable) freeCells.push(key);
      }
    }
  }

  return { map, freeCells, width, height };
}
