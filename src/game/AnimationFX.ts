import gsap from 'gsap';
import { Container, Graphics, Sprite, Texture } from 'pixi.js';

export class AnimationFX {
  public static animateCardDraw(
    cardSprite: Container,
    from: { x: number; y: number },
    to: { x: number; y: number },
    onComplete?: () => void
  ): void {
    cardSprite.position.set(from.x, from.y);
    cardSprite.scale.set(0.9);
    cardSprite.rotation = (Math.random() - 0.5) * 0.2;

    gsap.to(cardSprite, {
      x: to.x,
      y: to.y,
      rotation: 0,
      duration: 0.25,
      ease: 'power2.out',
      onComplete,
    });

    gsap.to(cardSprite.scale, {
      x: 1.0,
      y: 1.0,
      duration: 0.25,
      ease: 'back.out(1.2)',
    });
  }

  public static animateCardMatch(
    cardSprite: Container,
    to: { x: number; y: number },
    onComplete?: () => void
  ): void {
    gsap.to(cardSprite, {
      x: to.x,
      y: to.y,
      rotation: 0,
      duration: 0.22,
      ease: 'power2.inOut',
      onComplete,
    });

    gsap.to(cardSprite.scale, {
      x: 1.05,
      y: 1.05,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
    });
  }

  public static animateCardFlip(
    cardSprite: Container,
    faceTexture: Texture,
    cardMainSprite: Sprite,
    onComplete?: () => void
  ): void {
    gsap.to(cardSprite.scale, {
      x: 0,
      duration: 0.12,
      ease: 'power1.in',
      onComplete: () => {
        cardMainSprite.texture = faceTexture;
        gsap.to(cardSprite.scale, {
          x: 1,
          duration: 0.15,
          ease: 'power1.out',
          onComplete,
        });
      },
    });
  }

  public static animateLockShake(cardSprite: Container): void {
    const origX = cardSprite.x;
    gsap.to(cardSprite, {
      x: origX + 6,
      duration: 0.05,
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
    beam.rect(0, y - 8, width, 16).fill({ color: 0xffeb3b, alpha: 0.8 });
    stage.addChild(beam);

    gsap.to(beam, {
      alpha: 0,
      duration: 0.3,
      ease: 'power2.out',
      onComplete: () => {
        stage.removeChild(beam);
        beam.destroy();
        onComplete?.();
      },
    });
  }
}
