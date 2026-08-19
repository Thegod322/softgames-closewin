import { LevelJSON, SimulationMetrics } from '../core/types.ts';
import { runSimulationSync } from '../workers/sim.worker.ts';

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
  private targetCWR: number = 70.0;
  private tolerance: number = 2.0;

  public calibrate(
    levelJson: LevelJSON,
    simCountPerStep: number = 2000,
    onStep?: (step: CalibrationStep) => void
  ): CalibrationResult {
    const history: CalibrationStep[] = [];
    let bestStep: CalibrationStep | null = null;
    let minDeltaAbs = Infinity;

    let minK = 5;
    let maxK = 42;

    // Binary search / Bisection over deck size K
    while (minK <= maxK) {
      const midK = Math.floor((minK + maxK) / 2);
      const metrics = runSimulationSync(levelJson, simCountPerStep, midK, 42);
      const delta = metrics.closeWinRate - this.targetCWR;

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

      if (deltaAbs <= this.tolerance) {
        // Target achieved within tolerance
        return {
          optimalDeckSize: midK,
          bestMetrics: metrics,
          history,
          converged: true,
        };
      }

      // Close Win Rate is inversely related to Deck Size:
      // If CWR is too high (delta > 0), deck is too small -> increase deck size
      if (delta > 0) {
        minK = midK + 1;
      } else {
        // If CWR is too low (delta < 0), deck is too generous -> decrease deck size
        maxK = midK - 1;
      }
    }

    return {
      optimalDeckSize: bestStep ? bestStep.deckSize : levelJson.settings.cards_in_stack.length,
      bestMetrics: bestStep ? bestStep.metrics : runSimulationSync(levelJson, simCountPerStep),
      history,
      converged: minDeltaAbs <= 4.0,
    };
  }
}
