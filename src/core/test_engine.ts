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
if (bombCard) {
  bombCard.faceUp = true; // Uncover bomb to test ticking mechanics
}

// 1. Drawing a card counts as a move per Candidate Task brief -> ticks down bomb timer
engine54.drawCard();
console.log(`  After Draw Card -> Bomb Timer: ${bombCard?.bombTimer} (Expected: 4)`);
if (bombCard?.bombTimer !== 4) {
  throw new Error(`Draw card must tick down bomb timer! Expected 4, got ${bombCard?.bombTimer}`);
}

// 2. Playing 4 more moves from the board decrements timer to 0 -> instant defeat
for (let i = 1; i <= 4; i++) {
  // Mock playable move by matching active card
  const active = engine54.getActiveCard();
  const dummyCard = Array.from(engine54.boardCards.values()).find((c) => c.id !== bombCard?.id)!;
  dummyCard.faceUp = true;
  engine54.cardGraph.coveredByMap.set(dummyCard.id, new Set());
  if (active) {
    dummyCard.rank = ((active.rank + 1) % 13) as any;
  }
  
  const res = engine54.playCard(dummyCard.id);
  console.log(`  Board Move ${i} -> Status: ${engine54.status}, Bomb Exploded: ${res.bombExploded}, Timer: ${bombCard?.bombTimer}`);
  if (i < 4 && engine54.status !== 'playing') {
    throw new Error(`Game should be playing before timer reaches 0`);
  }
}

if (engine54.status !== 'lost' || engine54.lossReason !== 'bomb_exploded') {
  throw new Error(`Expected lost with bomb_exploded, got status=${engine54.status}, reason=${engine54.lossReason}`);
}


// Test 3: Level 31 Key Collection & Lock Clearing
console.log('\nTest 3: Level 31 Key Collection & Lock Clearing');
const lvl31Json: LevelJSON = JSON.parse(
  readFileSync(resolve(levelsDir, 'level_31.json'), 'utf-8')
);
const initial31 = loadLevel(lvl31Json, 300);
const engine31 = new TripeaksEngine(initial31);

const keyCard = Array.from(engine31.boardCards.values()).find((c) => c.type === 'key')!;
const initialLocks = Array.from(engine31.boardCards.values()).filter((c) => c.type === 'lock');
console.log(`  Initial Key Found: ${keyCard.id}, Initial Locks: ${initialLocks.length}`);

// Uncover key card in graph so it becomes playable
engine31.cardGraph.coveredByMap.set(keyCard.id, new Set());
keyCard.faceUp = true;
const initialWasteLen = engine31.wastePile.length;
const playRes = engine31.playCard(keyCard.id);



console.log(`  Key Play Success: ${playRes.success}`);
console.log(`  Unlocked Cards: ${playRes.unlockedCardIds.join(', ')}`);
console.log(`  Waste Pile Length After Key: ${engine31.wastePile.length} (Expected: ${initialWasteLen})`);

const remainingLocks = Array.from(engine31.boardCards.values()).filter((c) => c.type === 'lock');
console.log(`  Remaining Locks on Board: ${remainingLocks.length} (Expected: 0)`);

if (remainingLocks.length !== 0) {
  throw new Error(`Expected 0 remaining locks, got ${remainingLocks.length}`);
}
if (engine31.wastePile.length !== initialWasteLen) {
  throw new Error(`Waste pile should not change when key is collected`);
}

console.log('✅ Task 02 Verification Passed successfully!');

