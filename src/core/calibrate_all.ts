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
  origNearMiss: number;
  briefDeck: number;
  briefCwr: number;
  briefPass: number;
  briefAbsClose: number;
  briefNearMiss: number;
  peakDeck: number;
  peakCwr: number;
  peakPass: number;
  peakAbsClose: number;
  peakNearMiss: number;
  peakTotalDrama: number;
}

const summaryTable: LevelReportRow[] = [];

for (const lvlId of levels) {
  const jsonPath = resolve(levelsDir, `${lvlId}.json`);
  const raw = readFileSync(jsonPath, 'utf-8');
  const levelJson: LevelJSON = JSON.parse(raw);
  const origDeckSize = levelJson.settings.cards_in_stack.length;

  console.log(`[${lvlId}] Running baseline simulation (Deck: ${origDeckSize}, N=5,000)...`);
  const baseMetrics = runSimulationSync(levelJson, 5000, origDeckSize, 100);

  console.log(`[${lvlId}] Running Auto-Calibrator Mode A: Strict Brief (70% CWR, N=5,000)...`);
  const briefResult = calibrator.calibrate(levelJson, 5000);
  const briefMetrics = briefResult.bestMetrics;
  const briefDeck = briefResult.optimalDeckSize;

  console.log(`[${lvlId}] Running Auto-Calibrator Mode B: Multi-Objective Absolute Peak (N=5,000)...`);
  const peakResult = calibrator.calibrateAbsolutePeak(levelJson, 5000);
  const peakMetrics = peakResult.bestMetrics;
  const peakDeck = peakResult.optimalDeckSize;

  // Save calibrated level JSON (Strict Brief)
  const calibratedJson: LevelJSON = JSON.parse(JSON.stringify(levelJson));
  calibratedJson.settings.cards_in_stack = Array(briefDeck).fill(-1);
  const outPath = resolve(levelsDir, `${lvlId}_calibrated.json`);
  writeFileSync(outPath, JSON.stringify(calibratedJson, null, 4), 'utf-8');

  // Save peak calibrated level JSON
  const peakJson: LevelJSON = JSON.parse(JSON.stringify(levelJson));
  peakJson.settings.cards_in_stack = Array(peakDeck).fill(-1);
  const peakOutPath = resolve(levelsDir, `${lvlId}_peak_calibrated.json`);
  writeFileSync(peakOutPath, JSON.stringify(peakJson, null, 4), 'utf-8');

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
    origNearMiss: baseMetrics.nearMissRate,
    briefDeck,
    briefCwr: briefMetrics.closeWinRate,
    briefPass: briefMetrics.passRate,
    briefAbsClose: briefMetrics.absCloseWinRate,
    briefNearMiss: briefMetrics.nearMissRate,
    peakDeck,
    peakCwr: peakMetrics.closeWinRate,
    peakPass: peakMetrics.passRate,
    peakAbsClose: peakMetrics.absCloseWinRate,
    peakNearMiss: peakMetrics.nearMissRate,
    peakTotalDrama: peakMetrics.dramaticRate,
  });

  console.log(`  -> Mode A (Strict 70% CWR): Deck ${briefDeck} | CWR: ${briefMetrics.closeWinRate.toFixed(1)}% | Pass: ${briefMetrics.passRate.toFixed(1)}% | Abs Close: ${briefMetrics.absCloseWinRate.toFixed(1)}%`);
  console.log(`  -> Mode B (Absolute Peak):  Deck ${peakDeck} | CWR: ${peakMetrics.closeWinRate.toFixed(1)}% | Pass: ${peakMetrics.passRate.toFixed(1)}% | Abs Close: ${peakMetrics.absCloseWinRate.toFixed(1)}% | NearMiss: ${peakMetrics.nearMissRate.toFixed(1)}%`);
  console.log(`  -> Saved ${lvlId}_calibrated.json & ${lvlId}_peak_calibrated.json\n`);
}

console.log('========================================================================================================================');
console.log('MODE A: STRICT BRIEF TARGET (70% CLOSE WIN RATE)');
console.log('========================================================================================================================');
console.table(
  summaryTable.map((r) => ({
    'Level': r.id,
    'Mechanics': r.features,
    'Brief Deck': r.briefDeck,
    'CWR': `${r.briefCwr.toFixed(1)}%`,
    'Pass Rate': `${r.briefPass.toFixed(1)}%`,
    'Abs Close Wins (per 1k)': `${Math.round(r.briefAbsClose * 10)} players`,
    'Near Misses (per 1k)': `${Math.round(r.briefNearMiss * 10)} players`,
  }))
);

console.log('\n========================================================================================================================');
console.log('MODE B: MULTI-OBJECTIVE ABSOLUTE PEAK (BALANCED RETENTION + NEAR MISS EXPERIENCE)');
console.log('========================================================================================================================');
console.table(
  summaryTable.map((r) => ({
    'Level': r.id,
    'Mechanics': r.features,
    'Peak Deck': r.peakDeck,
    'Pass Rate': `${r.peakPass.toFixed(1)}%`,
    'CWR': `${r.peakCwr.toFixed(1)}%`,
    'Abs Close Wins (per 1k)': `${Math.round(r.peakAbsClose * 10)} players`,
    'Near Misses (per 1k)': `${Math.round(r.peakNearMiss * 10)} players`,
    'Total High Excitement': `${Math.round(r.peakTotalDrama * 10)} / 1,000 (${r.peakTotalDrama.toFixed(1)}%)`,
  }))
);
console.log('========================================================================================================================');

