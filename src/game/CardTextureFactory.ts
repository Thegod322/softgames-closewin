import { Texture } from 'pixi.js';
import { Rank, Suit } from '../core/types.ts';

const RANK_LABELS: Record<Rank, string> = {
  0: 'A',
  1: '2',
  2: '3',
  3: '4',
  4: '5',
  5: '6',
  6: '7',
  7: '8',
  8: '9',
  9: '10',
  10: 'J',
  11: 'Q',
  12: 'K',
};

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const SUIT_COLORS: Record<Suit, string> = {
  spades: '#1e232a',
  hearts: '#d32f2f',
  diamonds: '#e64a19',
  clubs: '#1e232a',
};

export class CardTextureFactory {
  private static instance: CardTextureFactory;
  private textureCache: Map<string, Texture> = new Map();
  private scale: number = 2; // High-DPI canvas generation scale
  public width: number = 80;
  public height: number = 112;

  private constructor() {}

  public static getInstance(): CardTextureFactory {
    if (!CardTextureFactory.instance) {
      CardTextureFactory.instance = new CardTextureFactory();
    }
    return CardTextureFactory.instance;
  }

  public getCardTexture(rank: Rank, suit: Suit): Texture {
    const key = `card_${suit}_${rank}`;
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    const w = this.width * this.scale;
    const h = this.height * this.scale;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return Texture.WHITE;

    const rankLabel = RANK_LABELS[rank];
    const suitSymbol = SUIT_SYMBOLS[suit];
    const color = SUIT_COLORS[suit];

    // Card Body (White rounded rect with subtle shadow and border)
    const radius = 8 * this.scale;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#b0bec5';
    ctx.lineWidth = 2 * this.scale;

    this.roundRect(ctx, 2, 2, w - 4, h - 4, radius);
    ctx.fill();
    ctx.stroke();

    // Top-left Corner Rank & Suit
    ctx.fillStyle = color;
    ctx.font = `bold ${16 * this.scale}px "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(rankLabel, 8 * this.scale, 6 * this.scale);

    ctx.font = `${14 * this.scale}px "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(suitSymbol, 8 * this.scale, 24 * this.scale);

    // Center Large Rank & Suit
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${34 * this.scale}px "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(rankLabel, w / 2, h / 2 - 4 * this.scale);

    ctx.font = `${20 * this.scale}px "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(suitSymbol, w / 2 + 18 * this.scale, h / 2 - 16 * this.scale);

    const texture = Texture.from(canvas);
    this.textureCache.set(key, texture);
    return texture;
  }

  public getCardBackTexture(): Texture {
    const key = 'card_back';
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    const w = this.width * this.scale;
    const h = this.height * this.scale;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return Texture.WHITE;

    const radius = 8 * this.scale;

    // Outer border
    ctx.fillStyle = '#ffffff';
    this.roundRect(ctx, 0, 0, w, h, radius);
    ctx.fill();

    // Inner Pattern Container (Royal Blue Gradient)
    const margin = 4 * this.scale;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#1976d2');
    grad.addColorStop(1, '#0d47a1');
    ctx.fillStyle = grad;

    this.roundRect(ctx, margin, margin, w - margin * 2, h - margin * 2, radius - 2 * this.scale);
    ctx.fill();

    // Geometric Diamond Pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5 * this.scale;
    const step = 12 * this.scale;

    for (let x = margin; x < w - margin; x += step) {
      for (let y = margin; y < h - margin; y += step) {
        ctx.beginPath();
        ctx.moveTo(x + step / 2, y);
        ctx.lineTo(x + step, y + step / 2);
        ctx.lineTo(x + step / 2, y + step);
        ctx.lineTo(x, y + step / 2);
        ctx.closePath();
        ctx.stroke();
      }
    }

    const texture = Texture.from(canvas);
    this.textureCache.set(key, texture);
    return texture;
  }

  public getLockOverlayTexture(): Texture {
    const key = 'lock_overlay';
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    const w = this.width * this.scale;
    const h = (this.height * 0.6) * this.scale;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return Texture.WHITE;

    // Wooden Plate
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#d7ccc8');
    grad.addColorStop(0.5, '#bcaaa4');
    grad.addColorStop(1, '#8d6e63');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2 * this.scale;

    this.roundRect(ctx, 4 * this.scale, 4 * this.scale, w - 8 * this.scale, h - 8 * this.scale, 6 * this.scale);
    ctx.fill();
    ctx.stroke();

    // Keyhole in Center
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2 - 4 * this.scale, 6 * this.scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w / 2 - 4 * this.scale, h / 2 - 2 * this.scale);
    ctx.lineTo(w / 2 + 4 * this.scale, h / 2 - 2 * this.scale);
    ctx.lineTo(w / 2 + 6 * this.scale, h / 2 + 10 * this.scale);
    ctx.lineTo(w / 2 - 6 * this.scale, h / 2 + 10 * this.scale);
    ctx.closePath();
    ctx.fill();

    // Golden Chains across plate
    ctx.strokeStyle = '#ffb300';
    ctx.lineWidth = 3 * this.scale;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w / 2 - 8 * this.scale, h / 2);
    ctx.moveTo(w, 0);
    ctx.lineTo(w / 2 + 8 * this.scale, h / 2);
    ctx.moveTo(0, h);
    ctx.lineTo(w / 2 - 8 * this.scale, h / 2);
    ctx.moveTo(w, h);
    ctx.lineTo(w / 2 + 8 * this.scale, h / 2);
    ctx.stroke();

    const texture = Texture.from(canvas);
    this.textureCache.set(key, texture);
    return texture;
  }

  public getBombBadgeTexture(timer: number): Texture {
    const key = `bomb_badge_${timer}`;
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    const size = 36 * this.scale;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return Texture.WHITE;

    const isUrgent = timer <= 2;

    // Bomb circular badge
    ctx.fillStyle = isUrgent ? '#d32f2f' : '#263238';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 * this.scale;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 3 * this.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bomb timer number
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${18 * this.scale}px "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${timer}`, size / 2, size / 2 + 1 * this.scale);

    const texture = Texture.from(canvas);
    this.textureCache.set(key, texture);
    return texture;
  }

  public getKeyTexture(): Texture {
    const key = 'key_badge';
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    const size = 40 * this.scale;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return Texture.WHITE;

    // Golden Key Icon
    ctx.fillStyle = '#ffc107';
    ctx.strokeStyle = '#ff8f00';
    ctx.lineWidth = 2 * this.scale;

    // Key Ring
    ctx.beginPath();
    ctx.arc(size / 2 - 6 * this.scale, size / 2 - 6 * this.scale, 8 * this.scale, 0, Math.PI * 2);
    ctx.stroke();

    // Key Shaft & Teeth
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2);
    ctx.lineTo(size - 6 * this.scale, size - 6 * this.scale);
    ctx.lineTo(size - 2 * this.scale, size - 10 * this.scale);
    ctx.stroke();

    const texture = Texture.from(canvas);
    this.textureCache.set(key, texture);
    return texture;
  }

  public getZapTexture(): Texture {
    const key = 'zap_badge';
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    const size = 40 * this.scale;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return Texture.WHITE;

    // Lightning Bolt
    ctx.fillStyle = '#ffd600';
    ctx.strokeStyle = '#ff6f00';
    ctx.lineWidth = 2 * this.scale;

    ctx.beginPath();
    ctx.moveTo(size * 0.55, size * 0.1);
    ctx.lineTo(size * 0.25, size * 0.55);
    ctx.lineTo(size * 0.5, size * 0.55);
    ctx.lineTo(size * 0.4, size * 0.9);
    ctx.lineTo(size * 0.75, size * 0.45);
    ctx.lineTo(size * 0.5, size * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const texture = Texture.from(canvas);
    this.textureCache.set(key, texture);
    return texture;
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
