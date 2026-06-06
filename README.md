# Timing App Lite

Timing App Lite is a Gatsby TypeScript app that reads the live Sapphire Solutions autotest leaderboard API and renders a searchable results list.

## What it does

- Loads live competitions from `https://autotest.sapphire-solutions.co.uk/API/1/LiveCompetitions/`
- Loads available leaderboards for the selected competition
- Renders the selected leaderboard as a filterable results table
- Highlights section rows such as class breaks when they appear in the payload

## Development

```powershell
yarn install
yarn run develop
```

The site will be available at `http://localhost:8000`.

## Validation

```powershell
yarn run typecheck
yarn run build
```

## Settings

Create a `.env` file with:

```sh
GATSBY_SIGNALR_HUB_URL=http://localhost:5167
```

If you don't want to run the dotnet API locally, you can bypass the Lite server and connect directly to the sapphire server at `https://autotest.sapphire-solutions.co.uk`, but you will lose signalR capabilities and compression.
