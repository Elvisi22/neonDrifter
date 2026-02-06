# Neon Drift

Neon Drift is a one-thumb neon gate dodging game built with React + Phaser.

## Features
- Instant start with quick 30–180s sessions
- Progressive difficulty and combo streaks
- Near-miss moments, pulse gates, and haptic taps
- Local storage for best score and daily streak
- Mobile-first UI with clean neon styling

## Tech Stack
- React + TypeScript (UI shell)
- Phaser 3 (gameplay)
- Vite (build tooling)

## Scripts
- `npm run dev` – start local dev server
- `npm run build` – build for production
- `npm run preview` – preview production build

## Deployment
Netlify uses `npm run build` and publishes the `dist` folder. A `netlify.toml` file is included.

## Notes
Audio uses a WebAudio synth. Replace with real SFX later for production polish.
