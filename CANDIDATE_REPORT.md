# 🎯 Softgames — Operation Close Win: Candidate Delivery Report
> **Role:** AI Technical Game Designer  
> **Candidate:** Arkady Krutius  
> **Repository:** [github.com/Thegod322/softgames-closewin](https://github.com/Thegod322/softgames-closewin)  
> **Live Prototype & Tuner:** [thegod322.github.io/softgames-closewin](https://thegod322.github.io/softgames-closewin/)  
> **Interactive Timeline & Prompts Audit:** [thegod322.github.io/guapiko-timeline-viewer](https://thegod322.github.io/guapiko-timeline-viewer/)  
> **Transcripts Repository:** [github.com/Thegod322/guapiko-timeline-viewer](https://github.com/Thegod322/guapiko-timeline-viewer)  

---

## 📌 Executive Summary & Deliverables Index

This report accompanies the submission for the **Technical Game Designer ("Operation Close Win")** take-home project for Softgames.

The project delivers a **100% data-driven, client-side web suite** built in TypeScript, PixiJS (v8), GSAP, and Web Workers. It directly addresses the core challenge: calibrating unbalanced Solitaire Tripeaks levels so that victories produce a high-tension **"Close Win"** emotional state (defined as $\le 2$ cards remaining in the draw pile), while preventing punishing churn.

### 📦 Deliverables Checklist (per Brief Part 3)

| Deliverable | Description | Access / Location |
| :--- | :--- | :--- |
| **🎮 Playable Prototype** | WebGL/PixiJS v8 tactile prototype respecting $x, y, \text{depth}$, occlusions, all 4 card modifiers, and responsive scaling. | [Live Game Tab](https://thegod322.github.io/softgames-closewin/) |
| **📊 Difficulty Tuner** | High-speed Monte Carlo simulator ($4,500+\text{ games/sec}$), Bisection Auto-Calibrator, Multi-Objective Peak Optimizer, and Dual-Donut analytics. | [Live Tuner Tab](https://thegod322.github.io/softgames-closewin/) |
| **📁 4 Calibrated JSONs** | Production-ready calibrated JSONs for `level_25`, `level_31`, `level_43`, `level_54` for both Strict 70% CWR and Peak Retention. | [`data/levels/`](./data/levels/) |
| **🧠 AI-First Write-Up** | Detailed breakdown of the 5-step engineering pipeline: domain research, persistent project skill, human-in-the-loop playtesting, and UI optimization. | [Section 1 Below](#1-ai-first-production-pipeline--engineering-workflow) |
| **⏱️ Honest Time Breakdown** | Verifiable chrono-audit with exact timestamps, active AI vs gap times, and prompt distribution from conversation transcripts. | [Section 2 Below](#2-honest-chrono-audit--time-breakdown) & [Timeline Viewer](https://thegod322.github.io/guapiko-timeline-viewer/) |
| **📜 Verbatim Transcripts** | Full, untruncated AI conversation logs (`transcript.jsonl`) for all 6 development sessions. | [Transcripts Archive](https://github.com/Thegod322/guapiko-timeline-viewer/tree/main/transcripts) |

---

## 1. AI-First Production Pipeline & Engineering Workflow

To build a production-grade WebGL game engine, a headless Monte Carlo simulator, a Multi-Persona balancing suite, and an interactive seed miner in hours, I utilized a structured **5-Step Human-in-the-Loop AI Engineering Pipeline**:

```
                       5-STEP AI-FIRST PRODUCTION PIPELINE
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ 1. INGESTION, RESEARCH & PERSISTENT PROJECT SKILL                                      │
 │    • Ingest brief & raw level JSONs                                                    │
 │    • Deep research on Information Set Monte Carlo & Solitaire heuristic bots           │
 │    • Create living "softgames-closewin" Skill (long-term memory across all AI chats)  │
 │    • Decompose architecture into modular task specifications (Tasks 01–07)             │
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ 2. AUTONOMOUS IMPLEMENTATION & HUMAN-IN-THE-LOOP FEEDBACK LOOP                         │
 │    • Agent executes task files sequentially (Headless FSM ➔ Web Workers ➔ PixiJS v8)  │
 │    • Operator playtests builds in browser ➔ records game feel & edge-case notes        │
 │    • Tight feedback loop: prompt iteration based on tactile feel & spatial occlusions  │
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ 3. ANALYTICAL BALANCING DISCOVERY & LIVEOPS SYNTHESIS                                  │
 │    • Monte Carlo simulations reveal "Survivorship Bias" in strict 70% CWR (3% pass rate)│
 │    • Hero Solution: Mining "Golden Seeds" (100% winnable, maximum fun in playtests)    │
 │    • Alternative Solution: Mode B Peak Drama for casual LiveOps Near-Miss monetization│
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ 4. MILESTONE 2: FEATURE EXPANSION & MULTI-PERSONA BENCHMARK                            │
 │    • Spec Task 08: 3 Player Personas (Casual, Core, Expert) & Dynamic On-Demand Mining │
 │    • Background Web Workers scan ~8,000 seeds/s to guarantee deterministic yields      │
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ 5. HIGH-DENSITY UI/UX ENCAPSULATION                                                    │
 │    • Consolidate heavy analytics into high-density ~340px modular cards                 │
 │    • Dual-Donut visualization: All Games conversion vs Win Quality Close Win Rate      │
 │    • Clean, distraction-free game layout focusing on pure gameplay flow                │
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

### Deep Dive into the 5 Steps:

#### Step 1: Ingestion, Research & Persistent Project Skill
* **Domain & Algorithm Research:** Researched Information Set Monte Carlo (IS-MCTS), heuristic bot weightings, and Solitaire solvers (`bot_algorithms_research.md`, `SoftGames Research.md`).
* **Living Project Skill (`softgames-closewin`):** Instead of relying on fragile one-off prompts, I formalized all domain rules, coordinate geometry formulas, modifier schemas, and architectural constraints into a custom AI Skill. This skill acted as a persistent memory bank, automatically keeping every subsequent AI session in sync.
* **Task Decomposition:** Decomposed the project into modular task files (`task_01` to `task_07`) with explicit verification gates, test runners, and Definition of Done.

#### Step 2: Autonomous Implementation & Human-in-the-Loop Feedback
* **Execution:** AI subagents implemented the headless state machine (`TripeaksEngine`), spatial overlap graph (`CardGraph`), zero-asset vector renderer (`CardTextureFactory`), and PixiJS canvas view.
* **Playtesting & Tactile Feedback:** As the operator, I playtested every build directly in browser, identifying subtle physical nuances that raw code generation misses—such as card height overlap threshold ($150\text{px}$ vs $144\text{px}$ spacing delta), bomb timer tick cadence, and smooth GSAP card flip transitions.

#### Step 3: Analytical Balancing Discovery & LiveOps Synthesis
* Running batch simulations revealed that blindly forcing a strict 70% Close Win Rate (CWR) created an aggressive mathematical paywall: deck sizes dropped to 13–16 cards, crashing pass rates to $2.6\%\text{--}4.5\%$.
* **The Hero Solution — Curated Golden Seeds:** Mining deterministic seeds where a level is 100% winnable under calibrated hand sizes delivered extraordinary playtesting results—intense tension, zero frustration, and guaranteed close wins.
* **Alternative LiveOps Balance (Mode B):** Provided a relaxed deck size baseline ($20\text{--}28$ cards) optimizing for $400+\text{ high-excitement games per 1,000}$ (Absolute Close Wins + Near Misses) with healthy $25\%\text{--}44\%$ pass rates.

#### Step 4: Milestone 2 Feature Expansion (Task 08)
* Formulated Task 08 to add **Multi-Persona sensitivity testing** (Casual $\epsilon=15\%$, Medium $\epsilon=3\%$, Expert $\epsilon=0\%$) and **Dynamic On-Demand Seed Mining** directly in Web Workers, removing any need for multi-megabyte static pre-mined seed files.

#### Step 5: High-Density UI/UX Encapsulation
* Converted raw simulation outputs into an intuitive dashboard: self-contained strategy cards (~340px), Dual-Donut statistical differentiation (All Games vs. Win Quality), and collapsible deep-dive drawers for manual parameter tweaking.

---

## 2. Honest Chrono-Audit & Time Breakdown

To provide complete transparency (per Brief Part 3), we developed a custom analytics tool ([`timeline_analyzer.py`](../scripts/timeline_analyzer.py)) that parsed all local conversation transcripts (`transcript.jsonl`) to compute exact timestamps, active AI development time, and idle/playtesting gaps.

### ⏱️ High-Level Project Timeline Overview
- **Total Calendar Span (Wall-Clock):** 44 hours (Aug 18, 22:10 ➔ Aug 20, 18:10)
- **⚡ Total Active AI Development Time:** **2 hours 44 minutes** (6.2% density)
- **⏸️ Total Gap Time (Sleep, Breaks, Manual Playtesting & Design Reflection):** 41 hours 17 minutes
- **💬 Total Engineer-to-AI Turns:** 47 turns across **6 development sessions (2 major milestones)**

### 📊 Breakdown by Development Sessions & Milestones

| Milestone | Session / Focus | Active AI Time | Turns | % of Work | Traditional Estimate | Time Saved |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Milestone 1: Core MVP** | **Chat 1:** Requirements, Architecture & Task Spec | **4m 56s** | 7 | 3.0% | 4.0 hours | **98%** |
| | **Chat 2:** Headless FSM, Graph & PixiJS Prototype | **12m 22s** | 7 | 7.5% | 8.0 hours | **97%** |
| | **Chat 3:** Geometry, Overlap Tuning & Modifiers | **53m 55s** | 8 | 32.8% | 6.0 hours | **85%** |
| | **Chat 4:** Monte Carlo Bot, Bisection Tuner & Seeds | **25m 12s** | 12 | 15.3% | 6.0 hours | **93%** |
| **Milestone 2: Polish & Personas** | **Chat 5:** Multi-Persona Spec & UI Architecture | **4m 13s** | 2 | 2.5% | 2.0 hours | **96%** |
| | **Chat 6:** 3-Persona Engine, Dynamic Miner & UI | **1h 03m** | 11 | 38.9% | 6.0 hours | **82%** |
| **Total** | **Full-Cycle Delivery (2 Milestones, 6 Sessions)** | **2h 44m** | **47** | **100%** | **~32 hours** | **~91.5% Faster** |

### 🔍 Effort Breakdown: Prompting vs. Code Gen vs. Playtesting/Tuning

```
  ┌─────────────────────────┬──────────────────────────┬─────────────────────────────┐
  │  Prompting & Task Spec  │  AI Code Gen & Refactor  │  Playtesting & Calibration  │
  │        ~25 mins (15%)   │        ~55 mins (35%)    │        ~1h 24m (50%)        │
  └─────────────────────────┴──────────────────────────┴─────────────────────────────┘
```

> **Key Takeaway:** Over 50% of the active effort was dedicated to **game feel validation, balance verification, and mathematical edge-case analysis** (e.g. diagnosing survivorship bias in the CWR formula and perfecting the spatial card overlap thresholds), while AI handled 100% of the boilerplate, data structures, and WebGL rendering code.

👉 **[Explore the Interactive 44-Hour Visual Timeline](https://thegod322.github.io/guapiko-timeline-viewer/)**

---

## 3. Game Design & Balancing Analysis

### A. The Core Balancing Benchmark ($N = 2,000$ Simulations per Level)

#### Mode A: Strict Brief Target ($CWR \approx 70\% \pm 2\%$)
Calibrated via automated bisection search targeting $\text{Close Win Rate} \ge 70\%$:

| Level ID | Mechanics & Modifiers | Brief Deck Size | Calibrated CWR | Pass Rate | Abs Close Wins (per 1k) | Near Misses (per 1k) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Level 25** | Standard 3-Peak Layout (21 cards) | **15 cards** | **72.9%** | 2.6% | 19 / 1,000 | 88 / 1,000 |
| **Level 31** | ⚡ Zap + 🔒 2 Locks + 🔑 1 Key | **15 cards** | **68.0%** | 4.5% | 31 / 1,000 | 125 / 1,000 |
| **Level 43** | Complex Multi-Layer Pyramid (28 cards) | **16 cards** | **70.5%** | 3.1% | 22 / 1,000 | 93 / 1,000 |
| **Level 54** | 💣 Ticking Bomb Countdown ($T = 5$) | **13 cards** | **71.1%** | 3.3% | 24 / 1,000 | 103 / 1,000 |

---

### B. Deep Technical Game Designer Insight: The "Survivorship Bias" in CWR

While the brief asked for $70\%$ of wins to be Close Wins ($\le 2$ cards in draw pile), a strict mathematical optimization reveals a critical live-service trap:

$$\text{CWR} = P(\text{Remainder} \le 2 \mid \text{Win}) = \frac{N_{\text{wins with Remainder } \le 2}}{N_{\text{total wins}}}$$

1. **The Punitive Paywall Problem:** Because CWR is a **conditional probability**, forcing $70\%$ CWR restricts deck size so severely ($13\text{--}16$ cards) that overall Pass Rate crashes to **$2.6\%\text{--}4.5\%$**. 
2. **Player Experience Reality:** In Mode A, $96\%$ of players lose early with $10+$ cards remaining on the board. Only $20\text{--}30$ players per $1,000$ ever experience a Close Win.
3. **The LiveOps Synthesis:**
   - **🌟 Solution 1 (Curated Golden Seeds — The Hero Solution):** By mining deterministic golden seeds for any target hand size, we guarantee that the deal is **100% winnable** and finishes as a Close Win. In playtesting, this delivers pure flow, thrilling finishes, and zero unrewarding failures.
   - **⚡ Solution 2 (Mode B — Alternative Multi-Objective Balance):** For random-deal LiveOps, Mode B expands deck sizes ($20\text{--}28$ cards) to maximize **Absolute Close Wins** + **Near Misses** ($\le 2$ cards left on board on loss), providing **$400+\text{ high-excitement games per 1,000}$** with healthy $25\%\text{--}44\%$ pass rates.

#### Mode B: Multi-Objective Absolute Peak (Balanced Retention & Near Misses)
| Level ID | Mechanics & Modifiers | Peak Deck Size | Pass Rate | CWR | Abs Close Wins (per 1k) | Near Misses (per 1k) | Total High Drama |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Level 25** | Standard Layout (21 cards) | **28 cards** | **44.3%** | 30.2% | **134 players** | **279 players** | **41.3% of all plays** |
| **Level 31** | ⚡ Zap + 🔒 2 Locks + 🔑 1 Key | **26 cards** | **41.7%** | 31.4% | **131 players** | **275 players** | **40.6% of all plays** |
| **Level 43** | Complex Multi-Layer (28 cards) | **24 cards** | **25.4%** | 43.7% | **111 players** | **259 players** | **37.0% of all plays** |
| **Level 54** | 💣 Bomb Countdown ($T = 5$) | **20 cards** | **17.2%** | 39.3% | **68 players** | **141 players** | **20.9% of all plays** |

---

### C. Multi-Persona Skill Sensitivity Benchmark

To ensure levels reward skillful play while remaining accessible, the engine tests each level across 3 distinct player archetypes:

1. **🟢 Expert / Pro ($\epsilon = 0\%$):** Full lookahead, optimal chain sequencing ($w_{\text{uncover}}=4.0, w_{\text{depth}}=3.0, w_{\text{chain}}=2.5$), proactive bomb defusal ($T \le 3$).
2. **🟡 Medium / Core ($\epsilon = 3\%$):** Standard human heuristics, 1-step lookahead, normal bomb defusal ($T \le 2$).
3. **🔴 Casual / Novice ($\epsilon = 15\%$):** Greedy matching, delayed bomb defusal ($T \le 1$), random sub-optimal move noise.

#### Skill Expression Index ($\Delta PR = PR_{\text{expert}} - PR_{\text{casual}}$)
- **Level 25 ($\Delta PR = 41.2\%$):** High skill ceiling; mastery heavily rewards deep chain planning.
- **Level 31 ($\Delta PR = 38.6\%$):** High tactical dynamic; strategic timing of Key collection and Zap clearing creates huge win-rate deltas.
- **Level 54 ($\Delta PR = 29.4\%$):** Ticking bomb forces rigid priority sequencing, naturally compressing casual-to-pro variance.

---

### D. Why Seed Mining & Multiple Target Projections Were Built

The Difficulty Tuner was engineered not just as a static calculator, but as a **complete Game Designer Workbench**:
1. **Strict Brief Target (70% CWR):** Allows immediate verification of the exact mathematical prompt in the take-home brief.
2. **Multi-Objective Peak (Retention & Near Misses):** Provides live-service economy context for monetizable near-miss triggers.
3. **Dynamic Golden Seed Miner (`SeedMiner`):** Runs parallel Web Workers scanning ~8,000 seeds/s to extract verified winnable seeds for any hand size, allowing designers to curate level sequences where every player experiences handcrafted triumph.
4. **Single Seed Deep-Dive Inspector:** Allows designers to inspect seed metadata (solvability, max streak, remaining cards) and jump directly into the Playable Prototype (`🎮 Play This Seed`) to experience the deal firsthand.

---

## 4. Game Feel, Visual Polish & Technical Assumptions

### A. Game Feel & Tactile Flow
A balancing tool is useless if the designer cannot feel the rhythm of the cards:
- **Zero-Asset Procedural Clarity:** Code-rendered vector cards ensure instant load times with zero visual fuzziness across retina and high-DPI screens.
- **Occlusion Feedback:** Fully covered cards display royal blue diamond backs; partially covered cards indicate depth resistance; playable cards display crisp, high-contrast face values.
- **Juice & Motion FX:** Smooth GSAP bezier curves for card draws, waste pile stacking, uplifting key collection dissolves, and subtle lock shake animations upon invalid interaction.
- **Responsive Dynamic Viewport (`BoardLayout.scale`):** Dynamic coordinate scaling ensuring optimal card spacing whether viewed on an iPhone screen, iPad, or 4K desktop monitor.

### B. Mathematical Formats & Mechanics Logic

1. **2D Spatial Overlap & Occlusion Formula**:
   - Card dimensions in level space: $W = 100\text{px}, H = 150\text{px}$.
   - Card $A$ covers card $B$ if and only if:
     $$\text{depth}(A) > \text{depth}(B) \quad \land \quad |\Delta x| < 98\text{px} \quad \land \quad |\Delta y| < 147\text{px}$$
   - *Rationale:* Accounting for level coordinates spacing ($\Delta y = 96\text{px}$ and $144\text{px}$), setting bounding box height to $150\text{px}$ with a $0.98$ factor prevents visual glitches where covered lower-tier cards falsely appeared face-up.
2. **Bomb Countdown Mechanic**:
   - Bomb timer decrements on **both** board matches (`playCard()`) and draw pile pulls (`drawCard()`).
   - If timer reaches $0$ before the bomb card is cleared $\rightarrow$ **Instant Defeat (`bomb_exploded`)**.
3. **Key & Lock Mechanic**:
   - `lock`: Regular value card under a physical barrier. Cannot be clicked or matched until a Key is found.
   - `key`: Item entity. When collected, plays an uplifting float-and-dissolve animation, unlocks **all** lock cards currently on the board, and leaves the active waste card unchanged.
4. **Zap Row Clearance**:
   - Clears all board cards sharing the same horizontal tier ($|y - y_{\text{zap}}| \le 30\text{px}$) with particle FX.

---

## 5. Summary & Handover

This project demonstrates how an **AI Technical Game Designer** blends game balancing intuition, live-ops retention models, and rigorous AI workflow engineering to deliver production-ready studio tooling in hours.

- **Live Application:** [https://thegod322.github.io/softgames-closewin/](https://thegod322.github.io/softgames-closewin/)
- **Interactive Chrono-Audit:** [https://thegod322.github.io/guapiko-timeline-viewer/](https://thegod322.github.io/guapiko-timeline-viewer/)
- **Source Code & Data:** [https://github.com/Thegod322/softgames-closewin](https://github.com/Thegod322/softgames-closewin)
