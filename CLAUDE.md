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
│   │   ├── Agent.js                  # Robot agent: states, movement, drawing (~1000 lines)
│   │   ├── Bug.js                    # Bug entity: scatter/flee/zapped/return
│   │   ├── Bullet.js                # Gun projectile: trail, muzzle flash, spark impact
│   │   └── ZapBeam.js               # Energy arc beam effect
│   └── systems/
│       ├── AmbientTheme.js           # Time-of-day sky, stars, moon, clouds, rain
│       ├── BugFightSystem.js         # Bug waves, agent-bug assignment, containment
│       ├── SelfHealSystem.js        # Agent fault injection, medic dispatch, cinematic heal
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
│       ├── StatusBar.jsx, CustomCursor.jsx, NeuralBackground.jsx, Footer.jsx, BackToTop.jsx
├── data/
│   └── portfolioData.js              # All portfolio content (no company names)
└── utils/
    ├── motion.js                     # Framer Motion presets (fadeUp, heroFade, etc.)
    └── responsive.js                 # Breakpoint tiers + touch detection
```

### Canvas System (World.js)
- **Single source of truth**: `World.gState` — React subscribes via callbacks
- **States**: `working`, `watching`, `navigating`, `nav_waiting_click`
- **DPR handling**: `ctx.setTransform(dpr,...)`, cached `canvasRect` for mouse coords
- **Frame-rate independent**: All movement is `pixels/second * dt`
- **Resize**: `_initLayout()` (first time) vs `_updateLayout()` (preserves agents)
- **Responsive layout tiers**: `getLayoutTier(W)` → xs/sm/md/lg controls grid, agent count, sizes
- **Ambient theme**: `AmbientTheme` draws sky/stars/moon/clouds/rain behind everything

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
Self-heal: `SHOCKED → COLLAPSED → BEING_HEALED → RECOVERING`
Medic: `MEDIC_WALKING → MEDIC_HEALING`

### Bug Fight System
- Click Security Vault (bottom-right) → bugs escape → spread toward workstations
- Agents get guns, aim at bugs with recoil animation
- ZapBeam connects agent antenna to bug
- Tier-scaled: xs=2 waves/6 bugs, sm=3/10, lg=4/14. 16s auto-end.
- Click elsewhere to seal vault early

### Self-Heal System (SelfHealSystem.js)
- Click any agent to inject a fault → shock sparks → collapse with bounce easing
- Medic dispatched from farthest agent on different workstation (cinematic entrance)
- Medic rushes at 3.5x speed with green afterimage speed trail + arrival dust ring
- Treatment phases: diagnose (scan) → defibrillate (2 jolts) → stabilize (green heal flow)
- Recovery: agent stands back up, "ONLINE" text, expansion burst
- Progress ring shows heal % around downed agent
- Works in both `working` and `watching` states (shock triggers SET_WORKING)
- Max 2 concurrent heals, 3s cooldown per agent, 6s auto-recover fallback
- StatusBar shows green "AGENT FAULT — SELF HEAL ACTIVE" during heals

### Responsive Layout
| Tier | Width | Grid | Agents | Node Size |
|---|---|---|---|---|
| xs | < 480px | 2×3 | 6 (1/node, size 18) | 90×56 |
| sm | < 768px | 2×3 | 12 (2/node, size 22) | 100×62 |
| md | < 1024px | 3×2 | 12 (2/node, size 28) | 110×70 |
| lg | 1024px+ | 3×2 | 12 (2/node, size 28) | 130×80 |

- Tier changes on resize → full `_initLayout()` rebuild
- Touch: `onTouchEnd` on canvas, `touch-none` CSS, CustomCursor hidden on touch devices
- StatusBar/content sections use `sm:` responsive Tailwind prefixes

### Ambient Theme (AmbientTheme.js)
- **Default theme**: Night (override set in constructor)
- **5 climate modes**: Auto (time-based), Day, Night, Rain, Snow — UI dropdown top-right
- Reads local time every 10s (`hours + minutes/60` = fractional hour for smooth positioning)
- **Sun arc**: rises 6am (left horizon) → peaks noon (top center) → sets 6pm (right horizon). Parabolic arc via `sin(t * PI)`. Warm orange glow near horizon, white-yellow when high. Multiple glow layers for visibility.
- **Moon arc**: rises ~7pm (left) → peaks ~midnight (top) → sets ~5am (right). Crescent shadow from `moonPhase`. Silvery glow + crater details.
- **Stars**: 80 twinkling, fade in continuously as `nightStrength` increases (not discrete). Visible from dusk.
- **Sky gradient**: smooth blended transitions (sunrise 6-9, day 9-17, sunset 17-20, night 20-6) using RGBA lerp
- **Clouds**: 5 drifting clusters, color-tinted per period
- **Rain**: random cycle (dry 60-180s, rain 15-30s), fades in/out
- **Snow**: persistent snow particles when snow theme active
- **Theme transitions**: sweep beam (`_drawThemeTransition`) sweeps left-to-right, agents reboot with dim/flash/boot-up animation
- Draw order: clearRect → sky → stars → sun → moon → clouds → rain/snow → grid/dots → rest
- Grid/dot colors subtly tinted per period
- Day theme: light UI colors for text, panels, and agent bodies (`_tc()` helper in Agent.js)
- Agents work 24/7 — the moving sky proves it

## Tailwind Theme
- **Colors**: cyan, purple, pink, green, orange, blue, deep (#030508), dark (#06080d)
- **Fonts**: Orbitron (display), Outfit (body), JetBrains Mono (mono)
- **Key classes**: `.page-section`, `.section-label`, `.section-title`, `.section-desc`

## Key Patterns
- **Callback refs**: `useRef(callback)` + `useEffect(() => { ref.current = callback })` to avoid useEffect restarts
- **Empty useEffect deps**: Canvas runs once, never restarts on re-render
- **No company names** in portfolio data — generic role descriptions only
- **Canvas icons** replace emojis (drawMicIcon, drawEyeIcon, etc. in WorkstationThemes.js)
- **Touch-first mobile**: `isTouchDevice()` hides cursor, `onTouchEnd` handles canvas taps
- **Responsive breakpoints**: xs < 480, sm < 768, md < 1024, lg 1024+

## Portfolio Data
All content in `src/data/portfolioData.js`. Real projects: Voycee (Voice AI), n8n Agent, ApplySharp, SaaSCode Kit, AWS Connect IVR.
