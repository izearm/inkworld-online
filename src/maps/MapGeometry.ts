// แผนที่ตายตัว (อบจาก generator เดิม) → โครงสร้างสำหรับ collision/render · ไม่ขึ้นกับภาพ
import { hash } from '../systems/rng';
export interface Pt { x: number; y: number }
export interface BakedMap {
  schemaVersion: 1; id: string; landId: string; mapIndex: number; name: string; type: 'town' | 'dungeon'; w: number; h: number; rows: string[];
  gates: [number, number, number][]; chasms: [number, number, number][]; blocks: [number, number, number][]; toggleStyle?: 'ink' | 'fold';
  blockers: { kind: 'trace' | 'circuit' | 'erase'; room: number; path?: Pt[]; nodes?: Pt[]; eraser?: Pt }[];
  portals: (Pt & { to: 'prev' | 'next' | 'world' | 'town' })[]; townPortal?: Pt & { to: 'town' };
  switches: Pt[]; searchSpots: (Pt & { item: string | null })[]; chests: Pt[];
  pickups: (Pt & { kind: 'quest' | 'side'; item?: string; idx?: number })[];
  enemySpawns: (Pt & { type: string })[]; bossSpawn?: Pt & { type: string }; npcSpots: (Pt & { id: string })[];
  spawnBack: Pt; spawnFwd: Pt; spawnWorld?: Pt; rooms: { x: number; y: number; w: number; h: number; cx: number; cy: number }[];
}
export interface WallTile { x: number; y: number; v: number; low: boolean; variant: number }
export interface MapGeometry extends Omit<BakedMap, 'rows' | 'gates' | 'chasms' | 'blocks'> {
  grid: Uint8Array; gate: Uint8Array; chasm: Uint8Array; block: Uint8Array; wallList: WallTile[];
}
const CODE: Record<string, number> = { '.': 0, '#': 1, T: 2, H: 3 };

export function decodeMap(b: BakedMap): MapGeometry {
  const { w, h } = b;
  if (b.rows.length !== h || b.rows.some(r => r.length !== w)) throw new Error(`map ${b.id}: rows ไม่ตรงขนาด ${w}x${h}`);
  const grid = new Uint8Array(w * h), gate = new Uint8Array(w * h), chasm = new Uint8Array(w * h), block = new Uint8Array(w * h);
  b.rows.forEach((r, y) => { for (let x = 0; x < w; x++) { const c = CODE[r[x]]; if (c === undefined) throw new Error(`map ${b.id}: อักษร '${r[x]}' ไม่รู้จัก`); grid[y * w + x] = c; } });
  for (const [x, y, v] of b.gates) gate[y * w + x] = v;
  for (const [x, y, v] of b.chasms) chasm[y * w + x] = v;
  for (const [x, y, v] of b.blocks) block[y * w + x] = v;
  const { rows: _r, gates: _g, chasms: _c, blocks: _b, ...rest } = b;
  return { ...rest, grid, gate, chasm, block, wallList: wallListOf(grid, w, h) };
}
// เหมือน legacy mapgen finish(): บล็อกที่ติดพื้น + กำแพงด้านหน้าแบบเตี้ย
export function wallListOf(grid: Uint8Array, w: number, h: number): WallTile[] {
  const out: WallTile[] = [];
  const fl = (i: number, j: number) => i >= 0 && j >= 0 && i < w && j < h && grid[j * w + i] === 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = grid[y * w + x]; if (!v) continue;
    let edge = false;
    for (let j = -1; j <= 1 && !edge; j++) for (let i = -1; i <= 1; i++) if (fl(x + i, y + j)) { edge = true; break; }
    if (!edge) continue;
    out.push({ x, y, v, low: v === 1 && (fl(x - 1, y) || fl(x, y - 1) || fl(x - 1, y - 1)), variant: (hash(x, y, 7) * 4) | 0 });
  }
  return out;
}
