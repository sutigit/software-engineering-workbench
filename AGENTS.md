# Software Engineering Workbench

This repo is the source of Software Engineering Workbench: long-lived tooling
for Cursor workspaces. Agents open workbench UIs to read and write project
documentation. The repo path is `~/Projects/software-engineering-workbench`.

This file is for agents that evolve the workbench. Rules under `rules/` are for
agents that use one surface inside a product workspace. Keep those jobs apart.

## Surfaces

A surface is one workbench UI (a Cursor canvas), an optional workspace rule for
agents, and per-workspace data that stays local.

| Surface | Source | Workspace rule | Status |
| --- | --- | --- | --- |
| Feature specification | `feature-specification.canvas.tsx` | `rules/feature-specification-canvas.mdc` | Active |

Planned kinds: architecture diagrams, test coverage catalogue, docs, CI/CD, and
kinds the user adds later. A hub UI will list surfaces and open the matching
documentation. Build a surface or the hub only when the user asks.

Every surface must stay hub-ready: stable canvas filename, a title, and a
one-line purpose.

Distribution: `scripts/sync-workbench.py`, run by the user hook.
Hook setup and the manual sync command are in `README.md`.

## Surface contract

Applies to every current and future surface.

- Source lives in this repo. Copies under `~/.cursor/projects/<id>/canvases/`
  are overwrite targets. Never edit them as source.
- `*.canvas.data.json` is per workspace. Never copy it. Never seed it.
- Defaults are empty. No demo rows, no sample feature names.
- Old data files must load. Missing keys and short cell arrays read as empty.
- `useCanvasState` keys are a public schema. Change a shape only with a reader
  for the old shape.
- UI imports from `cursor/canvas` only. Follow the Cursor canvas skill.
- Human and agent ownership is defined per surface in its rule under `rules/`.
  Do not restate it here.

## Change protocol

Classify the request first.

- New surface: new canvas, a rule under `rules/` if agents write to it, extend
  the sync script, add a row to the Surfaces table. Do not add unrelated
  domains to an existing surface's tables.
- Existing surface UI or schema: edit that surface's source. Keep the contract.
- Agent behaviour inside a product workspace: edit that surface's rule.
- Distribution: edit the sync script, and `README.md` if the command changes.
- One product workspace's content: local data only. Do not change this repo.
- Hub: a later canvas that opens other surfaces. Only when the user asks.

Then:

1. Implement in this repo.
2. Type-check with the TypeScript compiler against the workspace canvases
   `tsconfig.json`. Do not trust `npx tsc`; it resolves to the wrong package.
3. Run the sync script for the workspaces the user names.
4. Tell the user to reopen the canvas with Command Palette: Open Canvas.

## Compatibility checklist

- New tables, columns, or surfaces do not require existing data files to gain
  keys.
- No historical key is removed without a reader for the old name.
- A fresh workspace opens empty.
