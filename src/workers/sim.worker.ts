import { BotConfig, LevelJSON, SimulationMetrics } from '../core/types.ts';
import { loadLevel } from '../core/CardGraph.ts';
import { TripeaksEngine } from '../core/TripeaksEngine.ts';
import { MonteCarloBot } from '../core/MonteCarloBot.ts';

export interface WorkerSimRequest {
  type: 'RUN_SIMULATION';
  levelJson: LevelJSON;
  deckSize?: number;
  iterations: number;
  seedOffset?: number;
  botConfig?: Partial<BotConfig>;
}

export interface WorkerProgressMessage {
  type: 'PROGRESS';
  completed: number;
  total: number;
}

export interface WorkerResultMessage {
  type: 'RESULT';
  metrics: SimulationMetrics;
}

export function runSimulationSync(
  levelJson: LevelJSON,
  iterations: number,
  deckSize?: number,
  seedOffset: number = 0,
  botConfig?: Partial<BotConfig>,
  onProgress?: (completed: number, total: number) => void,
  goldenSeeds?: number[]
): SimulationMetrics {
  const bot = new MonteCarloBot(botConfig);

  let wins = 0;
  let closeWins = 0;
  let nearMisses = 0;
  let bombLosses = 0;
  let deckLosses = 0;
  let totalStreak = 0;
  let totalMoves = 0;

  const winRemainders: number[] = [];
  const remainderDistribution = [0, 0, 0, 0, 0, 0]; // 0, 1, 2, 3, 4, 5+
  const useGolden = goldenSeeds && goldenSeeds.length > 0;

  for (let i = 0; i < iterations; i++) {
    const seed = useGolden
      ? goldenSeeds[i % goldenSeeds.length]
      : (i + 1) * 7919 + seedOffset;
    const initial = loadLevel(levelJson, seed, deckSize);
    const engine = new TripeaksEngine(initial);

    const result = bot.playGame(engine);

    totalStreak += result.maxStreak;
    totalMoves += result.movesCount;

    if (result.status === 'won') {
      wins++;
      const rem = result.remainderCards;
      winRemainders.push(rem);

      if (rem <= 2) {
        closeWins++;
      }

      if (rem >= 5) {
        remainderDistribution[5]++;
      } else {
        remainderDistribution[rem]++;
      }
    } else {
      if (result.lossReason === 'bomb_exploded') {
        bombLosses++;
      } else {
        deckLosses++;
      }
      // Near Miss: lost with <= 2 cards left on the board
      if (result.remainingBoardCards <= 2) {
        nearMisses++;
      }
    }

    if (onProgress && (i + 1) % 500 === 0) {
      onProgress(i + 1, iterations);
    }
  }

  winRemainders.sort((a, b) => a - b);

  let medianRemainder = 0;
  let iqrRemainder = 0;

  if (winRemainders.length > 0) {
    const mid = Math.floor(winRemainders.length / 2);
    medianRemainder =
      winRemainders.length % 2 !== 0
        ? winRemainders[mid]
        : (winRemainders[mid - 1] + winRemainders[mid]) / 2;

    const q25Index = Math.floor(winRemainders.length * 0.25);
    const q75Index = Math.floor(winRemainders.length * 0.75);
    iqrRemainder = winRemainders[q75Index] - winRemainders[q25Index];
  }

  const passRate = (wins / iterations) * 100;
  const closeWinRate = wins > 0 ? (closeWins / wins) * 100 : 0;
  const absCloseWinRate = (closeWins / iterations) * 100;
  const nearMissRate = (nearMisses / iterations) * 100;
  const dramaticRate = ((closeWins + nearMisses) / iterations) * 100;
  const bombLossRate = (bombLosses / iterations) * 100;
  const deckLossRate = (deckLosses / iterations) * 100;
  const avgStreak = totalStreak / iterations;
  const avgMoves = totalMoves / iterations;

  return {
    totalGames: iterations,
    wins,
    passRate,
    closeWins,
    closeWinRate,
    absCloseWinRate,
    nearMisses,
    nearMissRate,
    dramaticRate,
    remainderDistribution,
    medianRemainder,
    iqrRemainder,
    bombLosses,
    bombLossRate,
    deckLosses,
    deckLossRate,
    avgStreak,
    avgMoves,
  };
}

export async function runSimulationAsync(
  levelJson: LevelJSON,
  iterations: number,
  deckSize?: number,
  seedOffset: number = 0,
  botConfig?: Partial<BotConfig>,
  onProgress?: (completed: number, total: number) => void,
  goldenSeeds?: number[]
): Promise<SimulationMetrics> {
  const bot = new MonteCarloBot(botConfig);

  let wins = 0;
  let closeWins = 0;
  let nearMisses = 0;
  let bombLosses = 0;
  let deckLosses = 0;
  let totalStreak = 0;
  let totalMoves = 0;

  const winRemainders: number[] = [];
  const remainderDistribution = [0, 0, 0, 0, 0, 0]; // 0, 1, 2, 3, 4, 5+
  const useGolden = goldenSeeds && goldenSeeds.length > 0;

  const chunkSize = 250;
  let completed = 0;

  while (completed < iterations) {
    const currentBatch = Math.min(chunkSize, iterations - completed);
    for (let i = 0; i < currentBatch; i++) {
      const gameIdx = completed + i;
      const seed = useGolden
        ? goldenSeeds[gameIdx % goldenSeeds.length]
        : (gameIdx + 1) * 7919 + seedOffset;
      const initial = loadLevel(levelJson, seed, deckSize);
      const engine = new TripeaksEngine(initial);

      const result = bot.playGame(engine);

      totalStreak += result.maxStreak;
      totalMoves += result.movesCount;

      if (result.status === 'won') {
        wins++;
        const rem = result.remainderCards;
        winRemainders.push(rem);

        if (rem <= 2) {
          closeWins++;
        }

        if (rem >= 5) {
          remainderDistribution[5]++;
        } else {
          remainderDistribution[rem]++;
        }
      } else {
        if (result.lossReason === 'bomb_exploded') {
          bombLosses++;
        } else {
          deckLosses++;
        }
        if (result.remainingBoardCards <= 2) {
          nearMisses++;
        }
      }
    }

    completed += currentBatch;
    onProgress?.(completed, iterations);

    // Yield to main thread event loop so browser renders progress and stays responsive
    if (completed < iterations) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  winRemainders.sort((a, b) => a - b);

  let medianRemainder = 0;
  let iqrRemainder = 0;

  if (winRemainders.length > 0) {
    const mid = Math.floor(winRemainders.length / 2);
    medianRemainder =
      winRemainders.length % 2 !== 0
        ? winRemainders[mid]
        : (winRemainders[mid - 1] + winRemainders[mid]) / 2;

    const q25Index = Math.floor(winRemainders.length * 0.25);
    const q75Index = Math.floor(winRemainders.length * 0.75);
    iqrRemainder = winRemainders[q75Index] - winRemainders[q25Index];
  }

  const passRate = (wins / iterations) * 100;
  const closeWinRate = wins > 0 ? (closeWins / wins) * 100 : 0;
  const absCloseWinRate = (closeWins / iterations) * 100;
  const nearMissRate = (nearMisses / iterations) * 100;
  const dramaticRate = ((closeWins + nearMisses) / iterations) * 100;
  const bombLossRate = (bombLosses / iterations) * 100;
  const deckLossRate = (deckLosses / iterations) * 100;
  const avgStreak = totalStreak / iterations;
  const avgMoves = totalMoves / iterations;

  return {
    totalGames: iterations,
    wins,
    passRate,
    closeWins,
    closeWinRate,
    absCloseWinRate,
    nearMisses,
    nearMissRate,
    dramaticRate,
    remainderDistribution,
    medianRemainder,
    iqrRemainder,
    bombLosses,
    bombLossRate,
    deckLosses,
    deckLossRate,
    avgStreak,
    avgMoves,
  };
}

// Worker message listener if in Web Worker environment
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  self.onmessage = (e: MessageEvent<WorkerSimRequest>) => {
    const data = e.data;
    if (data.type === 'RUN_SIMULATION') {
      const metrics = runSimulationSync(
        data.levelJson,
        data.iterations,
        data.deckSize,
        data.seedOffset || 0,
        data.botConfig,
        (completed, total) => {
          self.postMessage({ type: 'PROGRESS', completed, total });
        }
      );
      self.postMessage({ type: 'RESULT', metrics });
    }
  };
}

