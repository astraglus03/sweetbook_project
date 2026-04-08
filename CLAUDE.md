# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Monorepo with two independent sub-projects for a "Sweet Book" application:

- **`sweet_book_project_be/`** — NestJS 11 backend (TypeScript), PostgreSQL via TypeORM
- **`sweet_book_project_fe/`** — React 19 frontend (JSX), Vite 8

## Common Commands

All commands must be run from within the respective sub-project directory.

### Backend (`sweet_book_project_be/`)

```bash
npm run start:dev      # Dev server with watch mode (port 3000)
npm run build          # Compile via nest build
npm run test           # Unit tests (Jest)
npm run test -- --testPathPattern=<pattern>  # Run a single test file
npm run test:e2e       # E2E tests (jest-e2e.json config)
npm run lint           # ESLint with auto-fix
npm run format         # Prettier formatting
```

### Frontend (`sweet_book_project_fe/`)

```bash
npm run dev            # Vite dev server with HMR
npm run build          # Production build
npm run lint           # ESLint
```

## Architecture

### Backend

- **Framework**: NestJS 11 with Express platform
- **Database**: PostgreSQL (`sweetbook` database on localhost:5432, user `sweetbook_user`)
- **ORM**: TypeORM with `synchronize: true` (auto-schema sync — development only)
- **Entity auto-discovery**: Entities are loaded via glob pattern `src/**/*.entity{.ts,.js}`
- **Module structure**: Currently a single `AppModule` with TypeORM root config. No feature modules yet.
- **Testing**: Jest for unit tests (`.spec.ts` in `src/`), separate Jest config for E2E tests (`test/jest-e2e.json`)
- **TypeScript**: Targets ES2023, uses `nodenext` module resolution, decorators enabled

### Frontend

- **Framework**: React 19 with Vite 8 (JSX, not TypeScript)
- **Entry point**: `src/main.jsx` renders `<App />` into `#root`
- **Currently**: Scaffolded Vite+React starter template, no routing or API integration yet

### Database Entity

Single `User` entity with: `id` (auto-generated PK), `email` (unique), `name` (nullable), `createdAt` (auto-generated timestamp). Comments in the entity reference JPA equivalents for cross-framework context.
