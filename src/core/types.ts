export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

// Rank: 0 = Ace, 1 = 2, 2 = 3, ..., 8 = 9, 9 = 10, 10 = Jack, 11 = Queen, 12 = King
export type Rank = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type CardType = 'value' | 'lock' | 'key' | 'zap';

export interface BombModifier {
  type: 'bomb';
  properties: {
    plays: number;
    timer: number;
  };
}

export type CardModifier = BombModifier;

export interface RawCardJSON {
  id: string;
  x: number;
  y: number;
  depth: number;
  angle: number;
  faceUp: boolean;
  random: boolean;
  sequence: number;
  type: CardType;
  modifiers: CardModifier[];
  value?: number;
}

export interface LevelSettings {
  level_number: number;
  background: string;
  win_criteria: Array<{ type: string }>;
  tags: string[];
  cards_in_stack: number[];
  star_1?: number;
  star_2?: number;
  star_3?: number;
}

export interface LevelJSON {
  id: string;
  version: string;
  cards: RawCardJSON[];
  settings: LevelSettings;
}

export interface CardState {
  id: string;
  x: number;
  y: number;
  depth: number;
  angle: number;
  faceUp: boolean;
  random: boolean;
  sequence: number;
  type: CardType;
  modifiers: CardModifier[];
  value: number; // 0..51
  rank: Rank;    // 0..12
  suit: Suit;
  isPlayable: boolean;
  isLocked: boolean;
  bombTimer?: number;
}

export type GameStatus = 'playing' | 'won' | 'lost';
export type LossReason = 'out_of_cards' | 'bomb_exploded';

export interface MoveResult {
  success: boolean;
  uncoveredCardIds: string[];
  unlockedCardIds: string[];
  clearedCardIds: string[];
  bombExploded: boolean;
  status: GameStatus;
  lossReason?: LossReason;
}

export interface GameSnapshot {
  boardCards: Map<string, CardState>;
  drawPile: number[];
  wastePile: number[];
  streak: number;
  status: GameStatus;
  lossReason: LossReason | null;
  coveredByMap: Map<string, Set<string>>;
  coversMap: Map<string, Set<string>>;
}

export interface SimulationMetrics {
  totalGames: number;
  wins: number;
  passRate: number;              // (wins / totalGames) * 100%
  closeWins: number;             // wins with remainder in {0, 1, 2}
  closeWinRate: number;          // (closeWins / wins) * 100%
  remainderDistribution: number[]; // Index = remainder (0, 1, 2, 3, 4, 5+)
  medianRemainder: number;
  iqrRemainder: number;          // Q75 - Q25
  bombLosses: number;
  bombLossRate: number;          // (bombLosses / totalGames) * 100%
  deckLosses: number;
  deckLossRate: number;          // (deckLosses / totalGames) * 100%
  avgStreak: number;
  avgMoves: number;
}

export interface InitialLevelState {
  levelId: string;
  boardCards: CardState[];
  drawPile: number[];
  graph: {
    coversMap: Map<string, Set<string>>;
    coveredByMap: Map<string, Set<string>>;
  };
}
