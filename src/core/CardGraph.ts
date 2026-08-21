import { CardState, InitialLevelState, LevelJSON, Rank, RawCardJSON, Suit } from './types.ts';

export const CARD_WIDTH = 100;
export const CARD_HEIGHT = 150;
export const OVERLAP_FACTOR_X = 0.98;
export const OVERLAP_FACTOR_Y = 0.98;


const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export function createPRNG(seed: number = 123456789) {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function cardValueToRankAndSuit(val: number): { rank: Rank; suit: Suit } {
  const normalized = ((val % 52) + 52) % 52;
  const rank = (normalized % 13) as Rank;
  const suit = SUITS[Math.floor(normalized / 13)];
  return { rank, suit };
}

export function areCardsOverlapping(a: RawCardJSON, b: RawCardJSON): boolean {
  if (a.depth <= b.depth) return false;

  const radA = (a.angle || 0) * (Math.PI / 180);
  const radB = (b.angle || 0) * (Math.PI / 180);

  const cosA = Math.abs(Math.cos(radA));
  const sinA = Math.abs(Math.sin(radA));
  const effWA = CARD_WIDTH * cosA + CARD_HEIGHT * sinA;
  const effHA = CARD_WIDTH * sinA + CARD_HEIGHT * cosA;

  const cosB = Math.abs(Math.cos(radB));
  const sinB = Math.abs(Math.sin(radB));
  const effWB = CARD_WIDTH * cosB + CARD_HEIGHT * sinB;
  const effHB = CARD_WIDTH * sinB + CARD_HEIGHT * cosB;

  const maxDistX = ((effWA + effWB) / 2) * OVERLAP_FACTOR_X;
  const maxDistY = ((effHA + effHB) / 2) * OVERLAP_FACTOR_Y;

  return Math.abs(a.x - b.x) < maxDistX && Math.abs(a.y - b.y) < maxDistY;
}

export class CardGraph {
  public coversMap: Map<string, Set<string>> = new Map();     // A -> Set of cards covered by A
  public coveredByMap: Map<string, Set<string>> = new Map();   // B -> Set of cards covering B

  constructor(cards?: RawCardJSON[]) {
    if (cards) {
      this.buildGraph(cards);
    }
  }

  public buildGraph(cards: RawCardJSON[]): void {
    this.coversMap.clear();
    this.coveredByMap.clear();

    for (const card of cards) {
      this.coversMap.set(card.id, new Set());
      this.coveredByMap.set(card.id, new Set());
    }

    const n = cards.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const cardA = cards[i];
        const cardB = cards[j];

        if (areCardsOverlapping(cardA, cardB)) {
          this.coversMap.get(cardA.id)!.add(cardB.id);
          this.coveredByMap.get(cardB.id)!.add(cardA.id);
        }
      }
    }
  }

  public isCovered(cardId: string): boolean {
    const covering = this.coveredByMap.get(cardId);
    return !!covering && covering.size > 0;
  }

  public removeCard(cardId: string): string[] {
    const newlyUncovered: string[] = [];
    const coveredCards = this.coversMap.get(cardId);

    if (coveredCards) {
      for (const targetId of coveredCards) {
        const coveringSet = this.coveredByMap.get(targetId);
        if (coveringSet) {
          coveringSet.delete(cardId);
          if (coveringSet.size === 0) {
            newlyUncovered.push(targetId);
          }
        }
      }
    }

    this.coversMap.delete(cardId);
    this.coveredByMap.delete(cardId);

    return newlyUncovered;
  }

  public clone(): CardGraph {
    const cloned = new CardGraph();
    for (const [k, v] of this.coversMap.entries()) {
      cloned.coversMap.set(k, new Set(v));
    }
    for (const [k, v] of this.coveredByMap.entries()) {
      cloned.coveredByMap.set(k, new Set(v));
    }
    return cloned;
  }
}

export function loadLevel(
  levelJson: LevelJSON,
  seed: number = 42,
  customDeckSize?: number
): InitialLevelState {
  const prng = createPRNG(seed);
  const graph = new CardGraph(levelJson.cards);

  // Prepare standard 52-card deck and shuffle
  const deckPool: number[] = Array.from({ length: 52 }, (_, i) => i);
  for (let i = deckPool.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [deckPool[i], deckPool[j]] = [deckPool[j], deckPool[i]];
  }

  let poolIdx = 0;
  const boardCards: CardState[] = [];

  for (const raw of levelJson.cards) {
    const isSpecialWithoutValue = raw.type === 'key' || raw.type === 'zap';
    let val = -1;
    let rank: Rank = 0 as Rank;
    let suit: Suit = 'spades';

    if (!isSpecialWithoutValue) {
      val = raw.value ?? -1;
      if (val === -1 || raw.random) {
        val = deckPool[poolIdx % deckPool.length];
        poolIdx++;
      }
      const parsed = cardValueToRankAndSuit(val);
      rank = parsed.rank;
      suit = parsed.suit;
    }

    const isCovered = graph.isCovered(raw.id);
    const isLocked = raw.type === 'lock';
    const bombMod = raw.modifiers?.find((m) => m.type === 'bomb');

    boardCards.push({
      id: raw.id,
      x: raw.x,
      y: raw.y,
      depth: raw.depth,
      angle: raw.angle || 0,
      faceUp: !isCovered,
      random: raw.random ?? true,
      sequence: raw.sequence ?? 0,
      type: raw.type || 'value',
      modifiers: raw.modifiers || [],
      value: val,
      rank,
      suit,
      isPlayable: !isCovered && !isLocked,
      isLocked,
      bombTimer: bombMod ? bombMod.properties.timer : undefined,
    });
  }

  // Generate draw pile
  const targetStackSize =
    customDeckSize !== undefined
      ? customDeckSize
      : levelJson.settings.cards_in_stack.length;

  const drawPile: number[] = [];
  for (let i = 0; i < targetStackSize; i++) {
    const rawVal = levelJson.settings.cards_in_stack[i];
    if (rawVal !== undefined && rawVal !== -1) {
      drawPile.push(rawVal);
    } else {
      drawPile.push(deckPool[poolIdx % deckPool.length]);
      poolIdx++;
    }
  }

  return {
    levelId: levelJson.id,
    boardCards,
    drawPile,
    graph: {
      coversMap: graph.coversMap,
      coveredByMap: graph.coveredByMap,
    },
  };
}
