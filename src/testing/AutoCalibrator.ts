import {
  BotConfig,
  LevelAnalysisReport,
  LevelJSON,
  PERSONA_PRESETS,
  PersonaType,
  SimulationMetrics,
} from '../core/types.ts';
import { runSimulationAsync, runSimulationSync } from '../workers/sim.worker.ts';
import { SeedMiner } from '../core/SeedMiner.ts';

export interface CalibrationStep {
  deckSize: number;
  metrics: SimulationMetrics;
  delta: number;
}

export interface CalibrationResult {
  optimalDeckSize: number;
  bestMetrics: SimulationMetrics;
  history: CalibrationStep[];
  converged: boolean;
}

export class AutoCalibrator {
  public calibrate(
    levelJson: LevelJSON,
    simCountPerStep: number = 2000,
    targetCWR: number = 70.0,
    tolerance: number = 2.0,
    seedOffset: number = 42,
    botConfig?: Partial<BotConfig>,
    onStep?: (step: CalibrationStep) => void,
    goldenSeeds?: number[]
  ): CalibrationResult {
    const history: CalibrationStep[] = [];
    let bestStep: CalibrationStep | null = null;
    let minDeltaAbs = Infinity;

    let minK = 5;
    let maxK = 42;

    // Binary search / Bisection over deck size K
    while (minK <= maxK) {
      const midK = Math.floor((minK + maxK) / 2);
      const metrics = runSimulationSync(levelJson, simCountPerStep, midK, seedOffset, botConfig, undefined, goldenSeeds);
      const delta = metrics.closeWinRate - targetCWR;

      const step: CalibrationStep = {
        deckSize: midK,
        metrics,
        delta,
      };
      history.push(step);
      onStep?.(step);

      const deltaAbs = Math.abs(delta);
      if (deltaAbs < minDeltaAbs) {
        minDeltaAbs = deltaAbs;
        bestStep = step;
      }

      if (deltaAbs <= tolerance) {
        return {
          optimalDeckSize: midK,
          bestMetrics: metrics,
          history,
          converged: true,
        };
      }

      if (delta > 0) {
        minK = midK + 1;
      } else {
        maxK = midK - 1;
      }
    }

    return {
      optimalDeckSize: bestStep ? bestStep.deckSize : levelJson.settings.cards_in_stack.length,
      bestMetrics: bestStep ? bestStep.metrics : runSimulationSync(levelJson, simCountPerStep, undefined, seedOffset, botConfig, undefined, goldenSeeds),
      history,
      converged: minDeltaAbs <= 4.0,
    };
  }

  public async calibrateAsync(
    levelJson: LevelJSON,
    simCountPerStep: number = 2000,
    targetCWR: number = 70.0,
    tolerance: number = 2.0,
    seedOffset: number = 42,
    botConfig?: Partial<BotConfig>,
    onStep?: (step: CalibrationStep) => void,
    goldenSeeds?: number[]
  ): Promise<CalibrationResult> {
    const history: CalibrationStep[] = [];
    let bestStep: CalibrationStep | null = null;
    let minDeltaAbs = Infinity;

    let minK = 5;
    let maxK = 42;

    while (minK <= maxK) {
      const midK = Math.floor((minK + maxK) / 2);
      const metrics = await runSimulationAsync(levelJson, simCountPerStep, midK, seedOffset, botConfig, undefined, goldenSeeds);
      const delta = metrics.closeWinRate - targetCWR;

      const step: CalibrationStep = {
        deckSize: midK,
        metrics,
        delta,
      };
      history.push(step);
      onStep?.(step);

      const deltaAbs = Math.abs(delta);
      if (deltaAbs < minDeltaAbs) {
        minDeltaAbs = deltaAbs;
        bestStep = step;
      }

      if (deltaAbs <= tolerance) {
        return {
          optimalDeckSize: midK,
          bestMetrics: metrics,
          history,
          converged: true,
        };
      }

      if (delta > 0) {
        minK = midK + 1;
      } else {
        maxK = midK - 1;
      }
    }

    return {
      optimalDeckSize: bestStep ? bestStep.deckSize : levelJson.settings.cards_in_stack.length,
      bestMetrics: bestStep ? bestStep.metrics : await runSimulationAsync(levelJson, simCountPerStep, undefined, seedOffset, botConfig, undefined, goldenSeeds),
      history,
      converged: minDeltaAbs <= 4.0,
    };
  }

  public calibrateAbsolutePeak(
    levelJson: LevelJSON,
    simCountPerStep: number = 2000,
    seedOffset: number = 42,
    botConfig?: Partial<BotConfig>,
    onStep?: (step: CalibrationStep) => void,
    goldenSeeds?: number[]
  ): CalibrationResult {
    const history: CalibrationStep[] = [];
    let bestStep: CalibrationStep | null = null;
    let maxScore = -Infinity;

    const candidates = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 31, 35];

    for (const k of candidates) {
      const metrics = runSimulationSync(levelJson, simCountPerStep, k, seedOffset, botConfig, undefined, goldenSeeds);
      const score = metrics.absCloseWinRate + 0.4 * metrics.nearMissRate;

      const step: CalibrationStep = {
        deckSize: k,
        metrics,
        delta: score,
      };
      history.push(step);
      onStep?.(step);

      if (score > maxScore) {
        maxScore = score;
        bestStep = step;
      }
    }

    return {
      optimalDeckSize: bestStep ? bestStep.deckSize : levelJson.settings.cards_in_stack.length,
      bestMetrics: bestStep ? bestStep.metrics : runSimulationSync(levelJson, simCountPerStep, undefined, seedOffset, botConfig, undefined, goldenSeeds),
      history,
      converged: true,
    };
  }

  public async calibrateAbsolutePeakAsync(
    levelJson: LevelJSON,
    simCountPerStep: number = 2000,
    seedOffset: number = 42,
    botConfig?: Partial<BotConfig>,
    onStep?: (step: CalibrationStep) => void,
    goldenSeeds?: number[]
  ): Promise<CalibrationResult> {
    const history: CalibrationStep[] = [];
    let bestStep: CalibrationStep | null = null;
    let maxScore = -Infinity;

    const candidates = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 31, 35];

    for (const k of candidates) {
      const metrics = await runSimulationAsync(levelJson, simCountPerStep, k, seedOffset, botConfig, undefined, goldenSeeds);
      const score = metrics.absCloseWinRate + 0.4 * metrics.nearMissRate;

      const step: CalibrationStep = {
        deckSize: k,
        metrics,
        delta: score,
      };
      history.push(step);
      onStep?.(step);

      if (score > maxScore) {
        maxScore = score;
        bestStep = step;
      }
    }

      return {
        optimalDeckSize: bestStep ? bestStep.deckSize : levelJson.settings.cards_in_stack.length,
        bestMetrics: bestStep ? bestStep.metrics : await runSimulationAsync(levelJson, simCountPerStep, undefined, seedOffset, botConfig, undefined, goldenSeeds),
        history,
        converged: true,
      };
    }

  public async evaluateTargetCalibrationDataAsync(
    levelJson: LevelJSON,
    targetName: string,
    deckSize: number,
    baseMetrics: SimulationMetrics,
    seedOffset: number,
    botConfig?: Partial<BotConfig>,
    onProgress?: (desc: string, pct: number) => void,
    startPct: number = 0,
    endPct: number = 100
  ): Promise<import('../core/types.ts').TargetCalibrationData> {
    const range = endPct - startPct;
    onProgress?.(`${targetName}: Mining 150 verified Golden Seeds (@ ${deckSize} cards)...`, startPct + range * 0.1);

    const miningResult = await SeedMiner.mineGoldenSeedsAsync(
      levelJson,
      150,
      deckSize,
      1,
      40000,
      botConfig,
      (scanned, found) => {
        const p = startPct + range * (0.1 + (found / 150) * 0.4);
        onProgress?.(`${targetName}: Mined ${found}/150 seeds (@ ${deckSize} cards, scanned: ${scanned})...`, p);
      }
    );

    const minedSeeds = miningResult.goldenSeeds;
    const seedIds = minedSeeds.map((s) => s.seed);

    const personaTypes: PersonaType[] = ['casual', 'medium', 'expert'];
    const personaResultsGolden: Record<PersonaType, SimulationMetrics> = {} as any;
    const personaResultsRandom: Record<PersonaType, SimulationMetrics> = {} as any;

    let pIdx = 0;
    for (const pType of personaTypes) {
      const profile = PERSONA_PRESETS[pType];
      pIdx++;
      const pProgressBase = startPct + range * (0.5 + (pIdx / 3) * 0.48);

      onProgress?.(`${targetName}: Simulating ${profile.name} on ${minedSeeds.length} Golden Seeds (@ ${deckSize} cards)...`, pProgressBase - range * 0.08);
      personaResultsGolden[pType] = await runSimulationAsync(
        levelJson,
        600,
        deckSize,
        seedOffset,
        profile.botConfig,
        undefined,
        seedIds.length > 0 ? seedIds : undefined
      );

      onProgress?.(`${targetName}: Simulating ${profile.name} on 600 Random Deals (@ ${deckSize} cards)...`, pProgressBase);
      personaResultsRandom[pType] = await runSimulationAsync(
        levelJson,
        600,
        deckSize,
        seedOffset,
        profile.botConfig,
        undefined,
        undefined
      );
    }

    const skillIndex = Math.max(
      0,
      personaResultsGolden.expert.passRate - personaResultsGolden.casual.passRate
    );

    return {
      deckSize,
      metrics: baseMetrics,
      minedGoldenSeeds: minedSeeds,
      goldenSeedsMinedCount: minedSeeds.length,
      personaResultsGolden,
      personaResultsRandom,
      skillIndex,
    };
  }

  public async runFullLevelAnalysisAsync(
    levelJson: LevelJSON,
    options?: {
      onProgress?: (stageDesc: string, pct: number) => void;
      seedOffset?: number;
      botConfig?: Partial<BotConfig>;
    }
  ): Promise<LevelAnalysisReport> {
    const seedOffset = options?.seedOffset ?? 42;
    const onProgress = options?.onProgress;

    // Stage 1: Target 1 - Strict Brief (70% CWR) Calibration via Bisection Search
    onProgress?.('Target: Calibrating 70% Close Win Deck Size (Stochastic PRNG)...', 10);
    const targetBriefResult = await this.calibrateAsync(
      levelJson,
      2000,
      70.0,
      2.0,
      seedOffset,
      options?.botConfig,
      (step) => {
        onProgress?.(`Target: Testing Deck ${step.deckSize} cards (CWR: ${step.metrics.closeWinRate.toFixed(1)}%)...`, 25);
      },
      undefined
    );

    // Stage 2: Target 1 Dynamic Mining & 3-Persona Benchmark
    const targetBrief = await this.evaluateTargetCalibrationDataAsync(
      levelJson,
      'Target (70% CWR)',
      targetBriefResult.optimalDeckSize,
      targetBriefResult.bestMetrics,
      seedOffset,
      options?.botConfig,
      onProgress,
      30,
      98
    );

    onProgress?.('Compiling Level Analysis Report...', 100);

    return {
      levelId: levelJson.id,
      targetBrief,
    };
  }
}
