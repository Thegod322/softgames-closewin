import { Application, Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { CardState, LevelJSON } from '../core/types.ts';
import { loadLevel } from '../core/CardGraph.ts';
import { TripeaksEngine } from '../core/TripeaksEngine.ts';
import { CardTextureFactory } from './CardTextureFactory.ts';
import { BoardLayout } from './BoardLayout.ts';
import { AnimationFX } from './AnimationFX.ts';

export class GameView {
  private app!: Application;
  private container!: HTMLElement;
  private engine!: TripeaksEngine;
  private currentLevelJson!: LevelJSON;
  private currentSeed: number = 42;
  private customDeckSize?: number;

  private layout: BoardLayout = new BoardLayout();
  private factory: CardTextureFactory = CardTextureFactory.getInstance();

  private tableContainer: Container = new Container();
  private deckContainer: Container = new Container();
  private wasteContainer: Container = new Container();
  private fxContainer: Container = new Container();

  private cardSpriteMap: Map<string, { container: Container; mainSprite: Sprite; overlays: Container }> = new Map();
  private wasteSprite: Sprite | null = null;
  private deckBadgeText!: Text;
  private isAnimating: boolean = false;

  private overlayElement!: HTMLElement;
  private tooltipElement!: HTMLElement;

  public async init(container: HTMLElement): Promise<void> {
    this.container = container;
    this.app = new Application();

    await this.app.init({
      resizeTo: container,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.appendChild(this.app.canvas);

    this.app.stage.addChild(this.tableContainer);
    this.app.stage.addChild(this.deckContainer);
    this.app.stage.addChild(this.wasteContainer);
    this.app.stage.addChild(this.fxContainer);

    this.createOverlay();
    this.createTooltip();

    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  private createTooltip(): void {
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'card-tooltip';
    this.container.appendChild(this.tooltipElement);
  }

  public onRestartRequested?: () => void;

  private createOverlay(): void {
    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'game-overlay';
    this.overlayElement.innerHTML = `
      <h2 id="overlay-title">Level Cleared!</h2>
      <p id="overlay-subtitle">Remaining Cards: 0</p>
      <button id="overlay-restart-btn" class="btn btn-warning">↺ Play Again</button>
    `;
    this.container.appendChild(this.overlayElement);

    const restartBtn = this.overlayElement.querySelector('#overlay-restart-btn');
    restartBtn?.addEventListener('click', () => {
      if (this.onRestartRequested) {
        this.onRestartRequested();
      } else {
        this.restart();
      }
    });
  }

  public getCurrentSeed(): number {
    return this.currentSeed;
  }

  public getCustomDeckSize(): number | undefined {
    return this.customDeckSize;
  }

  public loadLevel(levelJson: LevelJSON, seed: number = 42, customDeckSize?: number): void {
    this.currentLevelJson = levelJson;
    this.currentSeed = seed;
    this.customDeckSize = customDeckSize;

    const initial = loadLevel(levelJson, seed, customDeckSize);
    this.engine = new TripeaksEngine(initial);

    this.hideOverlay();
    this.buildScene();
  }

  public restart(keepSeed: boolean = false): void {
    this.hideCardTooltip();
    if (!this.currentLevelJson) return;
    const seed = keepSeed ? this.currentSeed : Math.floor(Math.random() * 1000000) + 1;
    this.loadLevel(this.currentLevelJson, seed, this.customDeckSize);
  }

  public undo(): void {
    this.hideCardTooltip();
    if (this.isAnimating || !this.engine) return;
    if (this.engine.undo()) {
      this.hideOverlay();
      this.buildScene();
    }
  }

  private handleResize(): void {
    if (!this.engine || !this.currentLevelJson) return;
    const cards = Array.from(this.engine.boardCards.values());
    this.layout.updateDimensions(this.app.screen.width, this.app.screen.height, cards);
    this.updateCardPositions();
  }

  private getCardFaceTexture(card: CardState): Texture {
    if (card.type === 'key') {
      return this.factory.getKeyCardTexture();
    }
    if (card.type === 'zap') {
      return this.factory.getZapCardTexture();
    }
    return this.factory.getCardTexture(card.rank, card.suit);
  }

  private buildScene(): void {
    this.tableContainer.removeChildren();
    this.deckContainer.removeChildren();
    this.wasteContainer.removeChildren();
    this.cardSpriteMap.clear();

    const cards = Array.from(this.engine.boardCards.values());
    this.layout.updateDimensions(this.app.screen.width, this.app.screen.height, cards);

    // 1. Build Board Cards
    // Sort by depth ascending so higher depth sits on top visually
    const sortedCards = [...cards].sort((a, b) => a.depth - b.depth);

    for (const card of sortedCards) {
      const cardWrap = new Container();
      const pos = this.layout.mapBoardToScreen(card.x, card.y);
      cardWrap.position.set(pos.screenX, pos.screenY);
      cardWrap.rotation = (card.angle || 0) * (Math.PI / 180);
      cardWrap.scale.set(this.layout.scale);

      const mainTexture = card.faceUp
        ? this.getCardFaceTexture(card)
        : this.factory.getCardBackTexture();

      const mainSprite = new Sprite(mainTexture);
      mainSprite.anchor.set(0.5);
      cardWrap.addChild(mainSprite);

      // Overlays container
      const overlays = new Container();
      cardWrap.addChild(overlays);
      this.updateCardOverlays(card, overlays);

      // Interaction
      cardWrap.eventMode = 'static';
      cardWrap.cursor = 'pointer';
      cardWrap.on('pointerdown', () => {
        this.onCardClicked(card.id);
      });
      cardWrap.on('pointerenter', (e) => {
        this.showCardTooltip(card.id, e.global.x, e.global.y);
      });
      cardWrap.on('pointermove', (e) => {
        this.updateCardTooltipPosition(e.global.x, e.global.y);
      });
      cardWrap.on('pointerleave', () => {
        this.hideCardTooltip();
      });

      this.tableContainer.addChild(cardWrap);
      this.cardSpriteMap.set(card.id, { container: cardWrap, mainSprite, overlays });
    }

    // 2. Build Deck / Draw Pile
    this.buildDeckStack();

    // 3. Build Active Waste Card
    this.buildWasteCard();
  }

  private updateCardOverlays(card: CardState, overlays: Container): void {
    overlays.removeChildren();

    // Lock Overlay (Chains & Padlock over the face card)
    if (card.isLocked && card.faceUp) {
      const lockOverlay = new Sprite(this.factory.getLockOverlayTexture());
      lockOverlay.anchor.set(0.5);
      lockOverlay.label = 'lock_overlay';
      overlays.addChild(lockOverlay);
    }

    // Bomb Countdown Badge
    if (card.bombTimer !== undefined) {
      const bombSprite = new Sprite(this.factory.getBombBadgeTexture(card.bombTimer));
      bombSprite.anchor.set(0.5);
      bombSprite.position.set(this.factory.width * 0.28, -this.factory.height * 0.35);
      overlays.addChild(bombSprite);
    }
  }

  private buildDeckStack(): void {
    this.deckContainer.removeChildren();
    const remaining = this.engine.drawPile.length;
    if (remaining === 0) return;

    this.deckContainer.position.set(this.layout.deckPos.x, this.layout.deckPos.y);

    // Fan out up to 5 cards visually to look like a real physical stack
    const visualCards = Math.min(5, remaining);
    for (let i = 0; i < visualCards; i++) {
      const back = new Sprite(this.factory.getCardBackTexture());
      back.anchor.set(0.5);
      back.position.set(-i * 4 * this.layout.scale, 0);
      back.scale.set(this.layout.scale);
      this.deckContainer.addChild(back);
    }

    // Interactive top card
    const topCard = new Sprite(this.factory.getCardBackTexture());
    topCard.anchor.set(0.5);
    topCard.scale.set(this.layout.scale);
    topCard.eventMode = 'static';
    topCard.cursor = 'pointer';
    topCard.on('pointerdown', () => {
      this.onDrawClicked();
    });
    this.deckContainer.addChild(topCard);

    // Large white badge in bottom-right corner showing remaining count
    const badgeRadius = Math.max(13, 16 * this.layout.scale);
    const badgeX = (this.factory.width * 0.32) * this.layout.scale;
    const badgeY = (this.factory.height * 0.32) * this.layout.scale;

    const badgeBg = new Graphics();
    badgeBg.circle(badgeX, badgeY, badgeRadius)
      .fill({ color: 0xffffff })
      .stroke({ color: 0x1e293b, width: 2 });
    this.deckContainer.addChild(badgeBg);

    const style = new TextStyle({
      fontFamily: 'Segoe UI, Roboto, sans-serif',
      fontSize: Math.max(12, 15 * this.layout.scale),
      fontWeight: 'bold',
      fill: '#0f172a',
    });

    this.deckBadgeText = new Text({
      text: `${remaining}`,
      style,
    });
    this.deckBadgeText.anchor.set(0.5);
    this.deckBadgeText.position.set(badgeX, badgeY);
    this.deckContainer.addChild(this.deckBadgeText);
  }

  private buildWasteCard(): void {
    this.wasteContainer.removeChildren();
    const active = this.engine.getActiveCard();
    if (!active) return;

    this.wasteContainer.position.set(this.layout.wastePos.x, this.layout.wastePos.y);

    const texture = this.factory.getCardTexture(active.rank, active.suit);
    this.wasteSprite = new Sprite(texture);
    this.wasteSprite.anchor.set(0.5);
    this.wasteSprite.scale.set(this.layout.scale);
    this.wasteContainer.addChild(this.wasteSprite);
  }

  private updateCardPositions(): void {
    for (const [id, item] of this.cardSpriteMap.entries()) {
      const card = this.engine.boardCards.get(id);
      if (card) {
        const pos = this.layout.mapBoardToScreen(card.x, card.y);
        item.container.position.set(pos.screenX, pos.screenY);
        item.container.scale.set(this.layout.scale);
      }
    }
    this.deckContainer.position.set(this.layout.deckPos.x, this.layout.deckPos.y);
    this.wasteContainer.position.set(this.layout.wastePos.x, this.layout.wastePos.y);
  }

  private onCardClicked(cardId: string): void {
    this.hideCardTooltip();
    if (this.isAnimating || this.engine.status !== 'playing') return;

    const card = this.engine.boardCards.get(cardId);
    if (!card) return;

    if (card.isLocked) {
      const item = this.cardSpriteMap.get(cardId);
      if (item) {
        AnimationFX.animateLockShake(item.container, this.layout.scale);
      }
      return;
    }

    if (!this.engine.canPlayCard(cardId)) {
      return;
    }

    this.isAnimating = true;
    const cardItem = this.cardSpriteMap.get(cardId);
    const cardType = card.type;
    const result = this.engine.playCard(cardId);

    if (result.success && cardItem) {
      if (cardType === 'key') {
        // 1. Key Card Collected: floats up & dissolves (NOT added to waste)
        AnimationFX.animateKeyCollect(cardItem.container, this.layout.scale, () => {
          this.tableContainer.removeChild(cardItem.container);
          cardItem.container.destroy();
          this.cardSpriteMap.delete(cardId);
        });

        // 2. All Lock Cards on board unlock (lock overlay pops & dissolves, card stays on board!)
        for (const lockId of result.unlockedCardIds) {
          const lockItem = this.cardSpriteMap.get(lockId);
          if (lockItem) {
            const overlay = lockItem.overlays.getChildByLabel('lock_overlay');
            if (overlay) {
              AnimationFX.animateLockUnlock(overlay, this.layout.scale, () => {
                lockItem.overlays.removeChild(overlay);
                overlay.destroy();
              });
            }
          }
        }

        // 3. Uncover newly revealed cards & update bomb overlays
        setTimeout(() => {
          for (const uncId of result.uncoveredCardIds) {
            const uncItem = this.cardSpriteMap.get(uncId);
            const uncCard = this.engine.boardCards.get(uncId);
            if (uncItem && uncCard) {
              const faceTex = this.getCardFaceTexture(uncCard);
              AnimationFX.animateCardFlip(uncItem.container, faceTex, uncItem.mainSprite, this.layout.scale);
              this.updateCardOverlays(uncCard, uncItem.overlays);
            }
          }

          // 4. Update bomb overlays
          for (const [id, item] of this.cardSpriteMap.entries()) {
            const c = this.engine.boardCards.get(id);
            if (c) {
              this.updateCardOverlays(c, item.overlays);
            }
          }

          this.isAnimating = false;
          this.checkGameEnd();
        }, 150);
      } else if (cardType === 'zap') {
        // Zap effect across row
        AnimationFX.animateZapRow(this.fxContainer, cardItem.container.y, this.app.screen.width);
        this.tableContainer.removeChild(cardItem.container);
        cardItem.container.destroy();
        this.cardSpriteMap.delete(cardId);

        for (const clearedId of result.clearedCardIds) {
          const item = this.cardSpriteMap.get(clearedId);
          if (item) {
            AnimationFX.animateLockUnlock(item.container, this.layout.scale, () => {
              this.tableContainer.removeChild(item.container);
              item.container.destroy();
              this.cardSpriteMap.delete(clearedId);
            });
          }
        }

        setTimeout(() => {
          for (const uncId of result.uncoveredCardIds) {
            const uncItem = this.cardSpriteMap.get(uncId);
            const uncCard = this.engine.boardCards.get(uncId);
            if (uncItem && uncCard) {
              const faceTex = this.getCardFaceTexture(uncCard);
              AnimationFX.animateCardFlip(uncItem.container, faceTex, uncItem.mainSprite, this.layout.scale);
            }
          }
          this.isAnimating = false;
          this.checkGameEnd();
        }, 150);
      } else {
        // Standard Card matched to waste
        AnimationFX.animateCardMatch(cardItem.container, this.layout.wastePos, this.layout.scale, () => {
          this.tableContainer.removeChild(cardItem.container);
          cardItem.container.destroy();
          this.cardSpriteMap.delete(cardId);

          // Update waste card face
          const active = this.engine.getActiveCard();
          if (active && this.wasteSprite) {
            this.wasteSprite.texture = this.factory.getCardTexture(active.rank, active.suit);
          }

          // Animate newly uncovered cards (flip reveal)
          for (const uncId of result.uncoveredCardIds) {
            const uncItem = this.cardSpriteMap.get(uncId);
            const uncCard = this.engine.boardCards.get(uncId);
            if (uncItem && uncCard) {
              const faceTex = this.getCardFaceTexture(uncCard);
              AnimationFX.animateCardFlip(uncItem.container, faceTex, uncItem.mainSprite, this.layout.scale);
            }
          }

          // Update remaining bomb timers on board
          for (const [id, item] of this.cardSpriteMap.entries()) {
            const c = this.engine.boardCards.get(id);
            if (c) {
              this.updateCardOverlays(c, item.overlays);
            }
          }

          this.isAnimating = false;
          this.checkGameEnd();
        });
      }
    } else {
      this.isAnimating = false;
    }
  }

  private onDrawClicked(): void {
    this.hideCardTooltip();
    if (this.isAnimating || this.engine.status !== 'playing') return;
    if (this.engine.drawPile.length === 0) return;

    this.isAnimating = true;
    const result = this.engine.drawCard();

    if (result.success) {
      // Spawn temporary flying card
      const tempCard = new Sprite(this.factory.getCardBackTexture());
      tempCard.anchor.set(0.5);
      tempCard.scale.set(this.layout.scale);
      this.fxContainer.addChild(tempCard);

      AnimationFX.animateCardDraw(tempCard, this.layout.deckPos, this.layout.wastePos, this.layout.scale, () => {
        this.fxContainer.removeChild(tempCard);
        tempCard.destroy();

        // Update waste card face
        const active = this.engine.getActiveCard();
        if (active && this.wasteSprite) {
          this.wasteSprite.texture = this.factory.getCardTexture(active.rank, active.suit);
        }

        // Update deck count badge
        if (this.deckBadgeText) {
          this.deckBadgeText.text = `${this.engine.drawPile.length}`;
        }
        if (this.engine.drawPile.length === 0) {
          this.deckContainer.removeChildren();
        }

        // Update bomb timers on board
        for (const [id, item] of this.cardSpriteMap.entries()) {
          const c = this.engine.boardCards.get(id);
          if (c) {
            this.updateCardOverlays(c, item.overlays);
          }
        }

        this.isAnimating = false;
        this.checkGameEnd();
      });
    } else {
      this.isAnimating = false;
    }
  }

  private checkGameEnd(): void {
    if (this.engine.status === 'won') {
      this.showOverlay(
        '🏆 Level Cleared!',
        `Cards Remaining in Deck: ${this.engine.drawPile.length}`,
        'win'
      );
    } else if (this.engine.status === 'lost') {
      const reason =
        this.engine.lossReason === 'bomb_exploded'
          ? '💣 Bomb Exploded!'
          : '💀 No More Moves Left!';
      this.showOverlay(reason, 'Try again with a different sequence!', 'loss');
    }
  }

  private showOverlay(title: string, subtitle: string, type: 'win' | 'loss'): void {
    const titleEl = this.overlayElement.querySelector('#overlay-title') as HTMLElement;
    const subEl = this.overlayElement.querySelector('#overlay-subtitle') as HTMLElement;

    if (titleEl) titleEl.innerText = title;
    if (subEl) subEl.innerText = subtitle;

    this.overlayElement.className = `game-overlay active ${type}`;
  }

  private hideOverlay(): void {
    this.overlayElement.className = 'game-overlay';
  }

  private showCardTooltip(cardId: string, globalX: number, globalY: number): void {
    if (!this.currentLevelJson || !this.engine) return;
    const card = this.engine.boardCards.get(cardId);
    const raw = this.currentLevelJson.cards.find((c) => c.id === cardId);
    if (!card || !raw) return;

    const coveredBy = Array.from(this.engine.cardGraph.coveredByMap.get(cardId) || []);
    const covers = Array.from(this.engine.cardGraph.coversMap.get(cardId) || []);
    const bombMod = card.modifiers.find((m) => m.type === 'bomb');

    this.tooltipElement.innerHTML = `
      <div class="card-tooltip-header">
        <span>📇 ${card.id}</span>
        <span style="text-transform: uppercase; color: var(--accent-blue);">${raw.type}</span>
      </div>
      <div class="card-tooltip-row">
        <span class="card-tooltip-key">JSON Pos (x, y):</span>
        <span class="card-tooltip-val highlight">(${raw.x}, ${raw.y})</span>
      </div>
      <div class="card-tooltip-row">
        <span class="card-tooltip-key">Depth (Layer):</span>
        <span class="card-tooltip-val highlight">${raw.depth}</span>
      </div>
      <div class="card-tooltip-row">
        <span class="card-tooltip-key">Angle:</span>
        <span class="card-tooltip-val">${raw.angle}°</span>
      </div>
      <div class="card-tooltip-row">
        <span class="card-tooltip-key">Sequence:</span>
        <span class="card-tooltip-val">${raw.sequence}</span>
      </div>
      <div class="card-tooltip-row">
        <span class="card-tooltip-key">Card Value:</span>
        <span class="card-tooltip-val">${
          !card.faceUp
            ? 'Hidden'
            : card.type === 'lock'
            ? '🔒 Lock (Obstacle)'
            : card.type === 'key'
            ? '🔑 Key (Unlocks all locks)'
            : card.type === 'zap'
            ? '⚡ Zap (Clears row)'
            : `${card.rank} (${card.suit})`
        }</span>
      </div>
      <div class="card-tooltip-row">
        <span class="card-tooltip-key">Face State:</span>
        <span class="card-tooltip-val ${card.faceUp ? 'badge-yes' : 'badge-no'}">${card.faceUp ? 'Face Up' : 'Face Down'}</span>
      </div>
      <div class="card-tooltip-row">
        <span class="card-tooltip-key">Playable:</span>
        <span class="card-tooltip-val ${card.isPlayable ? 'badge-yes' : 'badge-no'}">${card.isPlayable ? 'Yes' : 'No'}</span>
      </div>
      ${bombMod ? `
      <div class="card-tooltip-row">
        <span class="card-tooltip-key">Bomb Timer:</span>
        <span class="card-tooltip-val badge-no">💣 ${card.bombTimer ?? bombMod.properties.timer} moves</span>
      </div>` : ''}
      <div class="card-tooltip-row" style="margin-top: 4px; border-top: 1px dashed var(--border-subtle); padding-top: 4px;">
        <span class="card-tooltip-key">Covered By:</span>
        <span class="card-tooltip-val">${coveredBy.length > 0 ? coveredBy.join(', ') : 'None (Top)'}</span>
      </div>
      <div class="card-tooltip-row">
        <span class="card-tooltip-key">Covers:</span>
        <span class="card-tooltip-val">${covers.length > 0 ? covers.join(', ') : 'None'}</span>
      </div>
    `;

    this.updateCardTooltipPosition(globalX, globalY);
    this.tooltipElement.classList.add('active');
  }

  private updateCardTooltipPosition(globalX: number, globalY: number): void {
    if (!this.tooltipElement) return;
    const rect = this.container.getBoundingClientRect();
    let left = globalX + 16;
    let top = globalY + 16;

    if (left + 270 > rect.width) {
      left = globalX - 275;
    }
    if (top + 240 > rect.height) {
      top = globalY - 245;
    }

    this.tooltipElement.style.left = `${Math.max(10, left)}px`;
    this.tooltipElement.style.top = `${Math.max(10, top)}px`;
  }

  private hideCardTooltip(): void {
    if (this.tooltipElement) {
      this.tooltipElement.classList.remove('active');
    }
  }
}
