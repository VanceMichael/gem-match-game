import * as PIXI from 'pixi.js';
import { GameEngine } from './GameEngine';
import { GameScene } from './GameScene';
import { MenuScene } from './MenuScene';
import { LevelSelectScene } from './LevelSelectScene';

class GameApp {
  private app: PIXI.Application;
  private engine: GameEngine;
  private menuScene: MenuScene | null;
  private gameScene: GameScene | null;
  private levelSelectScene: LevelSelectScene | null;

  constructor() {
    this.engine = new GameEngine();
    this.menuScene = null;
    this.gameScene = null;
    this.levelSelectScene = null;

    this.app = new PIXI.Application({
      width: Math.min(window.innerWidth, 480),
      height: Math.min(window.innerHeight, 800),
      backgroundColor: 0x1a1a2e,
      antialias: true,
    });

    this.init();
  }

  private init(): void {
    const container = document.getElementById('game-container');
    if (container) {
      container.appendChild(this.app.view as unknown as HTMLElement);
    }

    window.addEventListener('backToMenu', () => {
      this.showMenu();
    });

    this.showMenu();
    this.setupResize();
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      this.app.renderer.resize(
        Math.min(window.innerWidth, 480),
        Math.min(window.innerHeight, 800)
      );
    });
  }

  private showMenu(): void {
    this.clearScene();

    this.menuScene = new MenuScene(this.app, this.engine);
    this.menuScene.setCallback((action) => {
      this.handleMenuAction(action);
    });

    this.app.stage.addChild(this.menuScene!.getContainer());
  }

  private handleMenuAction(action: 'start_classic' | 'start_daily' | 'start_endless' | 'select_level' | 'start_test'): void {
    switch (action) {
      case 'start_classic':
        this.startClassicMode();
        break;
      case 'start_daily':
        this.startDailyChallenge();
        break;
      case 'start_endless':
        this.startEndlessMode();
        break;
      case 'select_level':
        this.showLevelSelect();
        break;
      case 'start_test':
        this.startTestMode();
        break;
    }
  }

  private startClassicMode(): void {
    this.engine.startLevel(this.engine.getLevelSystem().getCurrentLevel());
    this.showGameScene();
  }

  private startDailyChallenge(): void {
    const day = new Date().getDay();
    this.engine.startDailyChallenge(day);
    this.showGameScene();
  }

  private startEndlessMode(): void {
    this.engine.startEndlessMode();
    this.showGameScene();
  }

  private startTestMode(): void {
    this.engine.startTestMode();
    this.showGameScene();
  }

  private showLevelSelect(): void {
    this.clearScene();

    this.levelSelectScene = new LevelSelectScene(this.app, this.engine);
    this.levelSelectScene.setCallback((level) => {
      if (level === 'back') {
        this.showMenu();
      } else {
        this.engine.startLevel(level);
        this.showGameScene();
      }
    });

    this.app.stage.addChild(this.levelSelectScene!.getContainer());
  }

  private showGameScene(): void {
    this.clearScene();
    this.gameScene = new GameScene(this.app, this.engine);
  }

  private clearScene(): void {
    while (this.app.stage.children.length > 0) {
      const child = this.app.stage.children[0];
      this.app.stage.removeChild(child);
      if (child.destroy) {
        child.destroy({ children: true });
      }
    }

    if (this.menuScene) {
      this.menuScene.destroy();
      this.menuScene = null;
    }

    if (this.gameScene) {
      this.gameScene.destroy();
      this.gameScene = null;
    }

    if (this.levelSelectScene) {
      this.levelSelectScene.destroy();
      this.levelSelectScene = null;
    }
  }
}

window.addEventListener('load', () => {
  new GameApp();
});
