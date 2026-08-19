import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { LevelJSON } from './types.ts';
import { runSimulationSync } from '../workers/sim.worker.ts';
import { AutoCalibrator } from '../testing/AutoCalibrator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const levelsDir = resolve(__dirname, '../../data/levels');

const levels = ['level_25', 'level_31', 'level_43', 'level_54'];

console.log('===============================================================');
console.log('🚀 SOFTGAMES "OPERATION CLOSE WIN" PRODUCTION CALIBRATION (N=5,000)');
console.log('===============================================================\n');

const calibrator = new AutoCalibrator();

interface LevelReportRow {
  id: string;
  features: string;
  origDeck: number;
  origCwr: number;
  origPass: number;
  calibDeck: number;
  calibCwr: number;
  calibPass: number;
  medianRem: number;
  bombLossRate: number;
}

const summaryTable: LevelReportRow[] = [];

for (const lvlId of levels) {
  const jsonPath = resolve(levelsDir, `${lvlId}.json`);
  const raw = readFileSync(jsonPath, 'utf-8');
  const levelJson: LevelJSON = JSON.parse(raw);
  const origDeckSize = levelJson.settings.cards_in_stack.length;

  console.log(`[${lvlId}] Running baseline simulation (Deck: ${origDeckSize}, N=5,000)...`);
  const baseMetrics = runSimulationSync(levelJson, 5000, origDeckSize, 100);

  console.log(`[${lvlId}] Running Auto-Calibrator targeting 70% CWR (N=5,000 per candidate)...`);
  const calibResult = calibrator.calibrate(levelJson, 5000);

  const calibMetrics = calibResult.bestMetrics;
  const optimalDeck = calibResult.optimalDeckSize;

  // Save calibrated level JSON
  const calibratedJson: LevelJSON = JSON.parse(JSON.stringify(levelJson));
  calibratedJson.settings.cards_in_stack = Array(optimalDeck).fill(-1);
  const outPath = resolve(levelsDir, `${lvlId}_calibrated.json`);
  writeFileSync(outPath, JSON.stringify(calibratedJson, null, 4), 'utf-8');

  let features = 'Standard';
  if (lvlId === 'level_31') features = 'Zap + 2 Locks + 1 Key';
  if (lvlId === 'level_43') features = 'Complex Multi-Layer (28 cards)';
  if (lvlId === 'level_54') features = 'Bomb Timer (T=5)';

  summaryTable.push({
    id: lvlId,
    features,
    origDeck: origDeckSize,
    origCwr: baseMetrics.closeWinRate,
    origPass: baseMetrics.passRate,
    calibDeck: optimalDeck,
    calibCwr: calibMetrics.closeWinRate,
    calibPass: calibMetrics.passRate,
    medianRem: calibMetrics.medianRemainder,
    bombLossRate: calibMetrics.bombLossRate,
  });

  console.log(`  -> Baseline: Deck ${origDeckSize} | CWR: ${baseMetrics.closeWinRate.toFixed(1)}% | Pass: ${baseMetrics.passRate.toFixed(1)}%`);
  console.log(`  -> Calibrated: Deck ${optimalDeck} | CWR: ${calibMetrics.closeWinRate.toFixed(1)}% | Pass: ${calibMetrics.passRate.toFixed(1)}% | Median: ${calibMetrics.medianRemainder}`);
  console.log(`  -> Saved ${lvlId}_calibrated.json\n`);
}

console.log('========================================================================================');
console.log('FINAL LEVEL CALIBRATION SUMMARY TABLE');
console.log('========================================================================================');
console.table(
  summaryTable.map((r) => ({
    'Level ID': r.id,
    'Mechanics': r.features,
    'Orig Deck': r.origDeck,
    'Orig CWR': `${r.origCwr.toFixed(1)}%`,
    'Orig Pass': `${r.origPass.toFixed(1)}%`,
    'Calib Deck': r.calibDeck,
    'Calib CWR (Target: 70%)': `${r.calibCwr.toFixed(1)}%`,
    'Calib Pass Rate': `${r.calibPass.toFixed(1)}%`,
    'Median Rem': `${r.medianRem} cards`,
    'Bomb Loss %': `${r.bombLossRate.toFixed(1)}%`,
  }))
);
console.log('========================================================================================');
