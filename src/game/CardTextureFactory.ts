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
  public width: number = 100;
  public height: number = 140;

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
    const radius = 10 * this.scale;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.5 * this.scale;

    this.roundRect(ctx, 2, 2, w - 4, h - 4, radius);
    ctx.fill();
    ctx.stroke();

    // Top-left Corner Rank & Suit
    ctx.fillStyle = color;
    ctx.font = `bold ${18 * this.scale}px "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(rankLabel, 10 * this.scale, 8 * this.scale);

    ctx.font = `${16 * this.scale}px "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(suitSymbol, 10 * this.scale, 28 * this.scale);

    // Center Large Rank & Suit
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${40 * this.scale}px "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(rankLabel, w / 2, h / 2 - 4 * this.scale);

    ctx.font = `${24 * this.scale}px "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(suitSymbol, w / 2 + 22 * this.scale, h / 2 - 18 * this.scale);

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

  public getLockCardTexture(): Texture {
    const key = 'card_lock_full';
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

    const radius = 10 * this.scale;

    // Outer border
    ctx.fillStyle = '#3e2723';
    this.roundRect(ctx, 0, 0, w, h, radius);
    ctx.fill();

    // Wooden background
    const margin = 3 * this.scale;
    const woodGrad = ctx.createLinearGradient(0, 0, w, h);
    woodGrad.addColorStop(0, '#5d4037');
    woodGrad.addColorStop(0.5, '#4e342e');
    woodGrad.addColorStop(1, '#3e2723');
    ctx.fillStyle = woodGrad;
    this.roundRect(ctx, margin, margin, w - margin * 2, h - margin * 2, radius - 2 * this.scale);
    ctx.fill();

    // Wood grain horizontal planks
    ctx.strokeStyle = '#271c19';
    ctx.lineWidth = 1.5 * this.scale;
    for (let y = margin + 24 * this.scale; y < h - margin; y += 26 * this.scale) {
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(w - margin, y);
      ctx.stroke();
    }

    // Heavy Golden Chains (Crossed)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4 * this.scale;
    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(w - margin, h - margin);
    ctx.moveTo(w - margin, margin);
    ctx.lineTo(margin, h - margin);
    ctx.stroke();

    // Chain links highlight
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2 * this.scale;
    ctx.beginPath();
    ctx.moveTo(margin + 10, margin + 10);
    ctx.lineTo(w - margin - 10, h - margin - 10);
    ctx.moveTo(w - margin - 10, margin + 10);
    ctx.lineTo(margin + 10, h - margin - 10);
    ctx.stroke();

    // Central Padlock Body
    const lockSize = 38 * this.scale;
    const cx = w / 2;
    const cy = h / 2 + 4 * this.scale;

    // Padlock Shackle
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4 * this.scale;
    ctx.beginPath();
    ctx.arc(cx, cy - 14 * this.scale, 12 * this.scale, Math.PI, 0);
    ctx.stroke();

    // Padlock Body
    const lockGrad = ctx.createLinearGradient(cx - lockSize / 2, cy - lockSize / 2, cx + lockSize / 2, cy + lockSize / 2);
    lockGrad.addColorStop(0, '#f59e0b');
    lockGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = lockGrad;
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2 * this.scale;
    this.roundRect(ctx, cx - lockSize / 2, cy - lockSize / 2 + 4 * this.scale, lockSize, lockSize * 0.85, 6 * this.scale);
    ctx.fill();
    ctx.stroke();

    // Keyhole
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(cx, cy + 2 * this.scale, 4 * this.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 2.5 * this.scale, cy + 3 * this.scale);
    ctx.lineTo(cx + 2.5 * this.scale, cy + 3 * this.scale);
    ctx.lineTo(cx + 4 * this.scale, cy + 12 * this.scale);
    ctx.lineTo(cx - 4 * this.scale, cy + 12 * this.scale);
    ctx.closePath();
    ctx.fill();

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
    const h = this.height * this.scale;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return Texture.WHITE;

    const radius = 10 * this.scale;

    // Semi-transparent dark tint over card face
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    this.roundRect(ctx, 2, 2, w - 4, h - 4, radius);
    ctx.fill();

    // Heavy Golden Chains (Crossed)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3.5 * this.scale;
    ctx.beginPath();
    ctx.moveTo(4 * this.scale, 4 * this.scale);
    ctx.lineTo(w - 4 * this.scale, h - 4 * this.scale);
    ctx.moveTo(w - 4 * this.scale, 4 * this.scale);
    ctx.lineTo(4 * this.scale, h - 4 * this.scale);
    ctx.stroke();

    // Chain links highlight
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.8 * this.scale;
    ctx.beginPath();
    ctx.moveTo(12 * this.scale, 12 * this.scale);
    ctx.lineTo(w - 12 * this.scale, h - 12 * this.scale);
    ctx.moveTo(w - 12 * this.scale, 12 * this.scale);
    ctx.lineTo(12 * this.scale, h - 12 * this.scale);
    ctx.stroke();

    // Central Padlock Body
    const lockSize = 34 * this.scale;
    const cx = w / 2;
    const cy = h / 2;

    // Padlock Shackle
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3.5 * this.scale;
    ctx.beginPath();
    ctx.arc(cx, cy - 12 * this.scale, 10 * this.scale, Math.PI, 0);
    ctx.stroke();

    // Padlock Body
    const lockGrad = ctx.createLinearGradient(cx - lockSize / 2, cy - lockSize / 2, cx + lockSize / 2, cy + lockSize / 2);
    lockGrad.addColorStop(0, '#fbbf24');
    lockGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = lockGrad;
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2 * this.scale;
    this.roundRect(ctx, cx - lockSize / 2, cy - lockSize / 2 + 2 * this.scale, lockSize, lockSize * 0.85, 5 * this.scale);
    ctx.fill();
    ctx.stroke();

    // Keyhole
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(cx, cy + 1 * this.scale, 3.5 * this.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 2 * this.scale, cy + 2 * this.scale);
    ctx.lineTo(cx + 2 * this.scale, cy + 2 * this.scale);
    ctx.lineTo(cx + 3.5 * this.scale, cy + 10 * this.scale);
    ctx.lineTo(cx - 3.5 * this.scale, cy + 10 * this.scale);
    ctx.closePath();
    ctx.fill();

    const texture = Texture.from(canvas);
    this.textureCache.set(key, texture);
    return texture;
  }

  public getKeyCardTexture(): Texture {
    const key = 'card_key_full';
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

    const radius = 10 * this.scale;

    // Gold Outer Border
    ctx.fillStyle = '#f59e0b';
    this.roundRect(ctx, 0, 0, w, h, radius);
    ctx.fill();

    // Mystic Indigo Velvet Background
    const margin = 3 * this.scale;
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#1e1b4b');
    bgGrad.addColorStop(0.5, '#312e81');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    this.roundRect(ctx, margin, margin, w - margin * 2, h - margin * 2, radius - 2 * this.scale);
    ctx.fill();

    // Inner glowing ring
    const cx = w / 2;
    const cy = h / 2;

    const glowGrad = ctx.createRadialGradient(cx, cy, 5 * this.scale, cx, cy, 40 * this.scale);
    glowGrad.addColorStop(0, 'rgba(251, 191, 36, 0.35)');
    glowGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 42 * this.scale, 0, Math.PI * 2);
    ctx.fill();

    // Large Ornate Golden Key
    ctx.strokeStyle = '#fbbf24';
    ctx.fillStyle = '#f59e0b';
    ctx.lineWidth = 3.5 * this.scale;

    // Key Bow (Ring) at top
    const ringY = cy - 24 * this.scale;
    ctx.beginPath();
    ctx.arc(cx, ringY, 13 * this.scale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, ringY, 7 * this.scale, 0, Math.PI * 2);
    ctx.fillStyle = '#1e1b4b';
    ctx.fill();
    ctx.stroke();

    // Key Stem
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4.5 * this.scale;
    ctx.beginPath();
    ctx.moveTo(cx, ringY + 13 * this.scale);
    ctx.lineTo(cx, cy + 32 * this.scale);
    ctx.stroke();

    // Key Bit / Teeth
    ctx.lineWidth = 4 * this.scale;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 18 * this.scale);
    ctx.lineTo(cx + 12 * this.scale, cy + 18 * this.scale);
    ctx.moveTo(cx, cy + 28 * this.scale);
    ctx.lineTo(cx + 14 * this.scale, cy + 28 * this.scale);
    ctx.stroke();

    // Top & bottom label
    ctx.fillStyle = '#fbbf24';
    ctx.font = `bold ${10 * this.scale}px "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('KEY', cx, h - 10 * this.scale);

    const texture = Texture.from(canvas);
    this.textureCache.set(key, texture);
    return texture;
  }

  public getZapCardTexture(): Texture {
    const key = 'card_zap_full';
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

    const radius = 10 * this.scale;

    // Yellow Outer Border
    ctx.fillStyle = '#eab308';
    this.roundRect(ctx, 0, 0, w, h, radius);
    ctx.fill();

    // Dark Electric Plasma Background
    const margin = 3 * this.scale;
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0c4a6e');
    bgGrad.addColorStop(0.5, '#075985');
    bgGrad.addColorStop(1, '#082f49');
    ctx.fillStyle = bgGrad;
    this.roundRect(ctx, margin, margin, w - margin * 2, h - margin * 2, radius - 2 * this.scale);
    ctx.fill();

    const cx = w / 2;
    const cy = h / 2;

    // Glowing Radial Burst
    const glowGrad = ctx.createRadialGradient(cx, cy, 6 * this.scale, cx, cy, 45 * this.scale);
    glowGrad.addColorStop(0, 'rgba(253, 224, 71, 0.4)');
    glowGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 45 * this.scale, 0, Math.PI * 2);
    ctx.fill();

    // Lightning Bolt
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2.5 * this.scale;

    ctx.beginPath();
    ctx.moveTo(cx + 8 * this.scale, cy - 35 * this.scale);
    ctx.lineTo(cx - 16 * this.scale, cy + 2 * this.scale);
    ctx.lineTo(cx - 2 * this.scale, cy + 2 * this.scale);
    ctx.lineTo(cx - 10 * this.scale, cy + 35 * this.scale);
    ctx.lineTo(cx + 18 * this.scale, cy - 8 * this.scale);
    ctx.lineTo(cx + 4 * this.scale, cy - 8 * this.scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.font = `bold ${10 * this.scale}px "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ZAP', cx, h - 10 * this.scale);

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
