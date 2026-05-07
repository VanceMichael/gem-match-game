import * as PIXI from 'pixi.js';
import { Gem, SpecialGemType } from './types';
import { GEM_COLORS, GEM_SIZE } from './constants';

export class GemView {
  public gem: Gem;
  public sprite: PIXI.Container;
  private gemShape: PIXI.Graphics;
  private specialOverlay: PIXI.Graphics | null;
  private isAnimating: boolean;

  constructor(gem: Gem) {
    this.gem = gem;
    this.sprite = new PIXI.Container();
    this.gemShape = new PIXI.Graphics();
    this.specialOverlay = null;
    this.isAnimating = false;

    this.createGemShape();
    this.createSpecialOverlay();
    this.sprite.addChild(this.gemShape);
    if (this.specialOverlay) {
      this.sprite.addChild(this.specialOverlay);
    }

    this.updatePosition();
  }

  private createGemShape(): void {
    const color = GEM_COLORS[this.gem.type];
    const size = GEM_SIZE - 4;
    const halfSize = size / 2;

    this.gemShape.clear();
    
    this.gemShape.beginFill(0x000000, 0.3);
    this.drawGemShape(this.gemShape, halfSize + 2, size);
    this.gemShape.endFill();

    this.gemShape.beginFill(color, 1);
    this.drawGemShape(this.gemShape, halfSize, size);
    this.gemShape.endFill();

    this.gemShape.beginFill(0xffffff, 0.3);
    this.gemShape.drawRoundedRect(-halfSize + 4, -halfSize + 4, halfSize, halfSize / 2, 8);
    this.gemShape.endFill();
  }

  private drawGemShape(graphics: PIXI.Graphics, halfSize: number, _size: number): void {
    graphics.moveTo(0, -halfSize);
    graphics.lineTo(halfSize, 0);
    graphics.lineTo(0, halfSize);
    graphics.lineTo(-halfSize, 0);
    graphics.closePath();
  }

  private createSpecialOverlay(): void {
    if (this.gem.specialType === SpecialGemType.NONE) {
      this.specialOverlay = null;
      return;
    }

    this.specialOverlay = new PIXI.Graphics();
    const halfSize = (GEM_SIZE - 4) / 2;

    switch (this.gem.specialType) {
      case SpecialGemType.STRIPED_HORIZONTAL:
        this.specialOverlay.beginFill(0xffffff, 0.3);
        this.drawGemShape(this.specialOverlay, halfSize, GEM_SIZE - 4);
        this.specialOverlay.endFill();
        
        this.specialOverlay.lineStyle(4, 0xffffff, 1);
        for (let i = -2; i <= 2; i++) {
          const y = i * (halfSize / 2.5);
          this.specialOverlay.moveTo(-halfSize + 3, y);
          this.specialOverlay.lineTo(halfSize - 3, y);
        }
        
        this.specialOverlay.lineStyle(2, 0xffff00, 0.8);
        this.drawGemShape(this.specialOverlay, halfSize, GEM_SIZE - 4);
        break;

      case SpecialGemType.STRIPED_VERTICAL:
        this.specialOverlay.beginFill(0xffffff, 0.3);
        this.drawGemShape(this.specialOverlay, halfSize, GEM_SIZE - 4);
        this.specialOverlay.endFill();
        
        this.specialOverlay.lineStyle(4, 0xffffff, 1);
        for (let i = -2; i <= 2; i++) {
          const x = i * (halfSize / 2.5);
          this.specialOverlay.moveTo(x, -halfSize + 3);
          this.specialOverlay.lineTo(x, halfSize - 3);
        }
        
        this.specialOverlay.lineStyle(2, 0xffff00, 0.8);
        this.drawGemShape(this.specialOverlay, halfSize, GEM_SIZE - 4);
        break;

      case SpecialGemType.WRAPPED:
        this.specialOverlay.beginFill(0xff0000, 0.2);
        this.drawGemShape(this.specialOverlay, halfSize, GEM_SIZE - 4);
        this.specialOverlay.endFill();
        
        this.specialOverlay.lineStyle(3, 0xffffff, 1);
        this.drawGemShape(this.specialOverlay, halfSize - 3, GEM_SIZE - 10);
        
        this.specialOverlay.lineStyle(2, 0xff0000, 0.9);
        this.specialOverlay.drawCircle(0, 0, halfSize * 0.35);
        
        this.specialOverlay.beginFill(0xff0000, 0.6);
        this.specialOverlay.drawCircle(0, 0, halfSize * 0.2);
        this.specialOverlay.endFill();
        
        this.specialOverlay.lineStyle(2, 0xffff00, 0.7);
        this.drawGemShape(this.specialOverlay, halfSize, GEM_SIZE - 4);
        break;

      case SpecialGemType.COLOR_BOMB:
        this.specialOverlay.beginFill(0x000000, 0.7);
        this.drawGemShape(this.specialOverlay, halfSize + 1, GEM_SIZE - 2);
        this.specialOverlay.endFill();
        
        this.specialOverlay.beginFill(0x1a1a2e, 0.9);
        this.drawGemShape(this.specialOverlay, halfSize - 1, GEM_SIZE - 6);
        this.specialOverlay.endFill();
        
        const rainbowColors = [
          0xff4757, 0xffa502, 0x2ed573, 
          0x3742fa, 0x8e44ad, 0xff6348
        ];
        
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const radius = halfSize * 0.55;
          const color = rainbowColors[i];
          
          this.specialOverlay.beginFill(color, 1);
          this.specialOverlay.drawCircle(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            halfSize * 0.22
          );
          this.specialOverlay.endFill();
        }
        
        this.specialOverlay.beginFill(0xffffff, 0.9);
        this.specialOverlay.drawCircle(0, 0, halfSize * 0.18);
        this.specialOverlay.endFill();
        
        this.specialOverlay.lineStyle(2, 0xffffff, 0.5);
        this.drawGemShape(this.specialOverlay, halfSize, GEM_SIZE - 4);
        break;
    }
  }

  public updatePosition(): void {
    const x = this.gem.col * GEM_SIZE + GEM_SIZE / 2;
    const y = this.gem.row * GEM_SIZE + GEM_SIZE / 2;
    this.sprite.x = x;
    this.sprite.y = y;
  }

  public setSelected(selected: boolean): void {
    if (selected) {
      this.sprite.scale.set(1.15);
      this.sprite.alpha = 1;
    } else {
      this.sprite.scale.set(1);
    }
  }

  public async animateTo(targetX: number, targetY: number, duration: number = 200): Promise<void> {
    this.isAnimating = true;
    
    const startX = this.sprite.x;
    const startY = this.sprite.y;
    const startTime = Date.now();

    return new Promise((resolve) => {
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        this.sprite.x = startX + (targetX - startX) * easeProgress;
        this.sprite.y = startY + (targetY - startY) * easeProgress;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.isAnimating = false;
          resolve();
        }
      };
      animate();
    });
  }

  public async animateRemove(duration: number = 300): Promise<void> {
    this.isAnimating = true;
    const startTime = Date.now();
    const startScale = this.sprite.scale.x;
    const startAlpha = this.sprite.alpha;

    return new Promise((resolve) => {
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const scale = startScale * (1 - progress);
        this.sprite.scale.set(scale);
        this.sprite.alpha = startAlpha * (1 - progress);
        this.sprite.rotation += 0.1;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.isAnimating = false;
          resolve();
        }
      };
      animate();
    });
  }

  public async animateFall(targetRow: number, duration: number = 300): Promise<void> {
    const targetY = targetRow * GEM_SIZE + GEM_SIZE / 2;
    await this.animateTo(this.sprite.x, targetY, duration);
    this.gem.row = targetRow;
  }

  public getIsAnimating(): boolean {
    return this.isAnimating;
  }

  public destroy(): void {
    this.sprite.destroy({ children: true });
  }

  public updateGem(gem: Gem): void {
    this.gem = gem;
    this.createGemShape();
    if (this.specialOverlay) {
      this.sprite.removeChild(this.specialOverlay);
    }
    this.createSpecialOverlay();
    if (this.specialOverlay) {
      this.sprite.addChild(this.specialOverlay);
    }
  }
}
