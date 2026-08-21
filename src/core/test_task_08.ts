import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { LevelJSON } from './types.ts';
import { AutoCalibrator } from '../testing/AutoCalibrator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runTest() {
  console.log('========================================================================');
  console.log('🧪 TASK 08: FULL LEVEL ANALYSIS & DYNAMIC GOLDEN SEED BENCHMARK');
  console.log('========================================================================\n');

  const lvlPath = resolve(__dirname, '../../data/levels/level_25.json');
  const levelJson: LevelJSON = JSON.parse(readFileSync(lvlPath, 'utf-8'));

  const autoCalibrator = new AutoCalibrator();
  const startTime = performance.now();

  console.log(`Starting runFullLevelAnalysisAsync on ${levelJson.id}...`);
  const report = await autoCalibrator.runFullLevelAnalysisAsync(levelJson, {
    onProgress: (step, pct) => {
      console.log(`  [${pct}%] ${step}`);
    },
  });

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`\nAnalysis completed in ${elapsed}s!\n`);

  console.log('--- 1. SYMMETRIC CALIBRATION TARGETS (N = 2,000 runs each) ---');
  console.table([
    {
      'Target': '🎯 Target 1: Strict Brief (70% CWR)',
      'Deck': report.targetBrief.deckSize,
      'Pass Rate': `${report.targetBrief.metrics.passRate.toFixed(1)}% (${report.targetBrief.metrics.wins}/2k | ${Math.round(report.targetBrief.metrics.passRate*10)}/1k)`,
      'CWR': `${report.targetBrief.metrics.closeWinRate.toFixed(1)}% (${report.targetBrief.metrics.closeWins}/${report.targetBrief.metrics.wins})`,
      'Abs Close Wins': `${report.targetBrief.metrics.absCloseWinRate.toFixed(1)}% (${Math.round(report.targetBrief.metrics.absCloseWinRate*10)}/1k)`,
      'Near Misses': `${report.targetBrief.metrics.nearMissRate.toFixed(1)}% (${Math.round(report.targetBrief.metrics.nearMissRate*10)}/1k)`,
      'Drama Cohort': `${(report.targetBrief.metrics.dramaticRate * 10).toFixed(0)} / 1k`,
      'Deck/Bomb Loss': `${report.targetBrief.metrics.deckLossRate.toFixed(1)}% / ${report.targetBrief.metrics.bombLossRate.toFixed(1)}%`,
      'Median/Streak': `${report.targetBrief.metrics.medianRemainder} rem / ${report.targetBrief.metrics.avgStreak.toFixed(1)} str`,
    },
    {
      'Target': '⚡ Target 2: Retention Peak',
      'Deck': report.targetPeak.deckSize,
      'Pass Rate': `${report.targetPeak.metrics.passRate.toFixed(1)}% (${report.targetPeak.metrics.wins}/2k | ${Math.round(report.targetPeak.metrics.passRate*10)}/1k)`,
      'CWR': `${report.targetPeak.metrics.closeWinRate.toFixed(1)}% (${report.targetPeak.metrics.closeWins}/${report.targetPeak.metrics.wins})`,
      'Abs Close Wins': `${report.targetPeak.metrics.absCloseWinRate.toFixed(1)}% (${Math.round(report.targetPeak.metrics.absCloseWinRate*10)}/1k)`,
      'Near Misses': `${report.targetPeak.metrics.nearMissRate.toFixed(1)}% (${Math.round(report.targetPeak.metrics.nearMissRate*10)}/1k)`,
      'Drama Cohort': `${(report.targetPeak.metrics.dramaticRate * 10).toFixed(0)} / 1k`,
      'Deck/Bomb Loss': `${report.targetPeak.metrics.deckLossRate.toFixed(1)}% / ${report.targetPeak.metrics.bombLossRate.toFixed(1)}%`,
      'Median/Streak': `${report.targetPeak.metrics.medianRemainder} rem / ${report.targetPeak.metrics.avgStreak.toFixed(1)} str`,
    },
    {
      'Target': '📦 Target 3: Raw Baseline',
      'Deck': report.baseline.deckSize,
      'Pass Rate': `${report.baseline.metrics.passRate.toFixed(1)}% (${report.baseline.metrics.wins}/2k | ${Math.round(report.baseline.metrics.passRate*10)}/1k)`,
      'CWR': `${report.baseline.metrics.closeWinRate.toFixed(1)}% (${report.baseline.metrics.closeWins}/${report.baseline.metrics.wins})`,
      'Abs Close Wins': `${report.baseline.metrics.absCloseWinRate.toFixed(1)}% (${Math.round(report.baseline.metrics.absCloseWinRate*10)}/1k)`,
      'Near Misses': `${report.baseline.metrics.nearMissRate.toFixed(1)}% (${Math.round(report.baseline.metrics.nearMissRate*10)}/1k)`,
      'Drama Cohort': `${(report.baseline.metrics.dramaticRate * 10).toFixed(0)} / 1k`,
      'Deck/Bomb Loss': `${report.baseline.metrics.deckLossRate.toFixed(1)}% / ${report.baseline.metrics.bombLossRate.toFixed(1)}%`,
      'Median/Streak': `${report.baseline.metrics.medianRemainder} rem / ${report.baseline.metrics.avgStreak.toFixed(1)} str`,
    },
  ]);

  console.log(`\n--- 2. MULTI-PERSONA BENCHMARK (ON ${report.targetBrief.goldenSeedsMinedCount} FRESH GOLDEN SEEDS @ DECK ${report.targetBrief.deckSize}) ---`);
  console.table([
    {
      'Persona': '🟢 Expert / Pro',
      'Fresh Golden Pass': `${report.targetBrief.personaResultsGolden.expert.passRate.toFixed(1)}%`,
      'Random PRNG Pass': `${report.targetBrief.personaResultsRandom.expert.passRate.toFixed(1)}%`,
      'CWR': `${report.targetBrief.personaResultsGolden.expert.closeWinRate.toFixed(1)}%`,
      'Near Miss': `${report.targetBrief.personaResultsGolden.expert.nearMissRate.toFixed(1)}%`,
      'Bomb Defeat': `${report.targetBrief.personaResultsGolden.expert.bombLossRate.toFixed(1)}%`,
    },
    {
      'Persona': '🟡 Medium / Core',
      'Fresh Golden Pass': `${report.targetBrief.personaResultsGolden.medium.passRate.toFixed(1)}%`,
      'Random PRNG Pass': `${report.targetBrief.personaResultsRandom.medium.passRate.toFixed(1)}%`,
      'CWR': `${report.targetBrief.personaResultsGolden.medium.closeWinRate.toFixed(1)}%`,
      'Near Miss': `${report.targetBrief.personaResultsGolden.medium.nearMissRate.toFixed(1)}%`,
      'Bomb Defeat': `${report.targetBrief.personaResultsGolden.medium.bombLossRate.toFixed(1)}%`,
    },
    {
      'Persona': '🔴 Casual / Novice',
      'Fresh Golden Pass': `${report.targetBrief.personaResultsGolden.casual.passRate.toFixed(1)}%`,
      'Random PRNG Pass': `${report.targetBrief.personaResultsRandom.casual.passRate.toFixed(1)}%`,
      'CWR': `${report.targetBrief.personaResultsGolden.casual.closeWinRate.toFixed(1)}%`,
      'Near Miss': `${report.targetBrief.personaResultsGolden.casual.nearMissRate.toFixed(1)}%`,
      'Bomb Defeat': `${report.targetBrief.personaResultsGolden.casual.bombLossRate.toFixed(1)}%`,
    },
  ]);

  console.log(`\nSkill Expression Index: ΔPR = +${report.targetBrief.skillIndex.toFixed(1)}%`);
  console.log('========================================================================\n');
}

runTest().catch(console.error);
