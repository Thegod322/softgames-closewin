import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { LevelJSON } from './types.ts';
import { CardGraph, loadLevel } from './CardGraph.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const levelsDir = resolve(__dirname, '../../data/levels');

const levels = ['level_25', 'level_31', 'level_43', 'level_54'];

console.log('--- Testing Task 01: CardGraph & Level Ingestion ---');

for (const lvlId of levels) {
  const jsonPath = resolve(levelsDir, `${lvlId}.json`);
  const raw = readFileSync(jsonPath, 'utf-8');
  const levelJson: LevelJSON = JSON.parse(raw);

  const initial = loadLevel(levelJson, 100);
  console.log(`Loaded ${lvlId}:`);
  console.log(`  - Board Cards: ${initial.boardCards.length}`);
  console.log(`  - Draw Pile Size: ${initial.drawPile.length}`);

  const playableCount = initial.boardCards.filter((c) => c.isPlayable).length;
  console.log(`  - Initially Playable: ${playableCount}`);

  if (lvlId === 'level_25') {
    if (initial.boardCards.length !== 21) {
      throw new Error(`Expected 21 cards in level_25, got ${initial.boardCards.length}`);
    }
  } else if (lvlId === 'level_31') {
    if (initial.boardCards.length !== 24) {
      throw new Error(`Expected 24 cards in level_31, got ${initial.boardCards.length}`);
    }
    const locks = initial.boardCards.filter((c) => c.type === 'lock');
    const keys = initial.boardCards.filter((c) => c.type === 'key');
    const zaps = initial.boardCards.filter((c) => c.type === 'zap');
    console.log(`  - Locks: ${locks.length}, Keys: ${keys.length}, Zaps: ${zaps.length}`);
  } else if (lvlId === 'level_43') {
    if (initial.boardCards.length !== 28) {
      throw new Error(`Expected 28 cards in level_43, got ${initial.boardCards.length}`);
    }
  } else if (lvlId === 'level_54') {
    if (initial.boardCards.length !== 24) {
      throw new Error(`Expected 24 cards in level_54, got ${initial.boardCards.length}`);
    }
    const bombs = initial.boardCards.filter((c) => c.modifiers.some((m) => m.type === 'bomb'));
    console.log(`  - Bombs: ${bombs.length} (timer=${bombs[0]?.bombTimer})`);
  }
}

console.log('✅ Task 01 Verification Passed successfully!');
