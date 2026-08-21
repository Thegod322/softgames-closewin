import { BotConfig, GoldenSeedEntry, LevelJSON, MiningResult, SeedCategory, SimulationMetrics } from './types.ts';
import { loadLevel } from './CardGraph.ts';
import { TripeaksEngine } from './TripeaksEngine.ts';
import { MonteCarloBot } from './MonteCarloBot.ts';
import { runSimulationSync } from '../workers/sim.worker.ts';

export class SeedMiner {
  /**
   * Deep multi-run verification of a candidate seed.
   * Ensures the seed is 100% winnable with a close win remainder (<= 2 cards).
   */
  public static validateGoldenCloseWin(
    levelJson: LevelJSON,
    seed: number,
    deckSize?: number,
    botConfig?: Partial<BotConfig>,
    validationRuns: number = 2
  ): GoldenSeedEntry | null {
    const bot = new MonteCarloBot(botConfig);

    // Initial check
    const initial = loadLevel(levelJson, seed, deckSize);
    const engine = new TripeaksEngine(initial);
    const firstResult = bot.playGame(engine);

    if (firstResult.status !== 'won' || firstResult.remainderCards > 2) {
      return null;
    }

    // Multi-run confirmation
    let totalStreak = firstResult.maxStreak;
    let totalMoves = firstResult.movesCount;
    let totalRemainder = firstResult.remainderCards;

    for (let run = 1; run < validationRuns; run++) {
      const vInitial = loadLevel(levelJson, seed, deckSize);
      const vEngine = new TripeaksEngine(vInitial);
      const vResult = bot.playGame(vEngine);

      if (vResult.status !== 'won' || vResult.remainderCards > 2) {
        return null; // Not 100% stable
      }

      totalStreak += vResult.maxStreak;
      totalMoves += vResult.movesCount;
      totalRemainder += vResult.remainderCards;
    }

    return {
      seed,
      category: 'close_win',
      remainder: Math.round(totalRemainder / validationRuns),
      boardCardsLeft: 0,
      moves: Math.round(totalMoves / validationRuns),
      maxStreak: Math.round(totalStreak / validationRuns),
      status: 'won',
    };
  }

  /**
   * Evaluate a single seed and return its classification and gameplay metrics.
   */
  public static evaluateSingleSeed(
    levelJson: LevelJSON,
    seed: number,
    deckSize?: number,
    botConfig?: Partial<BotConfig>
  ): GoldenSeedEntry {
    const initial = loadLevel(levelJson, seed, deckSize);
    const engine = new TripeaksEngine(initial);
    const bot = new MonteCarloBot(botConfig);
    const result = bot.playGame(engine);

    let category: SeedCategory = 'loss';
    if (result.status === 'won') {
      category = result.remainderCards <= 2 ? 'close_win' : 'standard_win';
    } else {
      category = result.remainingBoardCards <= 2 ? 'near_miss' : 'loss';
    }

    return {
      seed,
      category,
      remainder: result.remainderCards,
      boardCardsLeft: result.remainingBoardCards,
      moves: result.movesCount,
      maxStreak: result.maxStreak,
      status: result.status,
      lossReason: result.lossReason,
    };
  }

  /**
   * Test a specific seed across multiple simulation runs
   * to verify its stability and metrics.
   */
  public static testSingleSeedMultiRuns(
    levelJson: LevelJSON,
    seed: number,
    runs: number = 100,
    deckSize?: number,
    botConfig?: Partial<BotConfig>
  ): SimulationMetrics {
    const goldenPool = Array(runs).fill(seed);
    return runSimulationSync(levelJson, runs, deckSize, 0, botConfig, undefined, goldenPool);
  }

  /**
   * Asynchronous web-worker friendly seed mining loop with progress reporting.
   * Continues until targetCount (default 5,000) verified golden seeds are mined.
   */
  public static async mineGoldenSeedsAsync(
    levelJson: LevelJSON,
    targetCount: number = 5000,
    deckSize?: number,
    startSeed: number = 1,
    maxScan: number = 100000,
    botConfig?: Partial<BotConfig>,
    onProgress?: (scanned: number, found: number, yieldRate: number, speed: number, latestSeed?: GoldenSeedEntry) => void,
    abortSignal?: { aborted: boolean }
  ): Promise<MiningResult> {
    const startTime = performance.now();
    const goldenSeeds: GoldenSeedEntry[] = [];
    let closeWinCount = 0;

    let scanned = 0;
    let currentSeed = startSeed;
    const batchSize = 100;

    while (scanned < maxScan && goldenSeeds.length < targetCount && !abortSignal?.aborted) {
      const currentBatch = Math.min(batchSize, maxScan - scanned);

      for (let i = 0; i < currentBatch; i++) {
        if (abortSignal?.aborted) break;

        const seedToTest = currentSeed + scanned;
        const verifiedEntry = this.validateGoldenCloseWin(levelJson, seedToTest, deckSize, botConfig, 2);

        if (verifiedEntry) {
          goldenSeeds.push(verifiedEntry);
          closeWinCount++;

          if (goldenSeeds.length >= targetCount) {
            scanned += i + 1;
            break;
          }
        }
        scanned++;
      }

      const elapsedSec = (performance.now() - startTime) / 1000;
      const speed = elapsedSec > 0 ? Math.round(scanned / elapsedSec) : 0;
      const yieldRate = scanned > 0 ? (goldenSeeds.length / scanned) * 100 : 0;

      onProgress?.(
        scanned,
        goldenSeeds.length,
        yieldRate,
        speed,
        goldenSeeds[goldenSeeds.length - 1]
      );

      // Yield control to UI event loop
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const elapsedMs = Math.round(performance.now() - startTime);

    return {
      levelId: levelJson.id,
      deckSize: deckSize ?? levelJson.settings.cards_in_stack.length,
      totalScanned: scanned,
      goldenSeeds,
      closeWinSeedsCount: closeWinCount,
      nearMissSeedsCount: 0,
      yieldRate: scanned > 0 ? (goldenSeeds.length / scanned) * 100 : 0,
      elapsedMs,
    };
  }

  /**
   * Fast synchronous CLI seed miner for pre-generating large golden datasets (5,000+ seeds).
   */
  public static mineGoldenSeedsSync(
    levelJson: LevelJSON,
    targetCount: number = 5000,
    deckSize?: number,
    startSeed: number = 1,
    maxScan: number = 100000,
    botConfig?: Partial<BotConfig>
  ): MiningResult {
    const startTime = performance.now();
    const goldenSeeds: GoldenSeedEntry[] = [];
    let closeWinCount = 0;

    let scanned = 0;
    let currentSeed = startSeed;

    while (scanned < maxScan && goldenSeeds.length < targetCount) {
      const seedToTest = currentSeed + scanned;
      const verifiedEntry = this.validateGoldenCloseWin(levelJson, seedToTest, deckSize, botConfig, 2);

      if (verifiedEntry) {
        goldenSeeds.push(verifiedEntry);
        closeWinCount++;
      }
      scanned++;
    }

    const elapsedMs = Math.round(performance.now() - startTime);

    return {
      levelId: levelJson.id,
      deckSize: deckSize ?? levelJson.settings.cards_in_stack.length,
      totalScanned: scanned,
      goldenSeeds,
      closeWinSeedsCount: closeWinCount,
      nearMissSeedsCount: 0,
      yieldRate: scanned > 0 ? (goldenSeeds.length / scanned) * 100 : 0,
      elapsedMs,
    };
  }

  /**
   * Fast single golden seed finder with random start offset.
   */
  public static mineSingleGoldenSeed(
    levelJson: LevelJSON,
    deckSize?: number,
    startSeed: number = 1,
    maxScan: number = 5000,
    botConfig?: Partial<BotConfig>
  ): GoldenSeedEntry | null {
    const randomStart = Math.floor(Math.random() * 50000) + startSeed;
    for (let i = 0; i < maxScan; i++) {
      const seed = randomStart + i;
      const verified = this.validateGoldenCloseWin(levelJson, seed, deckSize, botConfig, 1);
      if (verified) return verified;
    }
    return null;
  }
}
