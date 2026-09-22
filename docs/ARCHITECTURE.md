# 🏗️ DiliFighter Engine Architecture

This document outlines the technical design, rendering loop, state machines, and mathematical foundations powering **DiliFighter**.

---

## 1. Engine Loop & Fixed Timestep Physics

DiliFighter employs a decoupled **fixed timestep accumulator loop** (`Engine.js`) to guarantee deterministic physics, frame-perfect hitbox calculations, and identical combat logic regardless of monitor refresh rates (60Hz, 120Hz, 144Hz, 240Hz).

```
   Browser requestAnimationFrame(timestamp)
                     │
                     ▼
             Calculate Delta Time (dt)
                     │
         Accumulate dt (capped at 0.1s)
                     │
      ┌──────────────┴──────────────┐
      ▼                             │
While (accumulator >= FIXED_DT):    │  (FIXED_DT = 1/60s ≈ 16.67ms)
  1. Input Poll                     │
  2. Combat Logic & Physics Step    │
  3. Hitbox Collision Test          │
  4. Particle & Camera Update       │
  5. accumulator -= FIXED_DT        │
      └──────────────┬──────────────┘
                     ▼
           Render Frame (alpha interpolation)
```

### Benefits:
- **Zero Physics Glitching**: High-refresh gaming monitors won't speed up or slow down gravity, movement, or attack active windows.
- **Fair Frame Data**: Active hitbox windows consistently last exact predetermined frame durations.

---

## 2. Entity State Machine

Every fighter is governed by a strict state machine (`src/entities/Fighter.js`):

```
                      ┌───────────────┐
                      │     IDLE      │◄─────────────┐
                      └───────┬───────┘              │
                              │                      │
        ┌─────────────┬───────┴───────┬─────────────┐│
        ▼             ▼               ▼             ▼│
     WALKING       JUMPING        CROUCHING      BLOCKING
        │             │               │             │
        └─────────────┴───────┬───────┴─────────────┘
                              ▼
                         ATTACKING
                   (Startup -> Active -> Recovery)
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
           HIT_STUN                     KNOCKDOWN
         (Taking hit)              (Swept / heavy blow)
               │                             │
               └──────────────┬──────────────┘
                              ▼
                           GETTING_UP
```

### Attack Phases:
1. **Startup**: Windup frames where no damage is dealt. Can be counter-hit for bonus damage.
2. **Active**: Weapon/limb hitboxes spawn and test for intersection against opponent hurtboxes.
3. **Recovery**: Follow-through animation where the fighter cannot block or act until finished.
4. **Cancel Window**: Certain moves allow canceling recovery into Shadow Mode or combo branches.

---

## 3. Collision Architecture: Hitbox vs Hurtbox

Collision is computed using Axis-Aligned Bounding Boxes (AABB) with coordinate transforms:

- **Hurtbox**: Vulnerable regions of the fighter's body.
  - Head (`x, y - 90, w: 28, h: 28`)
  - Torso (`x - 18, y - 65, w: 36, h: 42`)
  - Legs (`x - 16, y - 25, w: 32, h: 45`)
- **Hitbox**: Damaging zones created during attack active frames.
  - Directional offset based on fighter's facing orientation (`direction = 1` for right, `-1` for left).
  - Contains damage value, knockback vector, hit stun frames, and blockable flags (High, Mid, Low).
- **Pushbox**: Prevents fighters from walking through each other; provides natural martial arts spacing.

---

## 4. Shadow Realm Transformation Pipeline

When Shadow Mode is triggered:
1. `ShadowSystem.js` activates `inShadowMode = true`.
2. `StageManager.js` shifts the background shader/canvas filter:
   - Decreases ambient saturation by 85%.
   - Boosts contrast and tints background in midnight monochrome.
   - Activates floating cyan embers and ethereal smoke drifts.
3. `FighterRenderer.js` restyles the fighter:
   - Body geometry switches to obsidian black shadow silhouette.
   - Eyes emit bright cyan laser points (`#00f0ff`).
   - Slashes and movements emit persistent cyan ribbon trails using canvas bezier curves with fading alpha.
4. Unlocks supernatural moves with extended hitboxes and heavy frame advantages.

---

## 5. Web Audio Synthesis Architecture

Rather than relying on large, slow-loading `.wav` or `.mp3` files that fail offline or eat bandwidth, `SoundEngine.js` synthesizes sounds dynamically via the native Web Audio API:

- **Whoosh / Attack Swings**: Generates dynamic white noise buffer passed through a lowpass/bandpass BiquadFilter with an exponential frequency ramp.
- **Martial Arts Thuds**: Sine oscillator (80Hz down to 20Hz) modulated with a fast-decaying noise burst for visceral punch/kick impacts.
- **Blade Clashes**: Multiple high-frequency metallic sine oscillators (1200Hz, 1850Hz, 3200Hz) with sharp envelope attack and exponential resonance decay.
- **Shadow Burst**: Low sub-bass sine drop (60Hz down to 30Hz) accompanied by a sweeping high-resonance filter.
