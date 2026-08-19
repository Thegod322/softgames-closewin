import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { LevelJSON } from './types.ts';
import { loadLevel } from './CardGraph.ts';
import { TripeaksEngine } from './TripeaksEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const levelsDir = resolve(__dirname, '../../data/levels');

console.log('--- Testing Task 02: TripeaksEngine & Game Rules ---');

// Test 1: Basic Game Initialization & Undo
const lvl25Json: LevelJSON = JSON.parse(
  readFileSync(resolve(levelsDir, 'level_25.json'), 'utf-8')
);
const initial25 = loadLevel(lvl25Json, 100);
const engine = new TripeaksEngine(initial25);

console.log('Test 1: Level 25 Initialization');
console.log(`  Initial Status: ${engine.status}`);
console.log(`  Waste Pile Top: ${engine.getActiveCard()?.rank} of ${engine.getActiveCard()?.suit}`);
console.log(`  Draw Pile Remaining: ${engine.drawPile.length}`);

const initialDrawPileLength = engine.drawPile.length;
engine.drawCard();
console.log(`  After Draw -> Draw Pile: ${engine.drawPile.length}, Waste: ${engine.wastePile.length}`);
if (engine.drawPile.length !== initialDrawPileLength - 1) {
  throw new Error('Draw card did not decrement draw pile');
}

engine.undo();
console.log(`  After Undo -> Draw Pile: ${engine.drawPile.length}, Waste: ${engine.wastePile.length}`);
if (engine.drawPile.length !== initialDrawPileLength) {
  throw new Error('Undo did not restore draw pile length');
}

// Test 2: Level 54 Bomb Mechanics
console.log('\nTest 2: Level 54 Bomb Ticking & Explosion');
const lvl54Json: LevelJSON = JSON.parse(
  readFileSync(resolve(levelsDir, 'level_54.json'), 'utf-8')
);
const initial54 = loadLevel(lvl54Json, 200);
const engine54 = new TripeaksEngine(initial54);

const bombCard = Array.from(engine54.boardCards.values()).find(
  (c) => c.bombTimer !== undefined
);
console.log(`  Initial Bomb Card Timer: ${bombCard?.bombTimer}`);
if (bombCard?.bombTimer !== 5) {
  throw new Error(`Expected bomb timer 5, got ${bombCard?.bombTimer}`);
}

// Perform 5 draws to trigger bomb detonation
for (let i = 1; i <= 5; i++) {
  const res = engine54.drawCard();
  console.log(`  Move ${i} -> Status: ${engine54.status}, Bomb Exploded: ${res.bombExploded}`);
  if (i < 5 && engine54.status !== 'playing') {
    throw new Error(`Game should be playing before 5th move`);
  }
}

if (engine54.status !== 'lost' || engine54.lossReason !== 'bomb_exploded') {
  throw new Error(`Expected lost with bomb_exploded, got status=${engine54.status}, reason=${engine54.lossReason}`);
}

console.log('✅ Task 02 Verification Passed successfully!');
