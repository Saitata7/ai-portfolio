# Sai Tata — AI Engineer Portfolio

Interactive portfolio featuring an animated Canvas 2D hero with robot agents working at themed AI workstations.

## Live Site

**https://sai-tata-ai.netlify.app/**

## Tech Stack

- React 18 + Vite 6
- Tailwind CSS 3
- Framer Motion 11
- Canvas 2D (custom entity system)

## Getting Started

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Features

- **Interactive Canvas Hero** — 12 robot agents work at 6 AI-themed workstations, carrying data packages
- **Click to Interrupt** — Cinematic freeze with distance-based ripple, agents stare at cursor
- **Self-Heal System** — Click any agent to inject a fault; a medic rushes from across the map with speed trails, performs cinematic treatment (diagnose → defibrillate → stabilize), and brings the agent back online
- **Security Vault** — Bug fight system where agents equip guns and defend against escaped vulnerabilities with aim, recoil, and zap beams
- **Climate Themes** — 5 ambient modes (Auto, Day, Night, Rain, Snow) with a sweep beam transition that reboots agents with dim/flash animation
- **Box Flip Navigation** — Workstation boxes flip to reveal portfolio sections
- **Two-Page Architecture** — Full-screen canvas landing + scrollable content page
- **Mobile Responsive** — Touch support, 4 layout tiers (xs/sm/md/lg), custom cursor on desktop
- **DPR-Correct Rendering** — Works on standard and Retina displays
- **Frame-Rate Independent** — Consistent animation speed at 60fps and 120fps

## Deployment

Configured for Netlify via `netlify.toml`. Push to `main` to deploy.
