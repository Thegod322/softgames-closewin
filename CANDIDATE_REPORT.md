# Softgames — Operation Close Win: AI-First Workflow & Time Breakdown

- **Candidate:** Arkady Krutius
- **Live Prototype & Tuner:** [thegod322.github.io/softgames-closewin](https://thegod322.github.io/softgames-closewin/)
- **Interactive Timeline & Prompts:** [thegod322.github.io/guapiko-timeline-viewer](https://thegod322.github.io/guapiko-timeline-viewer/)
- **Raw Conversation Transcripts:** [github.com/Thegod322/guapiko-timeline-viewer/tree/main/transcripts](https://github.com/Thegod322/guapiko-timeline-viewer/tree/main/transcripts)
- **Source Code Repository:** [github.com/Thegod322/softgames-closewin](https://github.com/Thegod322/softgames-closewin)

---

## 1. AI-First Workflow: How the Tool Was Built Quickly

To build a fully playable WebGL prototype, a headless Monte Carlo simulator ($4,500+\text{ games/s}$), and a multi-persona balancing suite within hours, I used a tight **human-in-the-loop AI pipeline**:

### Step 1: Context Preparation & Modular Decomposition
- **Persistent AI Memory:** Instead of sending fragmented chat prompts, I codified all level schemas, modifier rules, and coordinate geometry formulas into a persistent AI skill (`softgames-closewin`). This eliminated context loss across sessions.
- **Task Decomposition:** Decomposed the architecture into 7 modular task specifications with clear input/output boundaries and unit test criteria.

### Step 2: Headless Architecture & Zero-Asset Rendering
- **Decoupled Engine:** Instructed the AI to build the core game state machine (`TripeaksEngine`) and spatial overlap graph (`CardGraph`) completely headless, independent of DOM or rendering libraries. This allowed the exact same logic to run in browser gameplay and high-speed Web Worker simulation batches.
- **Procedural Vector Pipeline (`CardTextureFactory`):** All 52 cards, suit symbols, lock chains, bombs, keys, and zap effects are generated via code/SVG. No raster images were needed, keeping the entire production bundle at **465 kB**.

### Step 3: Human-in-the-Loop Playtesting & Balance Discovery
- **Game Feel Iteration:** As the operator, I playtested every compiled build directly in the browser, identifying physical nuances AI missed (e.g., tuning the card height bounding box to $150\text{px}$ to fix covered card reveals, calibrating bomb tick pacing).
- **The Golden Seed Solution:** Batch simulations revealed that strictly forcing 70% Close Win Rate (CWR) on random deals reduced deck sizes to 13–16 cards and collapsed pass rates to ~3%. To solve this, I designed a **dynamic Golden Seed Miner** in Web Workers that extracts deterministic seeds where the level is verified 100% winnable with $\le 2$ cards left, delivering maximum fun and tension during play.
- **Multi-Persona Testing:** Implemented 3 bot archetypes (Casual $\epsilon=15\%$, Medium $\epsilon=3\%$, Expert $\epsilon=0\%$) to verify skill expression and level fairness.

### Step 4: UI/UX Encapsulation
- Consolidated the simulation engine, seed miner, and analytics into compact ~340px modular cards with Dual-Donut charts (All Games conversion vs. Win Quality) and 1-click calibrated JSON exports.

---

## 2. Honest Time Breakdown: Development vs. Prompting / Tuning

All metrics below were extracted directly from the conversation transcript logs via [`scripts/timeline_analyzer.py`](../scripts/timeline_analyzer.py):

### Project Overview
- **Total Calendar Span (Wall-Clock):** 44 hours (Aug 18, 22:10 ➔ Aug 20, 18:10)
- **Net Active AI Development Time:** **2 hours 44 minutes** across **47 turns in 6 sessions (2 major milestones)**
- **Idle, Sleep & Manual Playtesting Gaps:** 41 hours 17 minutes

### Effort Distribution

```
  ┌─────────────────────────┬──────────────────────────┬─────────────────────────────┐
  │  Prompting & Task Spec  │  AI Code Gen & Refactor  │  Playtesting & Calibration  │
  │        ~25 mins (15%)   │        ~55 mins (35%)    │        ~1h 24m (50%)        │
  └─────────────────────────┴──────────────────────────┴─────────────────────────────┘
```

| Phase | What Happened | Active AI Time | Turns | Traditional Estimate | Time Saved |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **1. Specs & Architecture** | Researching bot heuristics, drafting schemas, task decomposition | **5 mins** | 7 | 4.0 hours | **98%** |
| **2. Engine & MVP Prototype** | Headless FSM, 2D overlap graph, PixiJS v8 Canvas renderer | **12 mins** | 7 | 8.0 hours | **97%** |
| **3. Geometry & Game Feel** | Card occlusion tuning, bomb countdowns, keys/locks mechanics | **54 mins** | 8 | 6.0 hours | **85%** |
| **4. Tuner & Golden Seeds** | Monte Carlo bisection search, seed mining engine, SVG charts | **25 mins** | 12 | 6.0 hours | **93%** |
| **5. Personas & UI Polish** | 3-Persona benchmark (Casual/Pro), high-density UI encapsulation | **1h 08m** | 13 | 8.0 hours | **86%** |
| **Total** | **Full-Cycle Delivery** | **2h 44m** | **47** | **~32 hours** | **~91.5% Faster** |

> **Key Takeaway:** AI automated 100% of the repetitive boilerplate, state machine logic, WebGL graphics, and worker multi-threading (~55 mins). Over 50% of active developer time (~1h 24m) was focused on **hands-on playtesting, diagnosing the CWR survivorship bias, and fine-tuning game feel**.

---

## 3. Level Calibration Results Summary

Simulations run with $N = 2,000$ per candidate configuration (cohort of 1,000 players):

| Level ID | Mechanics & Modifiers | Raw Deck | Mode A: Strict Target (70% CWR) | Mode A Pass Rate | Mode B: Retention Peak Deck | Mode B Pass Rate | Total High Drama (Close Wins + Near Misses) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **level_25** | Standard 3-Peak (21 cards) | 21 | **15 cards** (72.9% CWR) | 2.6% | **28 cards** | 44.3% | **41.3% (413 / 1,000)** |
| **level_31** | Zap + 2 Locks + 1 Key (26 cards) | 26 | **15 cards** (68.0% CWR) | 4.5% | **26 cards** | 41.7% | **40.6% (406 / 1,000)** |
| **level_43** | Multi-Layer Pyramid (28 cards) | 28 | **16 cards** (70.5% CWR) | 3.1% | **24 cards** | 25.4% | **37.0% (370 / 1,000)** |
| **level_54** | Bomb Countdown ($T=5$, 20 cards) | 20 | **13 cards** (71.1% CWR) | 3.3% | **20 cards** | 17.2% | **20.9% (209 / 1,000)** |

*All calibrated JSON files are available in [`data/levels/`](./data/levels/).*
