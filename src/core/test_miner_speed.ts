import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { LevelJSON } from './types.ts';
import { loadLevel } from './CardGraph.ts';
import { TripeaksEngine } from './TripeaksEngine.ts';
import { MonteCarloBot } from './MonteCarloBot.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const lvlPath = resolve(__dirname, '../../data/levels/level_25.json');
const levelJson: LevelJSON = JSON.parse(readFileSync(lvlPath, 'utf-8'));

console.log('Testing raw mining speed for Level 25...');
const startTime = performance.now();

const bot = new MonteCarloBot();
const goldenSeeds: number[] = [];
let scanned = 0;
let seed = 1;
const targetCount = 5000;
const deckSize = 22; // Healthy deck size for level 25

while (goldenSeeds.length < targetCount && scanned < 50000) {
  scanned++;
  const initial = loadLevel(levelJson, seed, deckSize);
  const engine = new TripeaksEngine(initial);
  const result = bot.playGame(engine);

  // Candidate must be a WIN with remainder <= 2 (Close Win)
  if (result.status === 'won' && result.remainderCards <= 2) {
    // Multi-run validation (verify deterministic/stochastic consistency)
    let passedValidation = true;
    for (let testRun = 0; testRun < 2; testRun++) {
      const vInitial = loadLevel(levelJson, seed, deckSize);
      const vEngine = new TripeaksEngine(vInitial);
      const vResult = bot.playGame(vEngine);
      if (vResult.status !== 'won' || vResult.remainderCards > 2) {
        passedValidation = false;
        break;
      }
    }
    if (passedValidation) {
      goldenSeeds.push(seed);
    }
  }
  seed++;
}

const elapsedMs = performance.now() - startTime;
console.log(`Mined ${goldenSeeds.length} verified Golden Seeds in ${elapsedMs.toFixed(0)}ms (${(scanned / (elapsedMs / 1000)).toFixed(0)} seeds/sec)`);
console.log(`Total Scanned: ${scanned}, Yield Rate: ${((goldenSeeds.length / scanned) * 100).toFixed(1)}%`);
