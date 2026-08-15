# Timing App Lite

## Project overview

This repository contains:
- a Gatsby/React frontend in `frontend/`
- a .NET backend in `DotNetBackend/`

## Local workflow

### Backend

```bash
cd DotNetBackend
dotnet run --project DotNetBackend
```

### Backend tests

```bash
cd DotNetBackend/DotNetBackend.Tests
dotnet run
```

### Frontend

```bash
cd frontend
yarn install
yarn run develop
```

### Validation

```bash
cd frontend
yarn run typecheck
yarn run build
```

## Conventions

- Prefer changes that match the repo's existing Gatsby/React and .NET structure.
- Use the repository’s actual project scripts instead of inventing custom test or build commands.
- Keep frontend work consistent with the current TypeScript and Gatsby patterns already in use.
- Keep backend changes aligned with the code patterns already present in the .NET project.
- When possible, validate with the smallest relevant command before finishing work.
