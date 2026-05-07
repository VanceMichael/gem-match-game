import { LevelConfig } from './types';
import { generateLevels, getDailyChallengeLevel, getEndlessLevel, getTestLevel } from './constants';

export class LevelSystem {
  private levels: LevelConfig[];
  private currentLevel: number;
  private maxUnlockedLevel: number;

  constructor() {
    this.levels = generateLevels();
    this.currentLevel = 1;
    this.maxUnlockedLevel = parseInt(localStorage.getItem('maxUnlockedLevel') || '1', 10);
  }

  getCurrentLevel(): number {
    return this.currentLevel;
  }

  getLevelConfig(level?: number): LevelConfig {
    const lvl = level ?? this.currentLevel;
    return this.levels[lvl - 1] || this.levels[0];
  }

  getDailyChallengeLevel(day: number): LevelConfig {
    return getDailyChallengeLevel(day);
  }

  getEndlessLevel(): LevelConfig {
    return getEndlessLevel();
  }

  getTestLevel(): LevelConfig {
    return getTestLevel();
  }

  setCurrentLevel(level: number): void {
    if (level >= 1 && level <= this.levels.length) {
      this.currentLevel = level;
    }
  }

  unlockNextLevel(): void {
    if (this.currentLevel >= this.maxUnlockedLevel) {
      this.maxUnlockedLevel = Math.min(this.currentLevel + 1, this.levels.length);
      localStorage.setItem('maxUnlockedLevel', this.maxUnlockedLevel.toString());
    }
  }

  getMaxUnlockedLevel(): number {
    return this.maxUnlockedLevel;
  }

  getTotalLevels(): number {
    return this.levels.length;
  }

  getLevels(): LevelConfig[] {
    return this.levels;
  }
}
