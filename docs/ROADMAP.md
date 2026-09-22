# 🗺️ DiliFighter Roadmap & Milestone Plan

This document outlines the strategic engineering and design roadmap for **DiliFighter** from initial release to full cross-platform tournament readiness.

---

## 📌 Release Milestones Overview

```
[v1.0.0 Foundation] ──► [v1.1.0 Gear & Affinities] ──► [v1.2.0 Story & Bosses] ──► [v2.0.0 Online PvP]
     (CURRENT)                  (Next Sprint)                  (Phase 3)                  (Phase 4)
```

---

## 🚀 Version 1.0.0 — Foundation & Combat Core (Current)
- [x] Clean ES6 modular architecture powered by Vite.
- [x] Deterministic 60 FPS fixed-timestep physics and collision engine.
- [x] Procedural martial arts vector/skeletal character rendering.
- [x] Dual character roster: **Dili** (Duelist) and **Tsunami** (Samurai).
- [x] Directional attack engine (Punches, Kicks, Sweeps, Anti-airs, Projectiles).
- [x] Real-time Shadow Mode transformation with visual realm shift and cyan aura effects.
- [x] Web Audio procedural sound synthesizer (swings, impacts, clashes, shadow resonance).
- [x] Shadow Fight inspired HUD with animated damage trails and cyan energy gauge.
- [x] Dual control scheme: Desktop Keyboard + Responsive Mobile Touch Joystick & Buttons.
- [x] Opponent AI with spacing, defensive blocking, and combo reaction.
- [x] CI/CD automated build pipeline with GitHub Actions.

---

## 🛡️ Version 1.1.0 — Equipment, Perks & Weapon Upgrades
- [ ] **Equipment System**:
  - Helmets (Defense & headshot protection).
  - Body Armor (Damage reduction & weight modifiers).
  - Weapons (Swords, Daos, Nunchakus, Kusarigama).
- [ ] **Faction Affinities**:
  - *Dynasty*: High agility, aerial combo chaining.
  - *Legion*: Unbreakable heavy armor frames, crushing blows.
  - *Heralds*: Precision critical strike chance, time-manipulation perks.
- [ ] **Combat Polish**:
  - Point-blank throws and tactical grapples.
  - Hit sparks colored by critical strike status.
  - Slow-motion impact zoom on match-winning final blow.

---

## ⛩️ Version 1.2.0 — Stages, Soundscapes & Campaign Mode
- [ ] **New Atmospheric Stages**:
  - Bamboo Forest with dynamic wind and falling foliage.
  - Castle Rooftops at Moonrise with thunderstorm effects.
  - Shadow Citadel interior with glowing cyan obelisks.
- [ ] **Story Mode / Tower Campaign**:
  - 5-stage tournament ladder culminating in a fight against a mysterious Shadow Warlord boss.
  - Pre-fight dialog encounters with character portraits.
  - Fighter profile and progression saving via `localStorage`.

---

## 🌐 Version 2.0.0 — Multiplayer & Cross-Platform Native
- [ ] **Peer-to-Peer Online Duels**:
  - WebRTC connection between two players.
  - Deterministic input synchronization with rollback netcode.
- [ ] **Native Packaging**:
  - Progressive Web App (PWA) manifest for 1-click home screen install.
  - Capacitor wrapper for Android APK and iOS deployment.
  - Electron wrapper for Steam / Windows / macOS / Linux release.
