# AI Portfolio — CLAUDE.md

## Overview
Interactive AI Engineer portfolio for **Sai Tata**. Two-page React app with a custom Canvas 2D animated hero (robot agents working at AI workstations) and a content page with all portfolio sections.

## Tech Stack
- **React 18** + **Vite 6** + **Tailwind CSS 3** + **Framer Motion 11**
- **Canvas 2D** (no Three.js) — custom entity system for agents, bugs, beams
- No React Router — state-based page switching (`activePage: 'canvas' | 'content'`)

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run preview` — preview production build

## Architecture

### Two Pages
- **Canvas Page** (`CanvasPage.jsx`): Full-screen animated workspace, no scroll. Landing page.
- **Content Page** (`ContentPage.jsx`): New hero + About, Projects, Skills, Experience, Demos, Contact sections.

### Navigation Flow
Canvas agents working → click to freeze → pick section → agents walk → box flips → click box → content page opens at that section. "CANVAS" button returns to agent workspace.

### File Structure
```
src/
├── App.jsx                           # Page switcher (canvas vs content)
├── main.jsx                          # Entry point
├── index.css                         # Global styles, Tailwind directives
├── canvas/
│   ├── World.js                      # Scene manager, animation loop, state machine
│   ├── entities/
│   │   ├── Agent.js                  # Robot agent: states, movement, drawing (~800 lines)
│   │   ├── Bug.js                    # Bug entity: scatter/flee/zapped/return
│   │   └── ZapBeam.js               # Energy beam effect
│   └── systems/
│       ├── BugFightSystem.js         # Bug waves, agent-bug assignment, containment
│       └── WorkstationThemes.js      # 6 themed draw functions + canvas icons
├── components/
│   ├── pages/
│   │   ├── CanvasPage.jsx            # Canvas + StatusBar, h-screen overflow-hidden
│   │   └── ContentPage.jsx           # ContentHero + all sections + Footer
│   ├── sections/
│   │   ├── HeroCanvas.jsx            # React shell for canvas (refs, events, overlay)
│   │   ├── ContentHero.jsx           # Content page hero (name, title, social links)
│   │   ├── About.jsx, Projects.jsx, Skills.jsx, Experience.jsx, LiveDemos.jsx, Contact.jsx
│   └── layout/
│       ├── StatusBar.jsx, CustomCursor.jsx, Footer.jsx, BackToTop.jsx
├── data/
│   └── portfolioData.js              # All portfolio content (no company names)
└── utils/
    └── motion.js                     # Framer Motion presets (fadeUp, heroFade, etc.)
```

### Canvas System (World.js)
- **Single source of truth**: `World.gState` — React subscribes via callbacks
- **States**: `working`, `watching`, `navigating`, `nav_waiting_click`
- **DPR handling**: `ctx.setTransform(dpr,...)`, cached `canvasRect` for mouse coords
- **Frame-rate independent**: All movement is `pixels/second * dt`
- **Resize**: `_initLayout()` (first time) vs `_updateLayout()` (preserves agents)

### 6 Workstations (SECTION_DEFS)
| Station | Color | Maps to |
|---|---|---|
| VOICE & NLP | #00f0ff (cyan) | About |
| COMPUTER VISION | #a855f7 (purple) | Projects |
| CODE & ENGINEERING | #00ff88 (green) | Skills |
| ML TRAINING | #ff00aa (pink) | Experience |
| DATA & ANALYTICS | #ffaa00 (orange) | Live Demos |
| DEPLOY & CLOUD | #00aaff (blue) | Contact |

### Agent States
`IDLE → WALK_TO_PICKUP → PICKUP → CARRYING → DROPOFF → WALK_HOME`
Plus: `NAV_WALKING`, `NAV_ARRIVED`, `BUG_CHASE`

### Bug Fight System
- Click Security Vault → bugs escape → spread toward workstations
- Agents get weapons (beam/sword/shield) and chase bugs
- ZapBeam connects agent antenna to bug
- 4 waves, 3.5s intervals, 16s auto-end
- Click elsewhere to seal vault early

## Tailwind Theme
- **Colors**: cyan, purple, pink, green, orange, blue, deep (#030508), dark (#06080d)
- **Fonts**: Orbitron (display), Outfit (body), JetBrains Mono (mono)
- **Key classes**: `.page-section`, `.section-label`, `.section-title`, `.section-desc`

## Key Patterns
- **Callback refs**: `useRef(callback)` + `useEffect(() => { ref.current = callback })` to avoid useEffect restarts
- **Empty useEffect deps**: Canvas runs once, never restarts on re-render
- **No company names** in portfolio data — generic role descriptions only
- **Canvas icons** replace emojis (drawMicIcon, drawEyeIcon, etc. in WorkstationThemes.js)

## Portfolio Data
All content in `src/data/portfolioData.js`. Real projects: Voycee (Voice AI), n8n Agent, ApplySharp, SaaSCode Kit, AWS Connect IVR.
