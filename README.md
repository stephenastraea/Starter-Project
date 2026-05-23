# Welcome to Conductor

This is the starter project for Conductor, a macOS app for running multiple coding agents in parallel in isolated git worktree workspaces.

The app itself is a small React + TypeScript + Vite project. It gives new Conductor workspaces something quick to install, run, edit, review, and ship.

## How Conductor Uses This Project

Conductor creates each workspace as its own git worktree and branch. The checked-in `conductor.json` tells Conductor how to prepare and run this starter app:

```json
{
  "scripts": {
    "setup": "npm install",
    "run": "npm run dev"
  }
}
```

When you create a workspace, Conductor runs the setup script from the workspace directory. When you click Run, Conductor starts the Vite dev server.

## What this is

A vacation meal planner: an interactive map that searches Foursquare for nearby restaurants in a 10-mile radius, lets you save picks, and arrange them into a single-day itinerary by meal slot. Pins click through to Google Maps for full reviews. Local-first with a shareable URL.

See `docs/superpowers/specs/2026-05-22-meal-planner-design.md` for the design spec and `docs/superpowers/plans/2026-05-22-meal-planner.md` for the implementation plan.

## Local development

```sh
npm install
```

For the SPA only (no serverless functions):

```sh
npm run dev
```

For the full app including `/api/*` functions, use Vercel's dev server (requires `npm install -g vercel`):

```sh
vercel dev
```

You'll need a `FOURSQUARE_KEY` in `.env.local`. Get one at developer.foursquare.com.

## Tests

```sh
npm test         # one-shot
npm run test:watch
```

## Deploy

This deploys to Vercel automatically when pushed to a connected branch. Set `FOURSQUARE_KEY` in the Vercel project's Preview and Production environments.
