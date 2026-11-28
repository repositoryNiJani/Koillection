import { useEffect, useRef } from 'react';
import { koiVariety, msUntilStarve, STARVE_MS } from '../game/fish.js';

export const POND_W = 160;
export const POND_H = 96;
export const SPRITE_W = 24;
export const SPRITE_H = 16;
const EGG_Y = 68; // eggs rest on the sand

// cheap stable pseudo-random number in [0,1) from an id
const rand = (n, salt) => {
  const x = Math.imul((n + 1) * 374761393 + salt * 668265263, 2246822507) >>> 0;
  return x / 4294967296;
};

// Where is this fish at time t (seconds)? Pure function of id + time, so
// there is no per-fish animation state to keep in sync with game state.
export function fishPose(fish, t) {
  if (fish.stage === 0) {
    return {
      x: 20 + rand(fish.id, 1) * 112,
      y: EGG_Y + Math.sin(t * 1.3 + fish.id) * 0.6,
      flip: false,
    };
  }
  const minX = 12;
  const maxX = POND_W - 12 - SPRITE_W;
  const speed = 0.22 + rand(fish.id, 2) * 0.22;
  const phase = rand(fish.id, 3) * Math.PI * 2;
  const baseY = 14 + rand(fish.id, 4) * 40;
  const wave = Math.sin(t * speed + phase);
  return {
    x: minX + (maxX - minX) * (0.5 + 0.5 * wave),
    y: baseY + 3 * Math.sin(t * 0.9 + phase * 2),
    flip: Math.cos(t * speed + phase) > 0, // sprites face left, so flip when swimming right
  };
}

export default function Pond({ fish, selectedId, onSelect }) {
  const canvasRef = useRef(null);
  const imgs = useRef({ bg: null, sprites: null });
  const live = useRef({ fish, selectedId });
  const boxes = useRef([]);

  live.current = { fish, selectedId };

  useEffect(() => {
    const bg = new Image();
    bg.src = '/pond_background.png';
    const sprites = new Image();
    sprites.src = '/koi_sprites.png';
    imgs.current = { bg, sprites };

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    let raf;

    // people who asked their system for less motion get a still pond
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const frame = (ms) => {
      const t = reduceMotion ? 0 : ms / 1000;
      const now = Date.now();
      const { fish: list, selectedId: sel } = live.current;
      ctx.clearRect(0, 0, POND_W, POND_H);
      if (bg.complete && bg.naturalWidth) ctx.drawImage(bg, 0, 0);

      const nextBoxes = [];
      for (const f of list) {
        const { x, y, flip } = fishPose(f, t);
        const px = Math.round(x);
        const py = Math.round(y);

        // hungry fish fade to grey
        const left = msUntilStarve(f, now) / STARVE_MS; // 1 = just fed, 0 = about to die
        const grey = left < 0.34 ? 0.85 : left < 0.67 ? 0.35 : 0;
        ctx.save();
        if ('filter' in ctx) {
          const tint = f.stage === 0 ? '' : koiVariety(f.varietyId).filter;
          ctx.filter = `${tint} ${grey > 0 ? `grayscale(${grey})` : ''}`.trim();
        }
        if (sprites.complete && sprites.naturalWidth) {
          if (flip) {
            ctx.translate(px + SPRITE_W, py);
            ctx.scale(-1, 1);
            ctx.drawImage(sprites, f.stage * SPRITE_W, 0, SPRITE_W, SPRITE_H, 0, 0, SPRITE_W, SPRITE_H);
          } else {
            ctx.drawImage(sprites, f.stage * SPRITE_W, 0, SPRITE_W, SPRITE_H, px, py, SPRITE_W, SPRITE_H);
          }
        }
        ctx.restore();

        if (f.stage > 0 && f.scaleId === 'gin-rin') {
          const sparkles = [[4, 4], [10, 2], [17, 7], [8, 12]];
          for (let i = 0; i < sparkles.length; i++) {
            const opacity = reduceMotion ? 1 : 0.35 + (Math.sin(t * 5 + f.id + i * 1.7) + 1) * 0.325;
            ctx.globalAlpha = opacity;
            ctx.fillStyle = '#fff';
            ctx.fillRect(px + sparkles[i][0], py + sparkles[i][1], 1, 1);
          }
          ctx.globalAlpha = 1;
        }

        if (f.id === sel) {
          // little gold arrow above the selected fish
          ctx.fillStyle = '#ffd24a';
          const ax = px + 11;
          const ay = py - 5;
          ctx.fillRect(ax - 2, ay, 5, 1);
          ctx.fillRect(ax - 1, ay + 1, 3, 1);
          ctx.fillRect(ax, ay + 2, 1, 1);
        }
        nextBoxes.push({ id: f.id, x: px, y: py });
      }
      boxes.current = nextBoxes;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) * POND_W) / rect.width;
    const py = ((e.clientY - rect.top) * POND_H) / rect.height;
    // later fish are drawn on top, so check them first
    for (let i = boxes.current.length - 1; i >= 0; i--) {
      const b = boxes.current[i];
      if (px >= b.x && px <= b.x + SPRITE_W && py >= b.y && py <= b.y + SPRITE_H) {
        onSelect(b.id);
        return;
      }
    }
    onSelect(null);
  };

  return (
    <canvas
      ref={canvasRef}
      className="pond"
      width={POND_W}
      height={POND_H}
      onClick={handleClick}
      aria-label="Your pond of koi. Click a fish to select it."
    />
  );
}
