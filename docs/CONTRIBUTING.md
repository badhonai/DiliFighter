# 🤝 Contributing to DiliFighter

Thank you for your interest in contributing to **DiliFighter**! DiliFighter is an open-source, community-driven martial arts fighting game built from scratch.

---

## 🧭 Code of Conduct
We are committed to providing a welcoming, inclusive, and harassment-free experience for everyone. Please be respectful and constructive in all issues, discussions, and pull requests.

---

## 🌿 Branching Strategy
We maintain two primary branches:
- **`main`**: The production branch containing stable, thoroughly tested releases.
- **`beta`**: The active development branch where new features, balance changes, and experiments land.

### Workflow:
1. Fork or clone the repository:
   ```bash
   git clone https://github.com/badhonai/DiliFighter.git
   cd DiliFighter
   ```
2. Create a feature branch off `beta`:
   ```bash
   git checkout beta
   git checkout -b feature/your-feature-name
   ```
3. Install dependencies and start the local development server:
   ```bash
   npm install
   npm run dev
   ```
4. Verify your changes and ensure the build succeeds:
   ```bash
   npm run build
   ```
5. Commit your changes following conventional commits:
   - `feat: add bamboo forest stage`
   - `fix: correct frame data on low sweep`
   - `docs: update combat system specification`
6. Submit a Pull Request targeting the **`beta`** branch.

---

## 🎨 Code Style & Quality Standards
- **Zero Heavy Black-Box Dependencies**: Keep the engine lightweight, fast, and accessible in all browsers.
- **Pure Vector / Procedural Assets**: When adding character visuals or animations, use the procedural skeletal system or lightweight SVG paths so the game retains zero external asset download overhead.
- **Deterministic Math**: Physics steps must use the fixed timestep accumulator pattern (`Engine.js`).
- **Comprehensive Comments**: Document any combat formula tweaks, damage scales, or state transitions.
