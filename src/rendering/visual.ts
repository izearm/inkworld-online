// Visual resolution (ไม่พึ่ง Phaser): เลือก procedural หรือ sprite จากข้อมูล + fallback ถ้า asset หาย
// กฎ: hitbox/collision มาจาก gameplay data (monster.size) เท่านั้น — ไม่อ่านขนาดภาพ
import type { VisualDef } from '../data/schemas';
export type AnimState = 'idle' | 'move' | 'attack' | 'windup' | 'hurt';
export interface ResolvedVisual { def: VisualDef; fallback: boolean; error?: string }
/** hasTexture: ตัวตรวจว่า asset โหลดแล้ว (ใน Phaser = scene.textures.exists) */
export function resolveVisual(def: VisualDef, hasTexture: (key: string) => boolean, fallbackShape = 'ghost'): ResolvedVisual {
  if (def.type === 'sprite' && !hasTexture(def.textureKey))
    return { def: { type: 'procedural', shape: fallbackShape as any, scale: def.scale, flags: {}, floatPx: def.floatPx, dashed: true }, fallback: true, error: `ไม่พบ texture "${def.textureKey}" (${def.file}) — ใช้ภาพแทนชั่วคราว` };
  return { def, fallback: false };
}
/** สถานะ gameplay → เฟรมของ sprite (ถ้าไม่มี anim ของสถานะนั้น ใช้ idle → เฟรม 0) */
export function framesFor(def: VisualDef, state: AnimState): { frames: number[]; fps: number; loop: boolean } {
  if (def.type !== 'sprite') return { frames: [0], fps: 1, loop: true };
  const a = def.anims[state] ?? def.anims.idle; return a ? { frames: a.frames, fps: a.fps, loop: a.loop } : { frames: [0], fps: 1, loop: true };
}
/** ความลึกจากตำแหน่งเท้า (เหมือน legacy: ศัตรู/ผู้เล่น x+y, กำแพง i+j+1, เท่ากันให้กำแพงวาดก่อน) */
export const entityDepth = (x: number, y: number) => x + y;
export const wallDepth = (i: number, j: number) => i + j + 1 - 1e-6;
/** รัศมีชนของมอนสเตอร์ — มาจาก size เท่านั้น (legacy game.js spawnEnemy) */
export const monsterRadius = (m: { size: number; boss?: boolean }) => 0.3 * (m.size || 1) * (m.boss ? 0.8 : 1);
