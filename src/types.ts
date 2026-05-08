export enum GemType {
  RED = 0,
  BLUE = 1,
  GREEN = 2,
  YELLOW = 3,
  PURPLE = 4,
  ORANGE = 5
}

export enum SpecialGemType {
  NONE = 0,
  STRIPED_HORIZONTAL = 1,
  STRIPED_VERTICAL = 2,
  WRAPPED = 3,
  COLOR_BOMB = 4
}

export enum SpecialCombination {
  NONE = 'none',
  CROSS = 'cross',
  THREE_ROWS = 'three_rows',
  FIVE_BY_FIVE = 'five_by_five',
  CROSS_PLUS_BLAST = 'cross_plus_blast'
}

export enum GameState {
  READY = 'ready',
  SELECTING = 'selecting',
  SWAPPING = 'swapping',
  MATCHING = 'matching',
  REMOVING = 'removing',
  FALLING = 'falling',
  FILLING = 'filling',
  CASCADE = 'cascade',
  GAME_OVER = 'game_over',
  LEVEL_COMPLETE = 'level_complete'
}

export enum GameMode {
  CLASSIC = 'classic',
  DAILY_CHALLENGE = 'daily_challenge',
  ENDLESS = 'endless',
  TEST = 'test'
}

export enum ItemType {
  HAMMER = 'hammer',
  SHUFFLE = 'shuffle',
  EXTRA_MOVES = 'extra_moves'
}

export interface Gem {
  type: GemType;
  specialType: SpecialGemType;
  row: number;
  col: number;
  id: string;
}

export interface MatchGroup {
  gems: Gem[];
  direction: 'horizontal' | 'vertical' | 'both';
  length: number;
}

export interface LevelConfig {
  level: number;
  targetScore: number;
  moves: number;
  mode: GameMode;
  specialTasks?: SpecialTask[];
}

export interface SpecialTask {
  type: 'clear_gems' | 'clear_special' | 'reach_combo';
  target: GemType | 'special' | number;
  count: number;
}

export interface PlayerState {
  score: number;
  moves: number;
  combo: number;
  level: number;
  items: {
    [ItemType.HAMMER]: number;
    [ItemType.SHUFFLE]: number;
    [ItemType.EXTRA_MOVES]: number;
  };
  dailyStreak: number;
  highScore: number;
}

export interface CascadeResult {
  totalScore: number;
  comboCount: number;
  gemsCleared: number;
}

export interface CombinationResult {
  combination: SpecialCombination;
  gemsToRemove: Gem[];
  scoreMultiplier: number;
  triggerRow: number;
  triggerCol: number;
}
