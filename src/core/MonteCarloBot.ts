import { CardState, GameStatus, LossReason } from './types.ts';
import { TripeaksEngine } from './TripeaksEngine.ts';

export interface GamePlayResult {
  status: GameStatus;
  lossReason?: LossReason;
  movesCount: number;
  maxStreak: number;
  remainderCards: number;
}

export class MonteCarloBot {
  private wUncover: number = 3.0;
  private wDepth: number = 2.0;
  private wChain: number = 1.5;

  public playGame(engine: TripeaksEngine, maxSteps: number = 250): GamePlayResult {
    let movesCount = 0;
    let maxStreak = 0;

    while (engine.status === 'playing' && movesCount < maxSteps) {
      movesCount++;
      maxStreak = Math.max(maxStreak, engine.streak);

      const playableMoves = engine.getPlayableMoves();

      if (playableMoves.length === 0) {
        if (engine.drawPile.length > 0) {
          engine.drawCard();
        } else {
          break;
        }
        continue;
      }

      // Check urgent bomb modifier (timer <= 2)
      let urgentBombMove: CardState | null = null;
      for (const card of engine.boardCards.values()) {
        if (card.bombTimer !== undefined && card.bombTimer <= 2) {
          // If the bomb card itself can be played, play it!
          if (playableMoves.some((m) => m.id === card.id)) {
            urgentBombMove = card;
            break;
          }
          // Else look for any playable card that covers the bomb
          for (const m of playableMoves) {
            const covers = engine.cardGraph.coversMap.get(m.id);
            if (covers && covers.has(card.id)) {
              urgentBombMove = m;
              break;
            }
          }
          if (urgentBombMove) break;
        }
      }

      if (urgentBombMove) {
        engine.playCard(urgentBombMove.id);
        continue;
      }

      // Check Key modifier (if locked cards exist, prioritize Key)
      const hasLocks = Array.from(engine.boardCards.values()).some((c) => c.isLocked);
      if (hasLocks) {
        const keyMove = playableMoves.find((m) => m.type === 'key');
        if (keyMove) {
          engine.playCard(keyMove.id);
          continue;
        }
      }

      // Check Zap modifier (if row has multiple cards)
      const zapMove = playableMoves.find((m) => m.type === 'zap');
      if (zapMove) {
        const rowCardsCount = Array.from(engine.boardCards.values()).filter(
          (c) => Math.abs(c.y - zapMove.y) <= 30
        ).length;
        if (rowCardsCount >= 2) {
          engine.playCard(zapMove.id);
          continue;
        }
      }

      // Heuristic evaluation among remaining playable cards
      let bestMove = playableMoves[0];
      let bestScore = -Infinity;

      for (const m of playableMoves) {
        const coveredCount = engine.cardGraph.coversMap.get(m.id)?.size || 0;
        const depth = m.depth;

        // Lookahead chain heuristic: how many other visible board cards match m's rank +/- 1
        let chainPotential = 0;
        for (const other of engine.boardCards.values()) {
          if (other.id !== m.id && other.faceUp && !other.isLocked) {
            const d = Math.abs(other.rank - m.rank);
            if (d === 1 || (other.rank === 0 && m.rank === 12) || (other.rank === 12 && m.rank === 0)) {
              chainPotential += 1;
            }
          }
        }

        const score =
          this.wUncover * coveredCount +
          this.wDepth * depth +
          this.wChain * chainPotential;

        if (score > bestScore) {
          bestScore = score;
          bestMove = m;
        }
      }

      engine.playCard(bestMove.id);
    }

    maxStreak = Math.max(maxStreak, engine.streak);

    return {
      status: engine.status,
      lossReason: engine.lossReason || undefined,
      movesCount,
      maxStreak,
      remainderCards: engine.drawPile.length,
    };
  }
}
