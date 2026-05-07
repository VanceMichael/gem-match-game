import {
  GameState,
  Gem,
  GameMode,
  ItemType,
  LevelConfig
} from './types';
import { GameBoard, SwapCallback, BoardUpdateCallback } from './GameBoard';
import { LevelSystem } from './LevelSystem';
import { ItemSystem } from './ItemSystem';

export interface GameUpdate {
  type: 'score' | 'combo' | 'moves' | 'level' | 'game_over' | 'level_complete';
  value: number | boolean;
}

export class GameEngine {
  private gameBoard: GameBoard;
  private levelSystem: LevelSystem;
  private itemSystem: ItemSystem;
  private currentLevelConfig: LevelConfig;
  
  private score: number;
  private moves: number;
  private combo: number;
  private gameState: GameState;
  private gameMode: GameMode;
  
  private updateCallback: ((update: GameUpdate) => void) | null;

  constructor() {
    this.gameBoard = new GameBoard();
    this.levelSystem = new LevelSystem();
    this.itemSystem = new ItemSystem();
    this.currentLevelConfig = this.levelSystem.getLevelConfig();
    
    this.score = 0;
    this.moves = this.currentLevelConfig.moves;
    this.combo = 0;
    this.gameState = GameState.READY;
    this.gameMode = GameMode.CLASSIC;
    
    this.updateCallback = null;
    
    this.setupCallbacks();
  }

  private setupCallbacks(): void {
    this.gameBoard.setScoreUpdateCallback((score, combo, _gemsCleared) => {
      this.score += score;
      this.combo = combo;
      
      if (this.updateCallback) {
        this.updateCallback({ type: 'score', value: this.score });
        this.updateCallback({ type: 'combo', value: this.combo });
      }
    });
  }

  setUpdateCallback(callback: (update: GameUpdate) => void): void {
    this.updateCallback = callback;
  }

  setSwapCallback(callback: SwapCallback): void {
    this.gameBoard.setSwapCallback(callback);
  }

  setBoardUpdateCallback(callback: BoardUpdateCallback): void {
    this.gameBoard.setUpdateCallback(callback);
  }

  getGameBoard(): GameBoard {
    return this.gameBoard;
  }

  getLevelSystem(): LevelSystem {
    return this.levelSystem;
  }

  getItemSystem(): ItemSystem {
    return this.itemSystem;
  }

  getScore(): number {
    return this.score;
  }

  getMoves(): number {
    return this.moves;
  }

  getCombo(): number {
    return this.combo;
  }

  getGameState(): GameState {
    return this.gameState;
  }

  getCurrentLevelConfig(): LevelConfig {
    return this.currentLevelConfig;
  }

  async selectGem(gem: Gem): Promise<boolean> {
    if (this.gameState !== GameState.READY && this.gameState !== GameState.SELECTING) {
      return false;
    }

    const boardStateBefore = this.gameBoard.getState();
    const success = this.gameBoard.selectGem(gem);
    
    if (!success) {
      return false;
    }

    const boardStateAfter = this.gameBoard.getState();
    
    if (boardStateBefore === GameState.SELECTING && 
        (boardStateAfter === GameState.SWAPPING || boardStateAfter === GameState.CASCADE)) {
      this.gameState = boardStateAfter;
      
      await this.waitForBoardReady();
      
      return true;
    }

    this.gameState = boardStateAfter;
    return true;
  }

  private async waitForBoardReady(): Promise<void> {
    while (this.gameBoard.getState() !== GameState.READY) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    if (this.gameMode !== GameMode.ENDLESS) {
      this.moves--;
      if (this.updateCallback) {
        this.updateCallback({ type: 'moves', value: this.moves });
      }
    }

    this.gameState = GameState.READY;
    this.checkGameEnd();
  }

  private checkGameEnd(): void {
    if (this.gameMode === GameMode.ENDLESS) {
      return;
    }

    if (this.score >= this.currentLevelConfig.targetScore) {
      this.gameState = GameState.LEVEL_COMPLETE;
      this.levelSystem.unlockNextLevel();
      this.itemSystem.updateHighScore(this.score);
      
      if (this.updateCallback) {
        this.updateCallback({ type: 'level_complete', value: true });
      }
      return;
    }

    if (this.moves <= 0) {
      this.gameState = GameState.GAME_OVER;
      this.itemSystem.updateHighScore(this.score);
      
      if (this.updateCallback) {
        this.updateCallback({ type: 'game_over', value: true });
      }
    }
  }

  async useHammer(gem: Gem): Promise<boolean> {
    if (!this.itemSystem.useItem(ItemType.HAMMER)) {
      return false;
    }

    this.gameBoard.removeGem(gem);
    await this.gameBoard.processMatches();
    this.gameState = GameState.READY;
    
    return true;
  }

  async useShuffle(): Promise<boolean> {
    if (!this.itemSystem.useItem(ItemType.SHUFFLE)) {
      return false;
    }

    this.gameBoard.shuffle();
    return true;
  }

  useExtraMoves(): boolean {
    if (!this.itemSystem.useItem(ItemType.EXTRA_MOVES)) {
      return false;
    }

    this.moves += 5;
    if (this.updateCallback) {
      this.updateCallback({ type: 'moves', value: this.moves });
    }
    return true;
  }

  startLevel(levelNumber: number): void {
    this.currentLevelConfig = this.levelSystem.getLevelConfig(levelNumber);
    this.levelSystem.setCurrentLevel(levelNumber);
    
    this.score = 0;
    this.moves = this.currentLevelConfig.moves;
    this.combo = 0;
    this.gameState = GameState.READY;
    this.gameMode = GameMode.CLASSIC;
    
    this.gameBoard.reset();
    
    if (this.updateCallback) {
      this.updateCallback({ type: 'score', value: 0 });
      this.updateCallback({ type: 'moves', value: this.moves });
      this.updateCallback({ type: 'combo', value: 0 });
    }
  }

  startDailyChallenge(day: number): void {
    this.currentLevelConfig = this.levelSystem.getDailyChallengeLevel(day);
    this.itemSystem.updateDailyStreak();
    
    this.score = 0;
    this.moves = this.currentLevelConfig.moves;
    this.combo = 0;
    this.gameState = GameState.READY;
    this.gameMode = GameMode.DAILY_CHALLENGE;
    
    this.gameBoard.reset();
    
    if (this.updateCallback) {
      this.updateCallback({ type: 'score', value: 0 });
      this.updateCallback({ type: 'moves', value: this.moves });
      this.updateCallback({ type: 'combo', value: 0 });
    }
  }

  startEndlessMode(): void {
    this.currentLevelConfig = this.levelSystem.getEndlessLevel();
    
    this.score = 0;
    this.moves = Infinity;
    this.combo = 0;
    this.gameState = GameState.READY;
    this.gameMode = GameMode.ENDLESS;
    
    this.gameBoard.reset();
    
    if (this.updateCallback) {
      this.updateCallback({ type: 'score', value: 0 });
      this.updateCallback({ type: 'moves', value: Infinity });
      this.updateCallback({ type: 'combo', value: 0 });
    }
  }

  startTestMode(): void {
    this.currentLevelConfig = this.levelSystem.getTestLevel();
    
    this.score = 0;
    this.moves = 999;
    this.combo = 0;
    this.gameState = GameState.READY;
    this.gameMode = GameMode.TEST;
    
    this.gameBoard.resetForTest();
    
    if (this.updateCallback) {
      this.updateCallback({ type: 'score', value: 0 });
      this.updateCallback({ type: 'moves', value: 999 });
      this.updateCallback({ type: 'combo', value: 0 });
    }
  }

  restart(): void {
    if (this.gameMode === GameMode.CLASSIC) {
      this.startLevel(this.levelSystem.getCurrentLevel());
    } else if (this.gameMode === GameMode.DAILY_CHALLENGE) {
      this.startDailyChallenge(new Date().getDay());
    } else if (this.gameMode === GameMode.ENDLESS) {
      this.startEndlessMode();
    } else if (this.gameMode === GameMode.TEST) {
      this.startTestMode();
    }
  }

  getGameMode(): GameMode {
    return this.gameMode;
  }
}
