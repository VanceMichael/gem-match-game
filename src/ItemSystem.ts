import { ItemType, PlayerState } from './types';
import { ITEM_COSTS } from './constants';

export class ItemSystem {
  private playerState: PlayerState;

  constructor() {
    const savedState = localStorage.getItem('playerState');
    if (savedState) {
      this.playerState = JSON.parse(savedState);
    } else {
      this.playerState = {
        score: 0,
        moves: 0,
        combo: 0,
        level: 1,
        items: {
          [ItemType.HAMMER]: 3,
          [ItemType.SHUFFLE]: 3,
          [ItemType.EXTRA_MOVES]: 3
        },
        dailyStreak: 0,
        highScore: 0
      };
    }
  }

  getItemCount(itemType: ItemType): number {
    return this.playerState.items[itemType];
  }

  useItem(itemType: ItemType): boolean {
    if (this.playerState.items[itemType] > 0) {
      this.playerState.items[itemType]--;
      this.save();
      return true;
    }
    return false;
  }

  addItem(itemType: ItemType, count: number = 1): void {
    this.playerState.items[itemType] += count;
    this.save();
  }

  buyItem(itemType: ItemType, coins: number): boolean {
    if (coins >= ITEM_COSTS[itemType]) {
      this.addItem(itemType);
      return true;
    }
    return false;
  }

  getDailyStreak(): number {
    return this.playerState.dailyStreak;
  }

  updateDailyStreak(): void {
    const today = new Date().toDateString();
    const lastPlayed = localStorage.getItem('lastPlayedDate');
    
    if (lastPlayed) {
      const lastDate = new Date(lastPlayed);
      const todayDate = new Date(today);
      const diffDays = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (diffDays === 1) {
        this.playerState.dailyStreak++;
      } else if (diffDays > 1) {
        this.playerState.dailyStreak = 1;
      }
    } else {
      this.playerState.dailyStreak = 1;
    }
    
    localStorage.setItem('lastPlayedDate', today);
    this.save();
  }

  getHighScore(): number {
    return this.playerState.highScore;
  }

  updateHighScore(score: number): boolean {
    if (score > this.playerState.highScore) {
      this.playerState.highScore = score;
      this.save();
      return true;
    }
    return false;
  }

  getLevel(): number {
    return this.playerState.level;
  }

  setLevel(level: number): void {
    this.playerState.level = level;
    this.save();
  }

  private save(): void {
    localStorage.setItem('playerState', JSON.stringify(this.playerState));
  }
}
