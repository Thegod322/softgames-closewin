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
  closeWinRate: number;          // (closeWins / wins) * 100% - Conditional on winning
  absCloseWinRate: number;       // (closeWins / totalGames) * 100% - Real player cohort % experiencing close win
  nearMisses: number;            // losses with remaining board cards <= 2 (Near Miss)
  nearMissRate: number;          // (nearMisses / totalGames) * 100% - Real player cohort % experiencing Near Miss
  dramaticRate: number;          // ((closeWins + nearMisses) / totalGames) * 100% - Total high-conversion cohort
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

export interface BotConfig {
  wUncover: number;
  wDepth: number;
  wChain: number;
  bombUrgencyThreshold: number;
  zapMinRowCards: number;
  maxSteps?: number;
  mistakeProbability?: number;
}

export const DEFAULT_BOT_CONFIG: BotConfig = {
  wUncover: 3.0,
  wDepth: 2.0,
  wChain: 1.5,
  bombUrgencyThreshold: 2,
  zapMinRowCards: 2,
  maxSteps: 250,
  mistakeProbability: 0.0,
};

export type PersonaType = 'casual' | 'medium' | 'expert';

export interface PersonaProfile {
  id: PersonaType;
  name: string;
  badgeColor: string;
  description: string;
  botConfig: BotConfig;
  mistakeProbability: number; // Epsilon-greedy sub-optimal move chance
}

export const PERSONA_PRESETS: Record<PersonaType, PersonaProfile> = {
  casual: {
    id: 'casual',
    name: 'Casual / Novice',
    badgeColor: '#ef4444',
    description: 'Greedy, top-layer bias, no lookahead, delayed bomb defusal',
    botConfig: {
      wUncover: 0.5,
      wDepth: 0.5,
      wChain: 0.0,
      bombUrgencyThreshold: 1,
      zapMinRowCards: 1,
      maxSteps: 250,
      mistakeProbability: 0.15,
    },
    mistakeProbability: 0.15,
  },
  medium: {
    id: 'medium',
    name: 'Medium / Core',
    badgeColor: '#fbbf24',
    description: 'Standard human heuristics, moderate 1-step chain lookahead',
    botConfig: {
      wUncover: 2.0,
      wDepth: 1.5,
      wChain: 1.0,
      bombUrgencyThreshold: 2,
      zapMinRowCards: 2,
      maxSteps: 250,
      mistakeProbability: 0.03,
    },
    mistakeProbability: 0.03,
  },
  expert: {
    id: 'expert',
    name: 'Expert / Pro',
    badgeColor: '#22c55e',
    description: 'Optimal lookahead, max chain streak priority, proactive bomb defusal',
    botConfig: {
      wUncover: 4.0,
      wDepth: 3.0,
      wChain: 2.5,
      bombUrgencyThreshold: 3,
      zapMinRowCards: 2,
      maxSteps: 250,
      mistakeProbability: 0.0,
    },
    mistakeProbability: 0.0,
  },
};

export interface TargetCalibrationData {
  deckSize: number;
  metrics: SimulationMetrics;
  minedGoldenSeeds: GoldenSeedEntry[];
  goldenSeedsMinedCount: number;
  personaResultsGolden: Record<PersonaType, SimulationMetrics>;
  personaResultsRandom: Record<PersonaType, SimulationMetrics>;
  skillIndex: number; // PR_expert - PR_casual on dynamically mined golden seeds
}

export interface LevelAnalysisReport {
  levelId: string;
  baseline: TargetCalibrationData;
  targetBrief: TargetCalibrationData;
  targetPeak: TargetCalibrationData;
}

export interface SimulationSettings {
  targetCWR: number;
  tolerance: number;
  iterations: number;
  seedOffset: number;
  useGoldenSeeds?: boolean;
  goldenSeeds?: number[];
  botConfig: BotConfig;
}

export const DEFAULT_SIMULATION_SETTINGS: SimulationSettings = {
  targetCWR: 70.0,
  tolerance: 2.0,
  iterations: 2500,
  seedOffset: 0,
  useGoldenSeeds: false,
  botConfig: { ...DEFAULT_BOT_CONFIG },
};

export type SeedCategory = 'close_win' | 'near_miss' | 'standard_win' | 'loss';

export interface GoldenSeedEntry {
  seed: number;
  category: SeedCategory;
  remainder: number;             // Remaining cards in draw pile
  boardCardsLeft: number;        // Remaining cards on board
  moves: number;
  maxStreak: number;
  status: GameStatus;
  lossReason?: LossReason;
}

export interface MiningResult {
  levelId: string;
  deckSize: number;
  totalScanned: number;
  goldenSeeds: GoldenSeedEntry[];
  closeWinSeedsCount: number;
  nearMissSeedsCount: number;
  yieldRate: number;             // (goldenSeeds.length / totalScanned) * 100%
  elapsedMs: number;
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


