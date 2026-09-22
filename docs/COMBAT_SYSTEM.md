# ⚔️ DiliFighter Combat System Specification

A comprehensive technical guide to the combat mechanics, hitboxes, frame advantage, blocking, and the Shadow Energy system.

---

## 1. Directional Attacks & Move Hierarchy

In DiliFighter, every attack button (`Punch`, `Kick`) produces a distinct move depending on the directional input held at the moment of execution.

### Attack Height Classifications:
- **High**: Can hit standing opponents; can be ducked under by crouching. Deals maximum damage on airborne opponents.
- **Mid**: Hits both standing and crouching opponents. Blockable by standard neutral guard.
- **Low**: Hits low; bypasses standard standing guard. Must be blocked by crouching (`Down` input).

---

## 2. Universal Combat Moveset

### 👊 Punch Moves
| Input | Move Name | Height | Startup | Active | Recovery | Damage | Knockback | Properties |
|---|---|---|---|---|---|---|---|---|
| **Neutral Punch (1)** | Jab | Mid | 6f | 4f | 10f | 8 | 40px | Fast combo starter |
| **Neutral Punch (2)** | Cross | Mid | 8f | 4f | 12f | 10 | 60px | Second hit in 3-hit string |
| **Neutral Punch (3)** | Heavy Dao Slash | Mid | 12f | 6f | 18f | 14 | 140px | Finisher; pushes opponent back |
| **Forward + Punch** | Lunging Blade Thrust | Mid | 10f | 5f | 16f | 18 | 180px | Lurches fighter forward by 80px |
| **Up + Punch** | Rising Dragon Uppercut | High | 8f | 6f | 20f | 22 | Up + 160px | Anti-air launcher |
| **Down + Punch** | Low Twin Stab | Low | 9f | 5f | 14f | 12 | 50px | Pokes low under standing guard |

### 🥋 Kick Moves
| Input | Move Name | Height | Startup | Active | Recovery | Damage | Knockback | Properties |
|---|---|---|---|---|---|---|---|---|
| **Neutral Kick (1)** | Snap Kick | Mid | 7f | 4f | 11f | 10 | 50px | Fast spacing tool |
| **Neutral Kick (2)** | Roundhouse | High | 10f | 5f | 14f | 12 | 90px | High impact; breaks stance |
| **Forward + Kick** | Flying Torpedo Kick | Mid | 14f | 8f | 22f | 20 | 220px | Airborne gap closer |
| **Up + Kick** | High Axe Kick | High | 12f | 5f | 20f | 24 | Down + 80px | Overhead; crushes crouching foes |
| **Down + Kick** | Dragon Sweep | Low | 11f | 6f | 18f | 16 | 120px | Sweeps legs; causes Knockdown |

### 🎯 Ranged Attack
| Input | Move Name | Height | Startup | Projectile Speed | Damage | Properties |
|---|---|---|---|---|---|---|
| **Ranged (`L`)** | Shadow Shuriken | Mid | 14f | 650 px/s | 15 | Interrupts opponent attacks; blockable |

---

## 3. Defense & Guard Mechanics

### Neutral Guard (Standing Block)
- **Activation**: Fighter stands still or presses away from the opponent while the opponent's active attack frames intersect their guard zone.
- **Damage Reduction**: 80% damage reduction (chip damage = 20%).
- **Block Stun**: 8 to 12 frames (attacker experiences slight pushback).

### Crouch Guard (Low Block)
- **Activation**: Fighter holds `Down` or `Down-Back`.
- **Properties**: Successfully defends against Low attacks (e.g., Dragon Sweep). Vulnerable to High overhead strikes (e.g., High Axe Kick).

---

## 4. Shadow System & Shadow Mode

### 🌀 Meter Dynamics
- **Max Capacity**: 100 units.
- **Gain on Landed Hit**: +10 units.
- **Gain on Damage Taken**: +5 units.
- **Gain on Successful Block**: +3 units.
- **Decay Rate**: When transformed, meter drains at 8.3 units/sec (12 seconds total duration).

### ⚡ Shadow Abilities
When transformed into Shadow Form, special moves cost zero meter but deal massive damage and possess invincible startup frames:
1. **Shadow Dash Thrust (`Shadow + Punch`)**:
   - Fighter phases through space, reappearing behind opponent with a piercing dual blade slash.
   - Damage: 40 | Unblockable if timed during opponent's startup.
2. **Shadow Void Shockwave (`Shadow + Kick`)**:
   - Slams the ground, erupting cyan spires of dark energy across the stage floor.
   - Damage: 45 | Knocks opponent airborne.
