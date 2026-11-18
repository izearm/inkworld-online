import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createContext, runInContext } from 'node:vm';

function runtime() {
  const PD = { U: { uid: () => 'test-item' } };
  const context = createContext({ PD, PD_DATA: {}, performance });
  context.window = context;
  for (const file of ['data/config', 'data/stats', 'data/weapons', 'data/enemies', 'data/artifacts', 'js/stats', 'js/loot', 'js/element', 'js/status', 'js/combat', 'js/ending', 'js/game']) {
    const source = new URL('../src/engine/' + file + '.ts', import.meta.url);
    runInContext(readFileSync(source, 'utf8'), context, { filename: source.pathname });
  }
  return { PD, data: context.PD_DATA };
}

test('current equipment pools omit retired defense affixes and still fill all rows', () => {
  const { PD, data } = runtime();
  for (const [pool, options] of Object.entries(data.affixPools)) {
    for (const id of ['physPen', 'physReduce', 'magicReduce']) assert.ok(!(id in options));
    const rows = PD.Loot.rollTierAffixes(() => 0.1, 50, 'mythic', pool);
    assert.equal(rows.length, 6);
    assert.equal(new Set(rows.map(row => row.id)).size, 6);
    for (const row of rows) assert.equal(row.tier, row.kind === 'main' ? 5 : 4);
  }
});

test('thornblob DEF applies to physical hits and MDEF applies to magic hits', () => {
  const { PD, data } = runtime();
  const game = PD.Game;
  game.S = {};
  game.derived = { physPen: 1 };
  const stop = new Error('HP updated');
  game.sparks = () => { throw stop; };
  game.floater = () => { throw stop; };
  const enemy = { def: data.enemies.thornblob, hp: 100 };
  assert.equal(enemy.def.def, 0.35);
  assert.equal(enemy.def.mdef, 0);
  assert.throws(() => game.damageEnemy(enemy, { dmg: 50 }), error => error === stop);
  assert.equal(enemy.hp, 67);
  enemy.hp = 100;
  assert.throws(() => game.damageEnemy(enemy, { dmg: 50, magic: true }), error => error === stop);
  assert.equal(enemy.hp, 50);
});

test('level 50 unmodified crit and final Artifact values', () => {
  const { PD, data } = runtime();
  const weapon = PD.Loot.make('sword', 'normal', 50, () => 0.5);
  const stats = PD.Stats.derive({ cls: 'drawer', level: 50, weapon });
  assert.ok(Math.abs(stats.crit - .15) < 1e-9);
  assert.equal(data.artifactCellValue('bolt', 'INT', 'legendary').val, 25);
});

