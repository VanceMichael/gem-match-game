import { GemType, LevelConfig, GameMode, ItemType } from './types';

export const BOARD_ROWS = 8;
export const BOARD_COLS = 8;
export const GEM_SIZE = 50;
export const GEM_PADDING = 2;

export const GEM_COLORS: { [key in GemType]: number } = {
  [GemType.RED]: 0xff4757,
  [GemType.BLUE]: 0x3742fa,
  [GemType.GREEN]: 0x2ed573,
  [GemType.YELLOW]: 0xffa502,
  [GemType.PURPLE]: 0x8e44ad,
  [GemType.ORANGE]: 0xff6348
};

export const GEM_NAMES: { [key in GemType]: string } = {
  [GemType.RED]: '红',
  [GemType.BLUE]: '蓝',
  [GemType.GREEN]: '绿',
  [GemType.YELLOW]: '黄',
  [GemType.PURPLE]: '紫',
  [GemType.ORANGE]: '橙'
};

export const SCORE_PER_GEM = 10;
export const SCORE_PER_COMBO_MULTIPLIER = 1.5;
export const SCORE_SPECIAL_GEM_MULTIPLIER = 2;

export const ANIMATION_DURATION_SWAP = 200;
export const ANIMATION_DURATION_REMOVE = 300;
export const ANIMATION_DURATION_FALL = 300;
export const ANIMATION_DURATION_FILL = 200;
export const ANIMATION_DELAY_CASCADE = 100;

export const ITEM_COSTS: { [key in ItemType]: number } = {
  [ItemType.HAMMER]: 500,
  [ItemType.SHUFFLE]: 300,
  [ItemType.EXTRA_MOVES]: 400
};

export const ITEM_NAMES: { [key in ItemType]: string } = {
  [ItemType.HAMMER]: '锤子',
  [ItemType.SHUFFLE]: '刷新',
  [ItemType.EXTRA_MOVES]: '额外步数'
};

export function generateLevels(): LevelConfig[] {
  const levels: LevelConfig[] = [];
  
  for (let i = 1; i <= 100; i++) {
    levels.push({
      level: i,
      targetScore: 1000 + (i - 1) * 500,
      moves: Math.max(15, 25 - Math.floor(i / 5)),
      mode: GameMode.CLASSIC
    });
  }
  
  return levels;
}

export function getDailyChallengeLevel(day: number): LevelConfig {
  const baseScore = 2000 + (day % 7) * 500;
  return {
    level: 999,
    targetScore: baseScore,
    moves: 20,
    mode: GameMode.DAILY_CHALLENGE
  };
}

export function getEndlessLevel(): LevelConfig {
  return {
    level: 0,
    targetScore: Infinity,
    moves: Infinity,
    mode: GameMode.ENDLESS
  };
}

export function getTestLevel(): LevelConfig {
  return {
    level: -1,
    targetScore: Infinity,
    moves: 999,
    mode: GameMode.TEST
  };
}
