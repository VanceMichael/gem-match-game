import * as PIXI from 'pixi.js';
import { GameEngine } from './GameEngine';

export type LevelSelectCallback = (level: number | 'back') => void;

export class LevelSelectScene {
  private app: PIXI.Application;
  private engine: GameEngine;
  private container: PIXI.Container;
  private callback: LevelSelectCallback | null;

  constructor(app: PIXI.Application, engine: GameEngine) {
    this.app = app;
    this.engine = engine;
    this.container = new PIXI.Container();
    this.callback = null;

    this.create();
  }

  setCallback(callback: LevelSelectCallback): void {
    this.callback = callback;
  }

  private create(): void {
    const bg = new PIXI.Graphics();
    bg.beginFill(0x0f3460, 1);
    bg.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
    bg.endFill();
    this.container.addChild(bg);

    const titleStyle = new PIXI.TextStyle({
      fontFamily: 'Arial Black',
      fontSize: 42,
      fill: ['#ffffff', '#00ff99'],
      stroke: '#4a1850',
      strokeThickness: 5,
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 4,
      dropShadowAngle: Math.PI / 6,
      dropShadowDistance: 6,
    });

    const title = new PIXI.Text('选择关卡', titleStyle);
    title.x = this.app.screen.width / 2;
    title.y = 60;
    title.anchor.set(0.5);
    this.container.addChild(title);

    this.createLevelButtons();
    this.createBackButton();
  }

  private createLevelButtons(): void {
    const levels = this.engine.getLevelSystem().getLevels();
    const maxUnlocked = this.engine.getLevelSystem().getMaxUnlockedLevel();

    const cols = 5;
    const buttonSize = 60;
    const spacing = 20;
    const startX = (this.app.screen.width - (cols * buttonSize + (cols - 1) * spacing)) / 2;
    const startY = 120;

    const displayLevels = levels.slice(0, Math.min(50, levels.length));

    displayLevels.forEach((_level, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (buttonSize + spacing);
      const y = startY + row * (buttonSize + spacing);

      const isUnlocked = index + 1 <= maxUnlocked;

      const button = new PIXI.Graphics();
      
      if (isUnlocked) {
        button.beginFill(0x3742fa, 0.9);
      } else {
        button.beginFill(0x555555, 0.5);
      }
      
      button.drawRoundedRect(x, y, buttonSize, buttonSize, 10);
      button.endFill();

      if (isUnlocked) {
        button.lineStyle(2, 0xffffff, 0.5);
        button.drawRoundedRect(x, y, buttonSize, buttonSize, 10);
      }

      const levelNum = index + 1;
      const textStyle = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 20,
        fill: isUnlocked ? '#ffffff' : '#888888',
        fontWeight: 'bold',
      });

      const text = new PIXI.Text(levelNum.toString(), textStyle);
      text.x = x + buttonSize / 2;
      text.y = y + buttonSize / 2;
      text.anchor.set(0.5);

      if (isUnlocked) {
        button.interactive = true;
        button.cursor = 'pointer';

        button.on('pointerover', () => {
          button.alpha = 0.8;
        });

        button.on('pointerout', () => {
          button.alpha = 1;
        });

        button.on('pointerdown', () => {
          if (this.callback) {
            this.callback(levelNum);
          }
        });
      }

      this.container.addChild(button);
      this.container.addChild(text);
    });
  }

  private createBackButton(): void {
    const buttonWidth = 120;
    const buttonHeight = 50;
    const x = 20;
    const y = 20;

    const button = new PIXI.Graphics();
    button.beginFill(0xff6348, 0.9);
    button.drawRoundedRect(x, y, buttonWidth, buttonHeight, 10);
    button.endFill();

    button.lineStyle(2, 0xffffff, 0.5);
    button.drawRoundedRect(x, y, buttonWidth, buttonHeight, 10);

    const textStyle = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 20,
      fill: '#ffffff',
      fontWeight: 'bold',
    });

    const text = new PIXI.Text('返回', textStyle);
    text.x = x + buttonWidth / 2;
    text.y = y + buttonHeight / 2;
    text.anchor.set(0.5);

    button.interactive = true;
    button.cursor = 'pointer';

    button.on('pointerover', () => {
      button.alpha = 0.8;
    });

    button.on('pointerout', () => {
      button.alpha = 1;
    });

    button.on('pointerdown', () => {
      if (this.callback) {
        this.callback('back');
      }
    });

    this.container.addChild(button);
    this.container.addChild(text);
  }

  getContainer(): PIXI.Container {
    return this.container;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
