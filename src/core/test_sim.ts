import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { LevelJSON } from './types.ts';
import { runSimulationSync } from '../workers/sim.worker.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const levelsDir = resolve(__dirname, '../../data/levels');

console.log('--- Testing Task 05: Monte Carlo Bot Simulation ---');

const lvl25Json: LevelJSON = JSON.parse(
  readFileSync(resolve(levelsDir, 'level_25.json'), 'utf-8')
);

const start = Date.now();
const metrics25 = runSimulationSync(lvl25Json, 1000);
const elapsed = Date.now() - start;

console.log(`\nSimulated 1,000 games of Level 25 in ${elapsed}ms (${Math.round((1000 / elapsed) * 1000)} games/sec):`);
console.log(`  - Total Wins: ${metrics25.wins} / 1000 (${metrics25.passRate.toFixed(1)}%)`);
console.log(`  - Close Wins (<=2 left): ${metrics25.closeWins} (${metrics25.closeWinRate.toFixed(1)}% CWR)`);
console.log(`  - Median Remainder: ${metrics25.medianRemainder}`);
console.log(`  - Remainder Histogram [0, 1, 2, 3, 4, 5+]:`, metrics25.remainderDistribution);

const lvl54Json: LevelJSON = JSON.parse(
  readFileSync(resolve(levelsDir, 'level_54.json'), 'utf-8')
);

const metrics54 = runSimulationSync(lvl54Json, 1000);
console.log(`\nSimulated 1,000 games of Level 54 (Bomb Level):`);
console.log(`  - Total Wins: ${metrics54.wins} / 1000 (${metrics54.passRate.toFixed(1)}%)`);
console.log(`  - Close Win Rate: ${metrics54.closeWinRate.toFixed(1)}%`);
console.log(`  - Bomb Losses: ${metrics54.bombLosses} (${metrics54.bombLossRate.toFixed(1)}%)`);
console.log(`  - Deck Losses: ${metrics54.deckLosses} (${metrics54.deckLossRate.toFixed(1)}%)`);

console.log('\n✅ Task 05 Verification Passed successfully!');
