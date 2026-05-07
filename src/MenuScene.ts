import * as PIXI from 'pixi.js';
import { GameEngine } from './GameEngine';

export type MenuCallback = (action: 'start_classic' | 'start_daily' | 'start_endless' | 'select_level' | 'start_test') => void;

export class MenuScene {
  private app: PIXI.Application;
  private engine: GameEngine;
  private container: PIXI.Container;
  private callback: MenuCallback | null;

  constructor(app: PIXI.Application, engine: GameEngine) {
    this.app = app;
    this.engine = engine;
    this.container = new PIXI.Container();
    this.callback = null;

    this.create();
  }

  setCallback(callback: MenuCallback): void {
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
      fontSize: 56,
      fill: ['#ffffff', '#00ff99'],
      stroke: '#4a1850',
      strokeThickness: 6,
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 4,
      dropShadowAngle: Math.PI / 6,
      dropShadowDistance: 6,
      wordWrap: true,
      wordWrapWidth: 440,
      lineJoin: 'round',
    });

    const title = new PIXI.Text('宝石消除', titleStyle);
    title.x = this.app.screen.width / 2;
    title.y = 100;
    title.anchor.set(0.5);
    this.container.addChild(title);

    const subtitleStyle = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 24,
      fill: '#aaaaaa',
    });

    const subtitle = new PIXI.Text('经典三消游戏', subtitleStyle);
    subtitle.x = this.app.screen.width / 2;
    subtitle.y = 180;
    subtitle.anchor.set(0.5);
    this.container.addChild(subtitle);

    this.createButtons();
    this.createGemDecorations();
  }

  private createButtons(): void {
    const buttonWidth = 280;
    const buttonHeight = 60;
    const buttonSpacing = 30;
    const startY = 280;

    const buttons = [
      { label: '开始游戏', action: 'start_classic' as const, color: 0x2ed573 },
      { label: '每日挑战', action: 'start_daily' as const, color: 0x3742fa },
      { label: '无尽模式', action: 'start_endless' as const, color: 0xff6348 },
      { label: '选择关卡', action: 'select_level' as const, color: 0x8e44ad },
      { label: '特殊宝石测试', action: 'start_test' as const, color: 0xffa502 },
    ];

    buttons.forEach((btn, index) => {
      const y = startY + index * (buttonHeight + buttonSpacing);
      
      const button = new PIXI.Graphics();
      button.beginFill(btn.color, 0.9);
      button.drawRoundedRect(
        (this.app.screen.width - buttonWidth) / 2,
        y,
        buttonWidth,
        buttonHeight,
        15
      );
      button.endFill();

      button.lineStyle(3, 0xffffff, 0.3);
      button.drawRoundedRect(
        (this.app.screen.width - buttonWidth) / 2,
        y,
        buttonWidth,
        buttonHeight,
        15
      );

      const btnStyle = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 24,
        fill: '#ffffff',
        fontWeight: 'bold',
      });

      const text = new PIXI.Text(btn.label, btnStyle);
      text.x = this.app.screen.width / 2;
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
          this.callback(btn.action);
        }
      });

      this.container.addChild(button);
      this.container.addChild(text);
    });

    const levelInfo = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 16,
      fill: '#888888',
    });

    const maxLevel = this.engine.getLevelSystem().getTotalLevels();
    const unlockedLevel = this.engine.getLevelSystem().getMaxUnlockedLevel();

    const infoText = new PIXI.Text(
      `已解锁: ${unlockedLevel}/${maxLevel} 关 | 最高分: ${this.engine.getItemSystem().getHighScore()}`,
      levelInfo
    );
    infoText.x = this.app.screen.width / 2;
    infoText.y = this.app.screen.height - 50;
    infoText.anchor.set(0.5);
    this.container.addChild(infoText);
  }

  private createGemDecorations(): void {
    const gemColors = [0xff4757, 0x3742fa, 0x2ed573, 0xffa502, 0x8e44ad, 0xff6348];
    const size = 40;
    const halfSize = size / 2;

    for (let i = 0; i < 12; i++) {
      const gem = new PIXI.Graphics();
      const color = gemColors[i % gemColors.length];
      
      gem.beginFill(color, 0.3);
      gem.moveTo(0, -halfSize);
      gem.lineTo(halfSize, 0);
      gem.lineTo(0, halfSize);
      gem.lineTo(-halfSize, 0);
      gem.closePath();
      gem.endFill();

      gem.x = Math.random() * this.app.screen.width;
      gem.y = Math.random() * this.app.screen.height;
      gem.rotation = Math.random() * Math.PI;
      gem.alpha = 0.3 + Math.random() * 0.3;

      this.container.addChildAt(gem, 1);
    }
  }

  getContainer(): PIXI.Container {
    return this.container;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
