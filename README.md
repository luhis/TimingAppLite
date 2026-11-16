# Timing App Lite

Timing App Lite is a Gatsby TypeScript app that reads the live Sapphire Solutions autotest leaderboard API and renders a searchable results list.

## Project Structure

- `frontend/` - Gatsby TypeScript frontend application
- `DotNetBackend/` - .NET backend API

## What it does

- Loads live competitions from `https://autotest.sapphire-solutions.co.uk/API/1/LiveCompetitions/`
- Loads available leaderboards for the selected competition
- Renders the selected leaderboard as a filterable results table
- Highlights section rows such as class breaks when they appear in the payload

## Development

### Backend

```powershell
cd DotNetBackend
dotnet run --project DotNetBackend
```

The API will be available at `http://localhost:5167`.

`GET /API/1/Competitions/{competitionId}/SiteNameNoProxy` returns the competition's site name using a direct Sapphire request. The existing `SiteName` endpoint continues to use the proxy.

To run backend tests:

```powershell
cd DotNetBackend/DotNetBackend.Tests
dotnet run
```

### Frontend

```powershell
cd frontend
yarn install
yarn run develop
```

The site will be available at `http://localhost:8000`.

At build time, Gatsby extracts competition site names directly from Sapphire
event pages, preserving the Sapphire session across redirects. The Event List
shows a site name only when its event name and date exactly match one
competition; unmatched or ambiguous events show a dash. The current and
historical events lists also show the club name using the competition ID.
The competition entry button also uses this mapping. Newly refreshed events
receive site names after the next build.

## Validation

```powershell
cd frontend
yarn run typecheck
yarn run build
```

## Settings

Create a `frontend/.env` file with:

```sh
GATSBY_BACKEND_URL=http://localhost:5167
```

If you don't want to run the dotnet API locally, you can bypass the Lite server and connect directly to the sapphire server at `https://autotest.sapphire-solutions.co.uk`, but you will lose signalR capabilities and compression.  Or use the prod server at `https://timingapplite.purplesea-f465acb7.uksouth.azurecontainerapps.io`
