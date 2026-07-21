# AGENTS.md

cmux-web is a mobile-first web interface for [cmux](https://cmux.com). It mirrors the cmux sidebar and terminals so you can triage and unblock agent workspaces from a phone over Tailscale. It is cmux native: use only what the cmux socket provides, add no external tooling.

## Stack

TanStack Start (React, Router, Query), Biome, Vitest, pnpm, Nitro Node server. Only the server touches cmux, by shelling out to the local `cmux` CLI.

## Architecture (clean, dependency-inverted)

Each layer depends only on the one below, through ports (interfaces).

- `domain/`: entities, ports, pure services. No framework or Node imports.
- `application/`: use cases that orchestrate ports.
- `infrastructure/`: adapters (cmux CLI gateway, events source, auth).
- `server/`: composition root (DI) plus auth-guarded server functions.
- `routes/ components/ hooks/ lib/`: presentation.

Rules:

- Depend on ports, not concretes (DIP). The only seam to cmux is `CmuxTransport`.
- Keep `domain` and `application` pure (no Node, no React). Server-only code (`node:*`, crypto, child_process) lives in `infrastructure`/`server` and is imported only from server functions.
- One responsibility per module (SRP). Extend by adding, not editing (OCP). Example: a new agent is a new profile in `domain/services/agent-registry.ts`, no logic change.
- Centralise every cmux call in the gateway (`infrastructure/cmux`) so a cmux version change is a one-file fix.

## cmux integration rules

- Terminal I/O uses the ref-safe CLI wrappers (`read-screen`, `send`, `send-key`). Raw rpc targeting a `surface_ref` silently falls back to the focused surface, so never use it for input.
- Read the coloured terminal via `terminal.replay` (render grid); read plain text via `read-screen`.
- To submit to an agent or shell, send text then `send-key enter`. There is no prompt wrapper.
- Detect the running agent from `surface.resume_binding.kind`; slash commands come from the agent registry.

## Add a feature

1. Define or extend a port in `domain/ports`.
2. Add a use case in `application/use-cases`.
3. Implement the port in the infrastructure adapter; map raw cmux payloads in `infrastructure/cmux/mappers.ts`.
4. Expose it via an auth-guarded server function in `server/functions`.
5. Add UI in `routes`/`components`; fetch with TanStack Query and invalidate on stream events.
6. Add tests (below).

## Test

Pure `domain` and `application` logic is tested with fake gateways (plain objects that implement a port), no mocking framework. Tests live next to the code as `*.test.ts`.

```bash
pnpm test
```

## Conventions

- SOLID and clean architecture always.
- No em-dashes anywhere. Comments are terse and explain why, not what. No doc or ticket cross-references in comments.
- Biome enforces style: 2-space indent, single quotes, no semicolons, organised imports. Import from `src` with the `#/` alias.
- Do not edit `src/routeTree.gen.ts` (generated).

## CI and pre-commit

CI runs on push and PRs: Biome check, type-check, test, build. Run all four locally before committing:

```bash
pnpm check && pnpm typecheck && pnpm test && pnpm build
```

## Dev and serve

- Local: `cp .env.example .env` (set `CMUX_SOCKET_PATH`; leave `APP_PASSWORD` empty to disable the gate), then `pnpm dev` (http://localhost:3000).
- Tailnet: set `APP_PASSWORD` in `.env`, then `pnpm serve:tailnet` (port 31337, prints the URL). Stop with `pnpm serve:tailnet:stop`.
