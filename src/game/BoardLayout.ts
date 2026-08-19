import { CARD_HEIGHT, CARD_WIDTH } from '../core/CardGraph.ts';
import { CardState } from '../core/types.ts';

export interface LayoutBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

export class BoardLayout {
  public canvasWidth: number = 960;
  public canvasHeight: number = 640;
  public scale: number = 1;
  public boardOffsetX: number = 0;
  public boardOffsetY: number = 0;

  // Bottom Gameplay Zone coordinates
  public deckPos = { x: 100, y: 540 };
  public wastePos = { x: 230, y: 540 };

  public updateDimensions(width: number, height: number, cards: CardState[]): void {
    this.canvasWidth = width;
    this.canvasHeight = height;

    if (cards.length === 0) return;

    // Calculate level bounding box
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const c of cards) {
      minX = Math.min(minX, c.x - CARD_WIDTH / 2);
      maxX = Math.max(maxX, c.x + CARD_WIDTH / 2);
      minY = Math.min(minY, c.y - CARD_HEIGHT / 2);
      maxY = Math.max(maxY, c.y + CARD_HEIGHT / 2);
    }

    const boardW = maxX - minX;
    const boardH = maxY - minY;

    // Target playable board area: top 70% of canvas, with 40px margins
    const targetAreaW = width - 80;
    const targetAreaH = height * 0.68 - 40;

    const scaleX = targetAreaW / (boardW || 1);
    const scaleY = targetAreaH / (boardH || 1);
    this.scale = Math.min(1.0, Math.min(scaleX, scaleY));

    // Center board area horizontally and in top section
    const scaledBoardW = boardW * this.scale;
    const scaledBoardH = boardH * this.scale;

    this.boardOffsetX = (width - scaledBoardW) / 2 - minX * this.scale;
    this.boardOffsetY = (height * 0.68 - scaledBoardH) / 2 - minY * this.scale + 20;

    // Place Deck & Waste pile in bottom area
    const bottomY = height - (CARD_HEIGHT * this.scale) / 2 - 24;
    this.deckPos = {
      x: width * 0.35,
      y: bottomY,
    };
    this.wastePos = {
      x: width * 0.55,
      y: bottomY,
    };
  }

  public mapBoardToScreen(x: number, y: number): { screenX: number; screenY: number } {
    return {
      screenX: x * this.scale + this.boardOffsetX,
      screenY: y * this.scale + this.boardOffsetY,
    };
  }
}
