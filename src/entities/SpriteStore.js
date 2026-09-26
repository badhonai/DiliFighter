/**
 * SpriteStore — the AI sprite-sheet pipeline (trial).
 *
 * Each fighter has per-pose JPG frames on a magenta screen in
 * public/sprites/<char>/<pose>.jpg. Frames are chroma-keyed to
 * transparency, trimmed to their bounding box and served as canvases
 * to FighterRenderer. Missing/failed frames degrade gracefully: the
 * renderer falls back to the vector body, so the game never breaks.
 */
import { GAME_CONFIG } from '../config.js';

export const SPRITE_POSES = ['idle', 'walk', 'windup', 'strike', 'block', 'hit'];

const cache = new Map();

/** @returns {{ready:boolean, poses:Map<string,{canvas:HTMLCanvasElement,w:number,h:number}>}|null} */
export function spriteEntry(charId) {
  return cache.get(charId) || null;
}

/** Load + process every available pose for a character (idempotent). */
export async function loadCharacterSprites(charId, base = '') {
  if (!GAME_CONFIG.SPRITES) return null;
  if (cache.has(charId)) return cache.get(charId);

  const entry = { ready: false, poses: new Map() };
  cache.set(charId, entry);

  await Promise.all(SPRITE_POSES.map((pose) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const processed = processFrame(img);
        if (processed) entry.poses.set(pose, processed);
      } catch { /* keep vector fallback for this pose */ }
      resolve();
    };    img.onerror = resolve; // pose missing -> vector fallback
    img.src = `${base}sprites/${charId}/${pose}.jpg`;
  })));

  // Enough frames to feel alive; otherwise stay vector.
  entry.ready = entry.poses.has('idle') && entry.poses.size >= 3;
  return entry;
}

/** Chroma-key magenta -> alpha, feather edges, trim to content. */
function processFrame(img) {
  const w = img.naturalWidth, h = img.naturalHeight;
  if (!w || !h) return null;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const mag = Math.min(r, b) - g; // magenta-ness
    if (mag > 70 && r > 120 && b > 120) { px[i + 3] = 0; continue; }
    if (mag > 30 && r > 100 && b > 100) {
      px[i + 3] = Math.max(0, 255 - (mag - 30) * 6); // feather the rim
    }
    if (px[i + 3] > 24) {
      const x = (i / 4) % w;
      const y = ((i / 4) / w) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;

  const out = document.createElement('canvas');
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  const octx = out.getContext('2d');
  octx.putImageData(data, -minX, -minY);

  // Shadow-form variant: same silhouette filled void-dark with a faint
  // cyan inner rim, so shadow mode matches the sprite art direction.
  const shadow = document.createElement('canvas');
  shadow.width = out.width;
  shadow.height = out.height;
  const sctx = shadow.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(out, 0, 0);
  const sd = sctx.getImageData(0, 0, shadow.width, shadow.height);
  const sp = sd.data;
  for (let i = 0; i < sp.length; i += 4) {
    const a = sp[i + 3];
    if (!a) continue;
    // edge pixel (transparent neighbour) gets the cyan rim
    const x = (i / 4) % shadow.width;
    const y = ((i / 4) / shadow.width) | 0;
    const edge =
      x === 0 || y === 0 || x === shadow.width - 1 || y === shadow.height - 1 ||
      sd.data[i - 4 + 3] < 40 || sd.data[i + 4 + 3] < 40 ||
      sd.data[i - shadow.width * 4 + 3] < 40 || sd.data[i + shadow.width * 4 + 3] < 40;
    if (edge) { sp[i] = 0; sp[i + 1] = 240; sp[i + 2] = 255; }
    else { sp[i] = 10; sp[i + 1] = 15; sp[i + 2] = 23; }
  }
  sctx.putImageData(sd, 0, 0);

  return { canvas: out, shadow, w: out.width, h: out.height };
}
