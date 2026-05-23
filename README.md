# Timing App Lite

Timing App Lite is a Gatsby TypeScript app that reads the live Sapphire Solutions autotest leaderboard API and renders a searchable results list.

## What it does

- Loads live competitions from `https://autotest.sapphire-solutions.co.uk/API/1/LiveCompetitions/`
- Loads available leaderboards for the selected competition
- Renders the selected leaderboard as a filterable results table
- Highlights section rows such as class breaks when they appear in the payload

## Development

```powershell
npm install
npm run develop
```

The site will be available at `http://localhost:8000`.

## Validation

```powershell
npm run typecheck
npm run build
```
