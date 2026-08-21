import {
  CardState,
  GameSnapshot,
  GameStatus,
  InitialLevelState,
  LossReason,
  MoveResult,
  Rank,
  Suit,
} from './types.ts';
import { CardGraph, cardValueToRankAndSuit } from './CardGraph.ts';

export class TripeaksEngine {
  public boardCards: Map<string, CardState> = new Map();
  public cardGraph: CardGraph;
  public drawPile: number[] = [];
  public wastePile: number[] = [];
  public streak: number = 0;
  public status: GameStatus = 'playing';
  public lossReason: LossReason | null = null;
  public history: GameSnapshot[] = [];

  constructor(initialState: InitialLevelState) {
    this.cardGraph = new CardGraph();
    this.init(initialState);
  }

  public init(initialState: InitialLevelState): void {
    this.boardCards.clear();
    for (const card of initialState.boardCards) {
      this.boardCards.set(card.id, { ...card });
    }

    this.cardGraph.coversMap = new Map();
    for (const [k, v] of initialState.graph.coversMap.entries()) {
      this.cardGraph.coversMap.set(k, new Set(v));
    }
    this.cardGraph.coveredByMap = new Map();
    for (const [k, v] of initialState.graph.coveredByMap.entries()) {
      this.cardGraph.coveredByMap.set(k, new Set(v));
    }

    this.drawPile = [...initialState.drawPile];
    this.wastePile = [];
    this.streak = 0;
    this.status = 'playing';
    this.lossReason = null;
    this.history = [];

    // Automatically draw the first card from the draw pile into the waste pile if available
    if (this.drawPile.length > 0) {
      const firstCard = this.drawPile.shift()!;
      this.wastePile.push(firstCard);
    }
  }

  public getActiveCard(): { value: number; rank: Rank; suit: Suit } | null {
    if (this.wastePile.length === 0) return null;
    const val = this.wastePile[this.wastePile.length - 1];
    return { value: val, ...cardValueToRankAndSuit(val) };
  }

  public canPlayCard(cardId: string): boolean {
    if (this.status !== 'playing') return false;

    const card = this.boardCards.get(cardId);
    if (!card || !card.faceUp) return false;
    if (this.cardGraph.isCovered(cardId)) return false;

    // Lock cards cannot be played until unlocked by a key
    if (card.isLocked) return false;

    // Key cards can be collected immediately once uncovered
    if (card.type === 'key') return true;

    // Zap cards can be collected immediately once uncovered
    if (card.type === 'zap') return true;

    const active = this.getActiveCard();
    if (!active) return false;

    // Ace-King wrap matching for standard value cards
    const delta = Math.abs(card.rank - active.rank);
    const isWrap =
      (card.rank === 0 && active.rank === 12) ||
      (card.rank === 12 && active.rank === 0);

    return delta === 1 || isWrap;
  }

  public getPlayableMoves(): CardState[] {
    if (this.status !== 'playing') return [];
    const moves: CardState[] = [];
    for (const card of this.boardCards.values()) {
      if (this.canPlayCard(card.id)) {
        moves.push(card);
      }
    }
    return moves;
  }

  private saveSnapshot(): void {
    const boardCardsCopy = new Map<string, CardState>();
    for (const [k, v] of this.boardCards.entries()) {
      boardCardsCopy.set(k, { ...v, modifiers: [...v.modifiers] });
    }

    this.history.push({
      boardCards: boardCardsCopy,
      drawPile: [...this.drawPile],
      wastePile: [...this.wastePile],
      streak: this.streak,
      status: this.status,
      lossReason: this.lossReason,
      coveredByMap: new Map(
        Array.from(this.cardGraph.coveredByMap.entries()).map(([k, v]) => [
          k,
          new Set(v),
        ])
      ),
      coversMap: new Map(
        Array.from(this.cardGraph.coversMap.entries()).map(([k, v]) => [
          k,
          new Set(v),
        ])
      ),
    });
  }

  public undo(): boolean {
    const snapshot = this.history.pop();
    if (!snapshot) return false;

    this.boardCards = new Map();
    for (const [k, v] of snapshot.boardCards.entries()) {
      this.boardCards.set(k, { ...v });
    }
    this.drawPile = [...snapshot.drawPile];
    this.wastePile = [...snapshot.wastePile];
    this.streak = snapshot.streak;
    this.status = snapshot.status;
    this.lossReason = snapshot.lossReason;

    this.cardGraph.coveredByMap = new Map();
    for (const [k, v] of snapshot.coveredByMap.entries()) {
      this.cardGraph.coveredByMap.set(k, new Set(v));
    }
    this.cardGraph.coversMap = new Map();
    for (const [k, v] of snapshot.coversMap.entries()) {
      this.cardGraph.coversMap.set(k, new Set(v));
    }

    return true;
  }

  private tickBombs(): boolean {
    let bombExploded = false;
    for (const c of this.boardCards.values()) {
      if (c.faceUp && c.bombTimer !== undefined && c.bombTimer > 0) {
        c.bombTimer -= 1;
        if (c.bombTimer === 0) {
          bombExploded = true;
        }
      }
    }
    return bombExploded;
  }

  public playCard(cardId: string): MoveResult {
    if (this.status !== 'playing') {
      return {
        success: false,
        uncoveredCardIds: [],
        unlockedCardIds: [],
        clearedCardIds: [],
        bombExploded: false,
        status: this.status,
        lossReason: this.lossReason || undefined,
      };
    }

    if (!this.canPlayCard(cardId)) {
      return {
        success: false,
        uncoveredCardIds: [],
        unlockedCardIds: [],
        clearedCardIds: [],
        bombExploded: false,
        status: this.status,
        lossReason: this.lossReason || undefined,
      };
    }

    this.saveSnapshot();

    const playedCard = this.boardCards.get(cardId)!;
    const unlockedCardIds: string[] = [];
    const clearedCardIds: string[] = [];
    const uncoveredCardIds: string[] = [];

    if (playedCard.type === 'key') {
      // Key collected: does NOT go into waste pile, simply collected & disappears
      this.boardCards.delete(cardId);
      clearedCardIds.push(cardId);

      const uncFromKey = this.cardGraph.removeCard(cardId);
      for (const uId of uncFromKey) {
        if (!uncoveredCardIds.includes(uId)) uncoveredCardIds.push(uId);
      }

      // All Lock cards on the board are unlocked and remain as playable value cards!
      for (const lock of this.boardCards.values()) {
        if (lock.isLocked) {
          lock.isLocked = false;
          lock.type = 'value';
          unlockedCardIds.push(lock.id);
          lock.isPlayable = lock.faceUp && !this.cardGraph.isCovered(lock.id);
        }
      }
    } else if (playedCard.type === 'zap') {
      // Zap activated: clears entire horizontal row
      this.boardCards.delete(cardId);
      clearedCardIds.push(cardId);

      const uncFromZap = this.cardGraph.removeCard(cardId);
      for (const uId of uncFromZap) {
        if (!uncoveredCardIds.includes(uId)) uncoveredCardIds.push(uId);
      }

      const targetIds: string[] = [];
      for (const [id, c] of this.boardCards.entries()) {
        if (Math.abs(c.y - playedCard.y) <= 30) {
          targetIds.push(id);
        }
      }

      for (const targetId of targetIds) {
        if (this.boardCards.has(targetId)) {
          this.boardCards.delete(targetId);
          clearedCardIds.push(targetId);
          const newUncovered = this.cardGraph.removeCard(targetId);
          for (const uId of newUncovered) {
            if (!uncoveredCardIds.includes(uId)) uncoveredCardIds.push(uId);
          }
        }
      }
    } else {
      // Standard value card match: goes to waste pile
      this.wastePile.push(playedCard.value);
      this.boardCards.delete(cardId);
      clearedCardIds.push(cardId);
      this.streak += 1;

      const uncFromCard = this.cardGraph.removeCard(cardId);
      for (const uId of uncFromCard) {
        if (!uncoveredCardIds.includes(uId)) uncoveredCardIds.push(uId);
      }
    }

    // Mark newly uncovered cards faceUp & playable
    for (const uncId of uncoveredCardIds) {
      const c = this.boardCards.get(uncId);
      if (c) {
        c.faceUp = true;
        c.isPlayable = !c.isLocked;
      }
    }

    // Tick active bomb modifiers on board
    const bombExploded = this.tickBombs();
    if (bombExploded) {
      this.status = 'lost';
      this.lossReason = 'bomb_exploded';
      return {
        success: true,
        uncoveredCardIds,
        unlockedCardIds,
        clearedCardIds,
        bombExploded: true,
        status: this.status,
        lossReason: this.lossReason,
      };
    }

    // Check Win Condition: All board cards cleared
    if (this.boardCards.size === 0) {
      this.status = 'won';
      return {
        success: true,
        uncoveredCardIds,
        unlockedCardIds,
        clearedCardIds,
        bombExploded: false,
        status: this.status,
      };
    }

    // Check Loss Condition: Out of cards in draw pile and no valid board moves
    if (this.drawPile.length === 0 && this.getPlayableMoves().length === 0) {
      this.status = 'lost';
      this.lossReason = 'out_of_cards';
    }

    return {
      success: true,
      uncoveredCardIds,
      unlockedCardIds,
      clearedCardIds,
      bombExploded: false,
      status: this.status,
      lossReason: this.lossReason || undefined,
    };
  }

  public drawCard(): MoveResult {
    if (this.status !== 'playing') {
      return {
        success: false,
        uncoveredCardIds: [],
        unlockedCardIds: [],
        clearedCardIds: [],
        bombExploded: false,
        status: this.status,
        lossReason: this.lossReason || undefined,
      };
    }

    if (this.drawPile.length === 0) {
      if (this.getPlayableMoves().length === 0) {
        this.status = 'lost';
        this.lossReason = 'out_of_cards';
      }
      return {
        success: false,
        uncoveredCardIds: [],
        unlockedCardIds: [],
        clearedCardIds: [],
        bombExploded: false,
        status: this.status,
        lossReason: this.lossReason || undefined,
      };
    }

    this.saveSnapshot();

    const drawnCard = this.drawPile.shift()!;
    this.wastePile.push(drawnCard);
    this.streak = 0;

    // A move is defined as playing a card OR drawing a card -> tick bombs
    const bombExploded = this.tickBombs();
    if (bombExploded) {
      this.status = 'lost';
      this.lossReason = 'bomb_exploded';
      return {
        success: true,
        uncoveredCardIds: [],
        unlockedCardIds: [],
        clearedCardIds: [],
        bombExploded: true,
        status: this.status,
        lossReason: this.lossReason,
      };
    }

    // Check if drawing left us with 0 draw cards and 0 moves
    if (this.drawPile.length === 0 && this.getPlayableMoves().length === 0) {
      this.status = 'lost';
      this.lossReason = 'out_of_cards';
    }

    return {
      success: true,
      uncoveredCardIds: [],
      unlockedCardIds: [],
      clearedCardIds: [],
      bombExploded: false,
      status: this.status,
      lossReason: this.lossReason || undefined,
    };
  }
}

