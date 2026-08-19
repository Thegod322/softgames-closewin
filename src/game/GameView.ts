import { Application, Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
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
      this.restart();
    });
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

  public restart(): void {
    this.hideCardTooltip();
    if (!this.currentLevelJson) return;
    this.loadLevel(this.currentLevelJson, this.currentSeed, this.customDeckSize);
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
        ? this.factory.getCardTexture(card.rank, card.suit)
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

    // Wooden Lock Overlay
    if (card.isLocked) {
      const lockSprite = new Sprite(this.factory.getLockOverlayTexture());
      lockSprite.anchor.set(0.5);
      overlays.addChild(lockSprite);
    }

    // Key Badge
    if (card.type === 'key') {
      const keySprite = new Sprite(this.factory.getKeyTexture());
      keySprite.anchor.set(0.5);
      keySprite.position.set(0, 0);
      overlays.addChild(keySprite);
    }

    // Zap Badge
    if (card.type === 'zap') {
      const zapSprite = new Sprite(this.factory.getZapTexture());
      zapSprite.anchor.set(0.5);
      zapSprite.position.set(0, 0);
      overlays.addChild(zapSprite);
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
      back.position.set(-i * 4, 0);
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
    const badgeBg = new Graphics();
    badgeBg.circle(
      (this.factory.width * 0.32) * this.layout.scale,
      (this.factory.height * 0.32) * this.layout.scale,
      16 * this.layout.scale
    ).fill({ color: 0xffffff }).stroke({ color: 0x1e293b, width: 2 });
    this.deckContainer.addChild(badgeBg);

    const style = new TextStyle({
      fontFamily: 'Segoe UI, Roboto, sans-serif',
      fontSize: 16 * this.layout.scale,
      fontWeight: 'bold',
      fill: '#0f172a',
    });

    this.deckBadgeText = new Text({
      text: `${remaining}`,
      style,
    });
    this.deckBadgeText.anchor.set(0.5);
    this.deckBadgeText.position.set(
      (this.factory.width * 0.32) * this.layout.scale,
      (this.factory.height * 0.32) * this.layout.scale
    );
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
        AnimationFX.animateLockShake(item.container);
      }
      return;
    }

    if (!this.engine.canPlayCard(cardId)) {
      return;
    }

    this.isAnimating = true;
    const cardItem = this.cardSpriteMap.get(cardId);
    const result = this.engine.playCard(cardId);

    if (result.success && cardItem) {
      // 1. Animate card flight to Waste Pile
      AnimationFX.animateCardMatch(cardItem.container, this.layout.wastePos, () => {
        this.tableContainer.removeChild(cardItem.container);
        cardItem.container.destroy();
        this.cardSpriteMap.delete(cardId);

        // Update waste card face
        const active = this.engine.getActiveCard();
        if (active && this.wasteSprite) {
          this.wasteSprite.texture = this.factory.getCardTexture(active.rank, active.suit);
        }

        // 2. Animate newly uncovered cards (flip reveal)
        for (const uncId of result.uncoveredCardIds) {
          const uncItem = this.cardSpriteMap.get(uncId);
          const uncCard = this.engine.boardCards.get(uncId);
          if (uncItem && uncCard) {
            const faceTex = this.factory.getCardTexture(uncCard.rank, uncCard.suit);
            AnimationFX.animateCardFlip(uncItem.container, faceTex, uncItem.mainSprite);
          }
        }

        // 3. Update unlocked cards
        for (const unlId of result.unlockedCardIds) {
          const unlItem = this.cardSpriteMap.get(unlId);
          const unlCard = this.engine.boardCards.get(unlId);
          if (unlItem && unlCard) {
            this.updateCardOverlays(unlCard, unlItem.overlays);
          }
        }

        // 4. Update remaining bomb timers on board
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

      AnimationFX.animateCardDraw(tempCard, this.layout.deckPos, this.layout.wastePos, () => {
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
        <span class="card-tooltip-val">${card.faceUp ? `${card.rank} (${card.suit})` : 'Hidden'}</span>
      </div>
      <div class="card-tooltip-row">
        <span class="card-tooltip-key">Face State:</span>
        <span class="card-tooltip-val ${card.faceUp ? 'badge-yes' : 'badge-no'}">${card.faceUp ? 'Face Up' : 'Face Down'}</span>
      </div>
      <div class="card-tooltip-row">
        <span class="card-tooltip-key">Playable:</span>
        <span class="card-tooltip-val ${card.isPlayable ? 'badge-yes' : 'badge-no'}">${card.isPlayable ? 'Yes' : 'No'}</span>
      </div>
      ${card.isLocked ? `
      <div class="card-tooltip-row">
        <span class="card-tooltip-key">Lock State:</span>
        <span class="card-tooltip-val badge-no">🔒 Locked</span>
      </div>` : ''}
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
