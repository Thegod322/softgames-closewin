# Softgames — Operation Close Win (Tripeaks Solitaire & AI Difficulty Tuner)

> **Technical Take-Home Assignment for Softgames (Berlin)**  
> **Role:** AI Technical Game Designer  
> **Candidate:** Arkady Krutius

---

## 🎯 Project Overview

This project is a 100% data-driven solution designed to solve the **"Close Win" balancing problem** in Solitaire Tripeaks:
- **The Problem:** Raw procedural levels exhibit high variance — players either lose too early or win with 15+ cards left in the draw pile.
- **The Target:** Achieve a **Close Win rate $\ge 70\%$** (wins occurring with 0, 1, or 2 cards remaining in the draw pile).
- **Core Focus:** Minimalist visual design focused purely on **level feeling, difficulty pacing, and balance** rather than distracting arcade effects.

---

## 📦 2-Module Architecture (Game / Testing)

The application provides a unified responsive interface cleanly split into two specialized tabs:

### Tab 1: 🎮 Game (Playable Level Feel Prototype)
- Minimalist, clean PixiJS board rendering respecting $(x, y, \text{depth})$ layering and card occlusion.
- Focus on evaluating the **tactile flow and pacing of the level**.
- Tripeaks card mechanics ($\pm 1$, wrap Ace $\leftrightarrow$ King).
- Support for level modifiers:
  - 🔒 **Lock & Key:** Locked cards unlock dynamically upon collecting a key card.
  - 💣 **Bomb:** Real-time countdown timer on moves (playing card or drawing from stack).
  - ⚡ **Zap:** Instantaneous clearing of entire horizontal card rows.
- Smooth, clean GSAP transitions and clear visual state indicators.

### Tab 2: 📊 Testing (Simulation & Difficulty Calibration)
A visual interface driving the high-speed headless simulation engine with **two distinct operating modes**:

1. **Mode A — Parameter Simulation Test:**
   - Select any level (`level_25`, `level_31`, `level_43`, `level_54`) or upload custom JSON.
   - Set a specific `cards_in_stack` (deck size) and run $N$ Monte Carlo iterations.
   - View immediate win rate %, Close Win %, loss causes, and remaining cards histogram.

2. **Mode B — Calibration (Auto-Tuner):**
   - Automated search and parameter adaptation.
   - Iteratively tests candidate deck sizes to find the exact `cards_in_stack` that calibrates the level to the **70% Close Win target**.
   - 1-Click JSON export of calibrated level data for game production.

---

## 🚀 Quick Start & Setup

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### Installation
```bash
# Navigate to project folder
cd Projects/SoftGames/softgames-closewin

# Install dependencies
npm install

# Launch development server
npm run dev
```

The application will open at `http://localhost:3000`.
