# 🥋 DiliFighter

<div align="center">

![DiliFighter Banner](https://img.shields.io/badge/DiliFighter-v1.0.0-00f0ff?style=for-the-badge&logo=electron&logoColor=white)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge&logo=githubactions&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)
![Tech](https://img.shields.io/badge/Engine-Custom_HTML5_Canvas_&_WebAudio-orange?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Web_Desktop_%26_Mobile-blue?style=for-the-badge)

**A high-octane 2D/2.5D martial arts fighting game built from scratch.**  
*Featuring procedural vector skeletal animation, dynamic Shadow Energy realm transitions, Web Audio synthesized effects, and fluid dual-platform controls.*

[Play Now](#-quick-start) • [Combat Mechanics](#-combat-system) • [Controls](#-controls) • [Architecture](#-architecture) • [Roadmap](#-roadmap)

---

</div>

## ⚡ Core Features

- **🥋 100% From Scratch**: Custom vector/procedural martial artist rendering engine, bespoke frame-data combat logic, and real-time Web Audio synthesized SFX. Zero heavy black-box engine bloat.
- **🌀 Shadow Energy Realm System**:
  - Exchange strikes and parries to charge your cyan Shadow Gauge.
  - At 100%, trigger **Shadow Mode**: the arena transitions into an obsidian dark dimension, your fighter morphs into an ethereal shadow silhouette with blazing cyan eyes and luminous blade arcs, unlocking devastating supernatural special moves.
- **🥊 Directional Attack Matrix**:
  - High attacks (anti-air launcher, descending axe kick).
  - Mid attacks (rapid jab strings, lunging piercing blade thrust).
  - Low attacks (under-guard pokes, sweep kicks causing ground knockdown).
- **🔊 Zero-Asset Web Audio Synthesizer**: Procedural blade clashes, whoosh swings, bone-cracking impacts, and low-frequency resonant shadow rumbles generated in real-time.
- **📱 Responsive Dual Input**:
  - Full desktop keyboard support with fluid response.
  - Built-in on-screen 8-direction virtual joystick and ergonomic touch action buttons for mobile & touchscreen devices.
- **🤖 Tactical Combat AI**: Opponent tracks spacing (footsies), blocks incoming assaults, executes counter sweeps, and unleashes its own Shadow Mode when charged.

---

## 🎮 Controls

### 💻 Desktop (Keyboard)
| Action | Key 1 | Key 2 (Alternative) | Move Description |
|---|---|---|---|
| **Move Left / Right** | `A` / `D` | `←` / `→` | Advance or create distance |
| **Jump** | `W` | `↑` | Airborne evasion & anti-air setups |
| **Crouch / Low Guard** | `S` | `↓` | Ducks high attacks, blocks sweeps |
| **Punch / Weapon Slash** | `J` | `Z` | Multi-hit combo chains (J, J, J) |
| **Kick** | `K` | `X` | Snap kicks, high roundhouse, low sweep |
| **Ranged Weapon** | `L` | `C` | Throw Shadow Kunai projectile |
| **Shadow Mode / Ability** | `Space` | `U` | Unleash Shadow Realm (at 100% meter) |
| **Pause / Options** | `Escape` | `P` | Open settings, audio toggle & guide |

### 📱 Mobile & Touchscreen
- **Left Thumb**: Floating 8-directional analog virtual joystick.
- **Right Thumb**:
  - 👊 **Punch**: Swift weapon/fist strikes.
  - 🥋 **Kick**: Martial arts kicks & sweeps.
  - 🎯 **Kunai**: Ranged projectile throw.
  - 🌀 **Shadow Orb**: Large pulsing cyan orb to trigger Shadow Form!

---

## 🏗️ Architecture & Engine Design

```
DiliFighter/
├── docs/
│   ├── ARCHITECTURE.md            # Fixed-timestep physics & rendering pipeline
│   ├── COMBAT_SYSTEM.md           # Hitbox, hurtbox, frame data & blocking rules
│   ├── ROADMAP.md                 # Milestone schedule from v1.0.0 to v2.0
│   ├── CONTRIBUTING.md            # Guidelines for open-source contributors
│   └── ci-workflow-template.yml   # CI pipeline template
├── src/
│   ├── index.html                 # Canvas mount & responsive wrapper
│   ├── main.js                    # Bootstrapper
│   ├── config.js                  # Engine tuning & keybindings
│   ├── core/                      # Engine loop, Camera, Input, Vector math
│   ├── combat/                    # Hitbox collision, FrameData, ShadowSystem
│   ├── entities/                  # Fighter state machine, Renderer, Particles, Projectiles
│   ├── characters/                # Dili (Player) & Tsunami (Samurai AI)
│   ├── stages/                    # TempleCourtyard (Parallax & Realm Shift)
│   ├── audio/                     # SoundEngine (Procedural Web Audio API)
│   ├── ui/                        # HUD, Joystick, TouchButtons, Announcer, PauseMenu
│   └── styles/                    # Canvas layout & typography
├── LICENSE                        # MIT License
└── package.json                   # Project scripts & dependencies
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ & npm

### Installation & Local Run
```bash
# Clone the repository
git clone https://github.com/badhonai/DiliFighter.git
cd DiliFighter

# Install dependencies
npm install

# Launch development server
npm run dev
```

Open your browser at `http://localhost:5173` to play!

### Production Build
```bash
npm run build
```
The optimized bundle will be generated in `dist/`.

---

## 🗺️ Roadmap & Upcoming Milestones

- [x] **v1.0.0 — Foundation & Combat Core**: 60 FPS deterministic engine, dual fighters (Dili & Tsunami), complete directional attack matrix, Shadow Mode transformation, Web Audio sound effects, responsive mobile touch joystick, and combat AI.
- [ ] **v1.1.0 — Armor, Weapon Upgrades & Customization**: Faction gear sets (Dynasty, Legion, Heralds), critical strike perks, and close-range grapples/throws.
- [ ] **v1.2.0 — Stages & Campaign Story Mode**: Bamboo Forest & Shadow Citadel arenas, narrative boss encounters, and local profile progression.
- [ ] **v2.0.0 — Multiplayer & Native Mobile Packaging**: WebRTC peer-to-peer duels with rollback netcode and native Capacitor/PWA packaging for Android and iOS.

---

## 📄 License
This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

Developed with ❤️ by **[badhonai](https://github.com/badhonai)** and the open-source community.
