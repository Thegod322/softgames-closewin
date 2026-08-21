import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { LevelJSON } from './types.ts';
import { runSimulationSync } from '../workers/sim.worker.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const levelsDir = resolve(__dirname, '../../data/levels');

const levels = ['level_25', 'level_31', 'level_43', 'level_54'];

console.log('========================================================================================');
console.log('🔬 DEEP DIAGNOSTIC SWEEP: PASS RATE vs CLOSE WIN RATE (CWR)');
console.log('========================================================================================\n');

for (const lvlId of levels) {
  const jsonPath = resolve(levelsDir, `${lvlId}.json`);
  const raw = readFileSync(jsonPath, 'utf-8');
  const levelJson: LevelJSON = JSON.parse(raw);

  console.log(`\n================== [ ${lvlId} ] ==================`);
  console.log(`Board Cards: ${levelJson.cards.length} | Default Deck: ${levelJson.settings.cards_in_stack.length}`);
  console.log('Deck Size | Pass Rate | Close Win Rate (CWR) | Abs Close Wins % (CWR * Pass) | Median Remainder | Losses (Deck / Bomb)');
  console.log('-------------------------------------------------------------------------------------------------------------');

  const deckSizesToTest = [10, 12, 14, 15, 16, 18, 20, 22, 25, 28, 31, 35];

  for (const k of deckSizesToTest) {
    const m = runSimulationSync(levelJson, 2000, k, 123);
    const absCloseWinPct = (m.closeWins / m.totalGames) * 100;
    console.log(
      `${String(k).padStart(9)} | ` +
      `${m.passRate.toFixed(1).padStart(8)}% | ` +
      `${m.closeWinRate.toFixed(1).padStart(19)}% | ` +
      `${absCloseWinPct.toFixed(1).padStart(28)}% | ` +
      `${String(m.medianRemainder).padStart(16)} | ` +
      `Deck: ${m.deckLossRate.toFixed(1)}% / Bomb: ${m.bombLossRate.toFixed(1)}%`
    );
  }
}
