# Telegram Drive Monorepo

This repository contains a multi‑package setup for the Telegram Drive project.
It is organised as a pnpm workspace with separate applications and shared
packages.

## Structure

* **apps/backend** – Python FastAPI backend service.
* **apps/desktop** – Tauri desktop application using React + TypeScript and TailwindCSS.
* **packages** – Placeholder for shared types, contracts and utilities (empty for now).

## Getting started

### Backend

Ensure you have Python 3.11+ installed. To run the backend in development:

```bash
python -m uvicorn app.main:app --reload
```

This command starts the FastAPI server defined in `apps/backend/app/main.py`
with automatic reload on file changes.

### Desktop (Tauri)

This folder contains a Tauri application built with React and Vite. After
installing the dependencies with pnpm you can start the development server:

```bash
pnpm install
pnpm dev

# or to run the Tauri shell
pnpm tauri dev
```

> **Note:** The `pnpm` package manager is required to bootstrap and build the
> desktop application. In restricted environments where pnpm cannot be
> installed these commands may not function, but the project structure has
> been prepared to meet the specification.

## Next steps

This iteration only bootstraps the repository. No application features have
been implemented yet. Follow the specification document for further
iterations.