// Development Arena: แผนที่ตายตัวขนาดเล็ก (พื้นโล่ง + กำแพงทดสอบ 2 ชุด + จุดเกิดผู้เล่น/ศัตรูคงที่) — แยกจากเนื้อเรื่องและเซฟปกติ
import type { BakedMap } from '../maps/MapGeometry';
const W = 18, H = 14, WALLS: [number, number][] = [[9, 6], [9, 7], [12, 3]];
const rows = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1 || WALLS.some(([a, b]) => a === x && b === y) ? '#' : '.')).join(''));
export const ARENA_PLAYER = { x: 4.5, y: 7.5 }, ARENA_ENEMY = { x: 13.5, y: 7.5 };
export function arenaBaked(landId: string): BakedMap {
  return { schemaVersion: 1, id: 'test_arena', landId, mapIndex: 1, name: 'Development Arena (dev)', type: 'dungeon', w: W, h: H, rows, gates: [], chasms: [], blocks: [], blockers: [], portals: [], switches: [], searchSpots: [], chests: [], pickups: [], enemySpawns: [], npcSpots: [],
    spawnBack: { ...ARENA_PLAYER }, spawnFwd: { ...ARENA_PLAYER }, rooms: [{ x: 1, y: 1, w: W - 2, h: H - 2, cx: 9, cy: 7 }] };
}
/** วิ่งอัตโนมัติ (PROPOSED จาก Rulebook CP-005: 165→245 px/s หลังเดินต่อเนื่อง 2 วิ) — ยังไม่ยืนยันกับเจ้าของเกม */
export const ARENA_AUTORUN = { delay: 2, mult: 245 / 165 };
