import gsap from 'gsap';
import { Container, Graphics, Sprite, Texture } from 'pixi.js';

export class AnimationFX {
  public static animateCardDraw(
    cardSprite: Container,
    from: { x: number; y: number },
    to: { x: number; y: number },
    scale: number,
    onComplete?: () => void
  ): void {
    cardSprite.position.set(from.x, from.y);
    cardSprite.scale.set(scale * 0.9);
    cardSprite.rotation = (Math.random() - 0.5) * 0.15;

    gsap.to(cardSprite, {
      x: to.x,
      y: to.y,
      rotation: 0,
      duration: 0.22,
      ease: 'power2.out',
      onComplete,
    });

    gsap.to(cardSprite.scale, {
      x: scale,
      y: scale,
      duration: 0.22,
      ease: 'back.out(1.2)',
    });
  }

  public static animateCardMatch(
    cardSprite: Container,
    to: { x: number; y: number },
    scale: number,
    onComplete?: () => void
  ): void {
    gsap.to(cardSprite, {
      x: to.x,
      y: to.y,
      rotation: (Math.random() - 0.5) * 0.1,
      duration: 0.2,
      ease: 'power2.inOut',
      onComplete,
    });

    gsap.to(cardSprite.scale, {
      x: scale * 1.06,
      y: scale * 1.06,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: 'power1.inOut',
    });
  }

  public static animateCardFlip(
    cardSprite: Container,
    faceTexture: Texture,
    cardMainSprite: Sprite,
    scale: number,
    onComplete?: () => void
  ): void {
    gsap.to(cardSprite.scale, {
      x: 0,
      duration: 0.1,
      ease: 'power1.in',
      onComplete: () => {
        cardMainSprite.texture = faceTexture;
        gsap.to(cardSprite.scale, {
          x: scale,
          duration: 0.12,
          ease: 'power1.out',
          onComplete,
        });
      },
    });
  }

  public static animateKeyCollect(
    cardSprite: Container,
    scale: number,
    onComplete?: () => void
  ): void {
    gsap.to(cardSprite, {
      y: cardSprite.y - 35 * scale,
      alpha: 0,
      duration: 0.3,
      ease: 'power2.out',
      onComplete,
    });

    gsap.to(cardSprite.scale, {
      x: scale * 1.25,
      y: scale * 1.25,
      duration: 0.3,
      ease: 'power2.out',
    });
  }

  public static animateLockUnlock(
    cardSprite: Container,
    scale: number,
    onComplete?: () => void
  ): void {
    gsap.to(cardSprite, {
      alpha: 0,
      duration: 0.28,
      ease: 'power2.in',
      onComplete,
    });

    gsap.to(cardSprite.scale, {
      x: scale * 0.5,
      y: scale * 0.5,
      duration: 0.28,
      ease: 'power2.in',
    });
  }

  public static animateLockShake(cardSprite: Container, scale: number = 1): void {
    const origX = cardSprite.x;
    gsap.to(cardSprite, {
      x: origX + 5 * scale,
      duration: 0.04,
      yoyo: true,
      repeat: 3,
      ease: 'power1.inOut',
      onComplete: () => {
        cardSprite.x = origX;
      },
    });
  }

  public static animateZapRow(
    stage: Container,
    y: number,
    width: number,
    onComplete?: () => void
  ): void {
    const beam = new Graphics();
    beam.rect(0, y - 6, width, 12).fill({ color: 0xffeb3b, alpha: 0.8 });
    stage.addChild(beam);

    gsap.to(beam, {
      alpha: 0,
      duration: 0.25,
      ease: 'power2.out',
      onComplete: () => {
        stage.removeChild(beam);
        beam.destroy();
        onComplete?.();
      },
    });
  }
}
