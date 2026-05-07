import * as PIXI from 'pixi.js';
import { Gem, ItemType, GameState, GameMode } from './types';
import { BOARD_ROWS, BOARD_COLS, GEM_SIZE } from './constants';
import { GameEngine, GameUpdate } from './GameEngine';
import { GemView } from './GemView';

export class GameScene {
  private app: PIXI.Application;
  private engine: GameEngine;
  private boardContainer: PIXI.Container;
  private uiContainer: PIXI.Container;
  private gemViews: Map<string, GemView>;
  
  private scoreText: PIXI.Text;
  private movesText: PIXI.Text;
  private comboText: PIXI.Text;
  private targetText: PIXI.Text;
  private levelText: PIXI.Text;
  
  private itemButtons: Map<ItemType, PIXI.Graphics>;
  private hammerMode: boolean;
  private isProcessing: boolean;

  constructor(app: PIXI.Application, engine: GameEngine) {
    this.app = app;
    this.engine = engine;
    this.boardContainer = new PIXI.Container();
    this.uiContainer = new PIXI.Container();
    this.gemViews = new Map();
    this.scoreText = new PIXI.Text();
    this.movesText = new PIXI.Text();
    this.comboText = new PIXI.Text();
    this.targetText = new PIXI.Text();
    this.levelText = new PIXI.Text();
    this.itemButtons = new Map();
    this.hammerMode = false;
    this.isProcessing = false;

    this.setup();
  }

  private setup(): void {
    const boardWidth = BOARD_COLS * GEM_SIZE;

    this.boardContainer.x = (this.app.screen.width - boardWidth) / 2;
    this.boardContainer.y = 150;

    this.createBoardBackground();
    
    this.app.stage.addChild(this.boardContainer);
    this.app.stage.addChild(this.uiContainer);

    this.createUI();
    this.createGemViews();
    this.setupInteractions();
    this.setupCallbacks();
  }

  private createBoardBackground(): void {
    const bg = new PIXI.Graphics();
    const width = BOARD_COLS * GEM_SIZE;
    const height = BOARD_ROWS * GEM_SIZE;

    bg.beginFill(0x1a1a2e, 0.9);
    bg.drawRoundedRect(0, 0, width, height, 10);
    bg.endFill();

    bg.lineStyle(2, 0x333355, 0.5);
    for (let i = 0; i <= BOARD_COLS; i++) {
      bg.moveTo(i * GEM_SIZE, 0);
      bg.lineTo(i * GEM_SIZE, height);
    }
    for (let i = 0; i <= BOARD_ROWS; i++) {
      bg.moveTo(0, i * GEM_SIZE);
      bg.lineTo(width, i * GEM_SIZE);
    }

    this.boardContainer.addChild(bg);
  }

  private createUI(): void {
    const style = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 24,
      fill: '#ffffff',
      stroke: '#333333',
      strokeThickness: 4,
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 4,
      dropShadowAngle: Math.PI / 6,
      dropShadowDistance: 6,
    });

    const smallStyle = new PIXI.TextStyle({
      ...style,
      fontSize: 18,
    });

    const backBtnStyle = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 14,
      fill: '#ffffff',
      fontWeight: 'bold',
    });

    const backButton = new PIXI.Graphics();
    backButton.beginFill(0xff6348, 0.9);
    backButton.drawRoundedRect(this.app.screen.width - 100, 20, 80, 35, 8);
    backButton.endFill();
    backButton.lineStyle(2, 0xffffff, 0.5);
    backButton.drawRoundedRect(this.app.screen.width - 100, 20, 80, 35, 8);
    
    const backText = new PIXI.Text('返回', backBtnStyle);
    backText.x = this.app.screen.width - 60;
    backText.y = 37.5;
    backText.anchor.set(0.5);

    backButton.interactive = true;
    backButton.cursor = 'pointer';
    backButton.on('pointerdown', () => {
      this.handleBackToMenu();
    });

    this.uiContainer.addChild(backButton);
    this.uiContainer.addChild(backText);

    this.levelText = new PIXI.Text('第 1 关', style);
    this.levelText.x = 20;
    this.levelText.y = 20;
    this.uiContainer.addChild(this.levelText);

    this.scoreText = new PIXI.Text('分数: 0', style);
    this.scoreText.x = 20;
    this.scoreText.y = 60;
    this.uiContainer.addChild(this.scoreText);

    this.targetText = new PIXI.Text('目标: 1000', smallStyle);
    this.targetText.x = 20;
    this.targetText.y = 95;
    this.uiContainer.addChild(this.targetText);

    this.movesText = new PIXI.Text('步数: 25', style);
    this.movesText.x = this.app.screen.width - 150;
    this.movesText.y = 60;
    this.uiContainer.addChild(this.movesText);

    this.comboText = new PIXI.Text('连击: 0', smallStyle);
    this.comboText.x = this.app.screen.width - 150;
    this.comboText.y = 95;
    this.comboText.visible = false;
    this.uiContainer.addChild(this.comboText);

    this.createItemButtons();
  }

  private handleBackToMenu(): void {
    this.app.stage.removeChild(this.boardContainer);
    this.app.stage.removeChild(this.uiContainer);
    this.destroy();
    window.dispatchEvent(new CustomEvent('backToMenu'));
  }

  private createItemButtons(): void {
    const buttonSize = 60;
    const spacing = 20;
    const startX = (this.app.screen.width - (buttonSize * 3 + spacing * 2)) / 2;
    const y = this.app.screen.height - 100;

    const items = [
      { type: ItemType.HAMMER, label: '锤子', color: 0xff4757 },
      { type: ItemType.SHUFFLE, label: '刷新', color: 0x2ed573 },
      { type: ItemType.EXTRA_MOVES, label: '+5步', color: 0x3742fa },
    ];

    items.forEach((item, index) => {
      const x = startX + index * (buttonSize + spacing);
      
      const button = new PIXI.Graphics();
      button.beginFill(item.color, 0.8);
      button.drawRoundedRect(x, y, buttonSize, buttonSize, 10);
      button.endFill();
      
      button.lineStyle(2, 0xffffff, 0.5);
      button.drawRoundedRect(x, y, buttonSize, buttonSize, 10);

      const style = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 12,
        fill: '#ffffff',
        align: 'center',
      });

      const label = new PIXI.Text(item.label, style);
      label.x = x + buttonSize / 2;
      label.y = y + buttonSize / 2;
      label.anchor.set(0.5);
      this.uiContainer.addChild(label);

      const countStyle = new PIXI.TextStyle({
        ...style,
        fontSize: 10,
      });
      const count = this.engine.getItemSystem().getItemCount(item.type);
      const countText = new PIXI.Text(`x${count}`, countStyle);
      countText.x = x + buttonSize - 5;
      countText.y = y + 5;
      countText.anchor.set(1, 0);
      countText.name = `count_${item.type}`;
      this.uiContainer.addChild(countText);

      button.interactive = true;
      button.cursor = 'pointer';
      
      button.on('pointerdown', () => {
        this.useItem(item.type);
      });

      this.uiContainer.addChild(button);
      this.itemButtons.set(item.type, button);
    });
  }

  private async useItem(type: ItemType): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    if (this.engine.getGameState() !== GameState.READY) {
      return;
    }

    this.isProcessing = true;

    switch (type) {
      case ItemType.HAMMER:
        this.hammerMode = !this.hammerMode;
        this.updateItemButtons();
        break;
        
      case ItemType.SHUFFLE:
        if (await this.engine.useShuffle()) {
          this.refreshBoard();
          this.updateItemCount(type);
          await this.engine.getGameBoard().processMatches();
        }
        break;
        
      case ItemType.EXTRA_MOVES:
        if (this.engine.useExtraMoves()) {
          this.updateItemCount(type);
        }
        break;
    }

    this.isProcessing = false;
  }

  private updateItemButtons(): void {
    this.itemButtons.forEach((button, type) => {
      if (type === ItemType.HAMMER && this.hammerMode) {
        button.alpha = 1;
        button.tint = 0xffff00;
      } else {
        button.alpha = this.engine.getItemSystem().getItemCount(type) > 0 ? 1 : 0.3;
        button.tint = 0xffffff;
      }
    });
  }

  private updateItemCount(type: ItemType): void {
    const countText = this.uiContainer.getChildByName(`count_${type}`) as PIXI.Text;
    if (countText) {
      const count = this.engine.getItemSystem().getItemCount(type);
      countText.text = `x${count}`;
    }
    this.updateItemButtons();
  }

  private createGemViews(): void {
    const board = this.engine.getGameBoard().getBoard();
    
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const gem = board[row][col];
        if (gem) {
          const gemView = new GemView(gem);
          this.gemViews.set(gem.id, gemView);
          this.boardContainer.addChild(gemView.sprite);
        }
      }
    }
  }

  private setupInteractions(): void {
    this.boardContainer.interactive = true;
    this.boardContainer.hitArea = new PIXI.Rectangle(
      0, 0, 
      BOARD_COLS * GEM_SIZE, 
      BOARD_ROWS * GEM_SIZE
    );

    this.boardContainer.on('pointerdown', (event: PIXI.FederatedPointerEvent) => {
      if (this.isProcessing) {
        return;
      }

      if (this.engine.getGameState() !== GameState.READY && 
          this.engine.getGameState() !== GameState.SELECTING) {
        return;
      }

      const localPos = this.boardContainer.toLocal(event.global);
      const col = Math.floor(localPos.x / GEM_SIZE);
      const row = Math.floor(localPos.y / GEM_SIZE);

      if (row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS) {
        const board = this.engine.getGameBoard().getBoard();
        const gem = board[row][col];
        
        if (gem) {
          if (this.hammerMode) {
            this.handleHammer(gem);
          } else {
            this.handleGemClick(gem);
          }
        }
      }
    });
  }

  private async handleHammer(gem: Gem): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.hammerMode = false;
    this.updateItemButtons();

    const gemView = this.gemViews.get(gem.id);
    if (gemView) {
      await gemView.animateRemove();
      this.boardContainer.removeChild(gemView.sprite);
      gemView.destroy();
      this.gemViews.delete(gem.id);
    }

    await this.engine.useHammer(gem);
    this.updateItemCount(ItemType.HAMMER);
    
    this.isProcessing = false;
  }

  private async handleGemClick(gem: Gem): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    const selectedGem = this.engine.getGameBoard().getSelectedGem();
    
    if (selectedGem && selectedGem.id !== gem.id) {
      this.updateGemSelection(selectedGem, false);
    }

    this.isProcessing = true;

    await this.engine.selectGem(gem);

    const newSelected = this.engine.getGameBoard().getSelectedGem();
    if (newSelected) {
      this.updateGemSelection(newSelected, true);
    }

    this.isProcessing = false;
  }

  private updateGemSelection(gem: Gem, selected: boolean): void {
    const gemView = this.gemViews.get(gem.id);
    if (gemView) {
      gemView.setSelected(selected);
    }
  }

  private setupCallbacks(): void {
    this.engine.setUpdateCallback((update: GameUpdate) => {
      this.handleGameUpdate(update);
    });

    this.engine.setSwapCallback(async (gem1: Gem, gem2: Gem, isSwapBack: boolean) => {
      await this.handleSwap(gem1, gem2, isSwapBack);
    });

    this.engine.setBoardUpdateCallback(async (gemsToRemove, gemsToFall, gemsToCreate, gemsToUpdate) => {
      await this.handleBoardUpdate(gemsToRemove, gemsToFall, gemsToCreate, gemsToUpdate);
    });
  }

  private async handleSwap(gem1: Gem, gem2: Gem, _isSwapBack: boolean): Promise<void> {
    const view1 = this.gemViews.get(gem1.id);
    const view2 = this.gemViews.get(gem2.id);

    if (view1 && view2) {
      const targetX1 = view2.sprite.x;
      const targetY1 = view2.sprite.y;
      const targetX2 = view1.sprite.x;
      const targetY2 = view1.sprite.y;

      await Promise.all([
        view1.animateTo(targetX1, targetY1, 200),
        view2.animateTo(targetX2, targetY2, 200)
      ]);
    }
  }

  private handleGameUpdate(update: GameUpdate): void {
    switch (update.type) {
      case 'score':
        this.scoreText.text = `分数: ${update.value}`;
        break;
      case 'moves':
        const moves = update.value as number;
        this.movesText.text = moves === Infinity ? '步数: ∞' : `步数: ${moves}`;
        break;
      case 'combo':
        const combo = update.value as number;
        if (combo > 1) {
          this.comboText.text = `连击: ${combo}x`;
          this.comboText.visible = true;
          this.showComboEffect();
        } else {
          this.comboText.visible = false;
        }
        break;
      case 'game_over':
        this.showGameOver();
        break;
      case 'level_complete':
        this.showLevelComplete();
        break;
    }
  }

  private async handleBoardUpdate(
    gemsToRemove: Gem[],
    gemsToFall: { gem: Gem; targetRow: number }[],
    gemsToCreate: { gem: Gem; startRow: number }[],
    gemsToUpdate: Gem[]
  ): Promise<void> {
    const removePromises = gemsToRemove.map(gem => {
      const gemView = this.gemViews.get(gem.id);
      if (gemView) {
        return gemView.animateRemove().then(() => {
          this.boardContainer.removeChild(gemView.sprite);
          gemView.destroy();
          this.gemViews.delete(gem.id);
        });
      }
      return Promise.resolve();
    });

    await Promise.all(removePromises);

    const fallPromises = gemsToFall.map(({ gem, targetRow }) => {
      const gemView = this.gemViews.get(gem.id);
      if (gemView) {
        return gemView.animateFall(targetRow);
      }
      return Promise.resolve();
    });

    await Promise.all(fallPromises);

    const createPromises = gemsToCreate.map(({ gem, startRow }) => {
      const gemView = new GemView(gem);
      gemView.sprite.y = startRow * GEM_SIZE + GEM_SIZE / 2;
      gemView.sprite.x = gem.col * GEM_SIZE + GEM_SIZE / 2;
      
      this.gemViews.set(gem.id, gemView);
      this.boardContainer.addChild(gemView.sprite);
      
      return gemView.animateFall(gem.row);
    });

    await Promise.all(createPromises);

    for (const gem of gemsToUpdate) {
      const gemView = this.gemViews.get(gem.id);
      if (gemView) {
        gemView.updateGem(gem);
      }
    }

    this.checkPossibleMovesAndAutoShuffle();
  }

  private checkPossibleMovesAndAutoShuffle(): void {
    const hasPossibleMoves = this.engine.getGameBoard().hasPossibleMoves();
    if (hasPossibleMoves) {
      return;
    }

    const hasHammer = this.engine.getItemSystem().getItemCount(ItemType.HAMMER) > 0;
    const hasShuffle = this.engine.getItemSystem().getItemCount(ItemType.SHUFFLE) > 0;

    if (!hasHammer && !hasShuffle) {
      this.showToast('无可用移动，自动重排中...');
      
      setTimeout(() => {
        this.engine.getGameBoard().shuffle();
        this.refreshBoard();
        this.showToast('已重排，继续游戏！');
      }, 500);
    } else {
      this.showToast('无可用移动，请使用道具');
    }
  }

  private showToast(message: string): void {
    const style = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 18,
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
    });

    const text = new PIXI.Text(message, style);
    text.x = this.app.screen.width / 2;
    text.y = this.app.screen.height / 2;
    text.anchor.set(0.5);

    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.7);
    bg.drawRoundedRect(
      text.x - text.width / 2 - 20,
      text.y - text.height / 2 - 10,
      text.width + 40,
      text.height + 20,
      8
    );
    bg.endFill();

    this.uiContainer.addChild(bg);
    this.uiContainer.addChild(text);

    setTimeout(() => {
      if (bg.parent) {
        bg.parent.removeChild(bg);
      }
      if (text.parent) {
        text.parent.removeChild(text);
      }
      bg.destroy();
      text.destroy();
    }, 2000);
  }

  private showComboEffect(): void {
    this.comboText.style.fontSize = 28;
    this.comboText.style.fill = '#ffff00';
    
    setTimeout(() => {
      this.comboText.style.fontSize = 18;
      this.comboText.style.fill = '#ffffff';
    }, 300);
  }

  private showGameOver(): void {
    const container = new PIXI.Container();
    
    const overlay = this.createBaseOverlay();
    container.addChild(overlay);

    const message = this.createTitleText('游戏结束', 0xff4757);
    message.y = this.app.screen.height / 2 - 80;
    container.addChild(message);

    const btnStyle = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 20,
      fill: '#ffffff',
      align: 'center',
      fontWeight: 'bold',
    });

    const buttonWidth = 120;
    const buttonHeight = 45;
    const spacing = 20;
    const totalWidth = buttonWidth * 2 + spacing;
    const startX = (this.app.screen.width - totalWidth) / 2;
    const buttonY = this.app.screen.height / 2 + 20;

    const restartButton = this.createButton(
      startX, buttonY, buttonWidth, buttonHeight,
      0x3742fa, '重新开始', btnStyle,
      () => {
        this.removeOverlayContainer(container);
        this.engine.restart();
        this.refreshBoard();
        this.updateUI();
      }
    );
    container.addChild(restartButton.button);
    container.addChild(restartButton.text);

    const backButton = this.createButton(
      startX + buttonWidth + spacing, buttonY, buttonWidth, buttonHeight,
      0xff6348, '返回主菜单', btnStyle,
      () => {
        this.removeOverlayContainer(container);
        this.handleBackToMenu();
      }
    );
    container.addChild(backButton.button);
    container.addChild(backButton.text);

    this.app.stage.addChild(container);
  }

  private showLevelComplete(): void {
    const container = new PIXI.Container();
    
    const overlay = this.createBaseOverlay();
    container.addChild(overlay);

    const message = this.createTitleText('关卡完成!', 0x2ed573);
    message.y = this.app.screen.height / 2 - 80;
    container.addChild(message);

    const btnStyle = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 18,
      fill: '#ffffff',
      align: 'center',
      fontWeight: 'bold',
    });

    const buttonWidth = 110;
    const buttonHeight = 45;
    const spacing = 15;
    const totalWidth = buttonWidth * 3 + spacing * 2;
    const startX = (this.app.screen.width - totalWidth) / 2;
    const buttonY = this.app.screen.height / 2 + 20;

    const nextButton = this.createButton(
      startX, buttonY, buttonWidth, buttonHeight,
      0x2ed573, '下一关', btnStyle,
      () => {
        this.removeOverlayContainer(container);
        this.engine.getLevelSystem().unlockNextLevel();
        const nextLevel = this.engine.getLevelSystem().getCurrentLevel() + 1;
        if (nextLevel <= this.engine.getLevelSystem().getTotalLevels()) {
          this.engine.startLevel(nextLevel);
          this.refreshBoard();
          this.updateUI();
        } else {
          this.handleBackToMenu();
        }
      }
    );
    container.addChild(nextButton.button);
    container.addChild(nextButton.text);

    const restartButton = this.createButton(
      startX + buttonWidth + spacing, buttonY, buttonWidth, buttonHeight,
      0x3742fa, '重新开始', btnStyle,
      () => {
        this.removeOverlayContainer(container);
        this.engine.restart();
        this.refreshBoard();
        this.updateUI();
      }
    );
    container.addChild(restartButton.button);
    container.addChild(restartButton.text);

    const backButton = this.createButton(
      startX + (buttonWidth + spacing) * 2, buttonY, buttonWidth, buttonHeight,
      0xff6348, '返回主菜单', btnStyle,
      () => {
        this.removeOverlayContainer(container);
        this.handleBackToMenu();
      }
    );
    container.addChild(backButton.button);
    container.addChild(backButton.text);

    this.app.stage.addChild(container);
  }

  private createBaseOverlay(): PIXI.Graphics {
    const overlay = new PIXI.Graphics();
    overlay.beginFill(0x000000, 0.75);
    overlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
    overlay.endFill();
    return overlay;
  }

  private createTitleText(text: string, color: number): PIXI.Text {
    const style = new PIXI.TextStyle({
      fontFamily: 'Arial Black',
      fontSize: 42,
      fill: color,
      stroke: 0x000000,
      strokeThickness: 5,
      align: 'center',
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 4,
      dropShadowAngle: Math.PI / 6,
      dropShadowDistance: 4,
    });

    const message = new PIXI.Text(text, style);
    message.x = this.app.screen.width / 2;
    message.anchor.set(0.5);
    return message;
  }

  private createButton(
    x: number, y: number, width: number, height: number,
    color: number, label: string, style: PIXI.TextStyle,
    onClick: () => void
  ): { button: PIXI.Graphics; text: PIXI.Text } {
    const button = new PIXI.Graphics();
    button.beginFill(color, 0.9);
    button.drawRoundedRect(x, y, width, height, 10);
    button.endFill();
    button.lineStyle(2, 0xffffff, 0.5);
    button.drawRoundedRect(x, y, width, height, 10);
    button.interactive = true;
    button.cursor = 'pointer';

    const text = new PIXI.Text(label, style);
    text.x = x + width / 2;
    text.y = y + height / 2;
    text.anchor.set(0.5);

    button.on('pointerover', () => {
      button.alpha = 0.85;
    });

    button.on('pointerout', () => {
      button.alpha = 1;
    });

    button.on('pointerdown', onClick);

    return { button, text };
  }

  private removeOverlayContainer(container: PIXI.Container): void {
    if (container && this.app.stage.children.includes(container)) {
      this.app.stage.removeChild(container);
      container.destroy({ children: true });
    }
  }

  private refreshBoard(): void {
    this.gemViews.forEach(gemView => {
      this.boardContainer.removeChild(gemView.sprite);
      gemView.destroy();
    });
    this.gemViews.clear();
    this.createGemViews();
  }

  private updateUI(): void {
    const config = this.engine.getCurrentLevelConfig();
    const mode = this.engine.getGameMode();

    if (mode === GameMode.CLASSIC) {
      this.levelText.text = `第 ${this.engine.getLevelSystem().getCurrentLevel()} 关`;
    } else if (mode === GameMode.DAILY_CHALLENGE) {
      this.levelText.text = '每日挑战';
    } else if (mode === GameMode.TEST) {
      this.levelText.text = '特殊宝石测试';
    } else {
      this.levelText.text = '无尽模式';
    }

    this.scoreText.text = `分数: ${this.engine.getScore()}`;
    
    if (mode === GameMode.ENDLESS) {
      this.targetText.visible = false;
      this.movesText.text = '步数: ∞';
    } else if (mode === GameMode.TEST) {
      this.targetText.visible = true;
      this.targetText.text = '测试模式: 无限目标';
      this.movesText.text = `步数: ${this.engine.getMoves()}`;
    } else {
      this.targetText.visible = true;
      this.targetText.text = config.targetScore === Infinity 
        ? '' 
        : `目标: ${config.targetScore}`;
      this.movesText.text = `步数: ${this.engine.getMoves()}`;
    }

    this.comboText.visible = false;

    this.updateItemCount(ItemType.HAMMER);
    this.updateItemCount(ItemType.SHUFFLE);
    this.updateItemCount(ItemType.EXTRA_MOVES);
  }

  public destroy(): void {
    this.gemViews.forEach(gemView => gemView.destroy());
    this.boardContainer.destroy({ children: true });
    this.uiContainer.destroy({ children: true });
  }
}
