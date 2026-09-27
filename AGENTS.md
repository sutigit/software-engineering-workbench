# Software Engineering Workbench

This repo is the source of Software Engineering Workbench: long-lived tooling
for Cursor workspaces. Agents open workbench UIs to read and write project
documentation. The repo path is `~/Projects/software-engineering-workbench`.

This file is for agents that evolve the workbench. Rules under `rules/` are for
agents that use one surface inside a product workspace. Keep those jobs apart.

## Hub and surfaces

The workbench is one Cursor canvas, `workbench.canvas.tsx`. A canvas is a
single file with no relative imports, so every surface is a page inside that
file. The hub is the sidebar and the task page. The sidebar lists tasks from
the `tasks` key; the user creates, renames, and deletes them there and in the
task header. The task page shows an Overview tab plus one tab per surface from
the `surfaces` array. The open task is stored in `hubTask`, the open tab in
`hubPage`.

A surface is one tab in a task, an optional workspace rule for agents, and
per-workspace data that stays local. All surfaces share
`workbench.canvas.data.json`. Surface data is keyed by task id: `taskSpecs`
holds human-owned content, `taskAgentCells` holds agent output, and
`taskArchitecture` holds the mermaid diagrams of the Architecture surface.
Each spec surface owns its own tables inside `taskSpecs` and `taskAgentCells`.

| Surface               | Page component             | Workspace rule               | Status      |
| --------------------- | -------------------------- | ---------------------------- | ----------- |
| Feature specification | `FeatureSpecificationPage` | `rules/workbench-canvas.mdc` | Active      |
| Architecture          | `ArchitecturePage`         | `rules/workbench-canvas.mdc` | Active      |
| UI elements           | `UiElementsPage`           | `rules/workbench-canvas.mdc` | Active      |
| Functional elements   | `FunctionalElementsPage`   | `rules/workbench-canvas.mdc` | Active      |
| Unit tests            | `UnitTestsPage`            | none                         | Placeholder |
| Integration tests     | `IntegrationTestsPage`     | none                         | Placeholder |

Placeholder surfaces have a tab and an Overview card but no content format and
no data keys. Give them a format, tables, and a rule section before agents
write to them.

Feature specification, UI elements, and Functional elements are three tabs
over one task's data set. They render `SpecPage` with different table lists
and share the task's `TaskSpec` (`featureName`, `specColumns`, `specRows`) and
`taskAgentCells[taskId]`, each keyed by table id. They share one rule for the
same reason.

Architecture stores a list of `ArchitectureDiagram` per task in
`taskArchitecture[taskId]`. The canvas never renders mermaid.
`scripts/render-architecture.mjs` turns `source` into `svg` with the npm
package `beautiful-mermaid` and writes `svg`, `renderedSource`, and
`renderError`; the canvas shows `svg` with `dangerouslySetInnerHTML` inside a
wrapper that sets the `--wb-diagram-bg` and `--wb-diagram-fg` variables from
the host theme. The script depends on `package.json`; run `npm install` once
in this repo. The agent behaviour is the Architecture section of
`rules/workbench-canvas.mdc`.

The pre-task top-level keys `featureName`, `specColumns`, `specRows`, and
`agentCells` are read by `useImportLegacySpec`. When `tasks` was never written
and those keys hold content, the canvas creates one task from them. The old
keys stay in the file.

Planned kinds: test coverage catalogue, docs, CI/CD, and kinds the user adds
later. Build a surface only when the user asks.

Every surface has a stable `id`, a title, and a one-line purpose in the
`surfaces` array. The tab bar and the Overview tab render those fields.

Distribution: `scripts/sync-workbench.py`, run by the user hook.
Hook setup and the manual sync command are in `README.md`.
End-user instructions are in `USER-MANUAL.md`.

## Surface contract

Applies to every current and future surface.

- Source lives in this repo. Copies under `~/.cursor/projects/<id>/canvases/`
  are overwrite targets. Never edit them as source.
- `*.canvas.data.json` is per workspace. Never copy it between workspaces.
  Never seed it. The sync script may move a workspace's own data file to a
  new canvas file name.
- Defaults are empty. No demo rows, no sample feature names.
- Old data files must load. Missing keys and short cell arrays read as empty.
- `useCanvasState` keys are a public schema shared by all surfaces in the
  data file. Prefix new keys with the surface, and change a shape only with a
  reader for the old shape.
- UI imports from `cursor/canvas` only. Follow the Cursor canvas skill.
- Human and agent ownership is defined per surface in a section of
  `rules/workbench-canvas.mdc`, the one rule the hook copies into workspaces.
  Do not restate it here.

## Change protocol

Classify the request first.

- New surface: a page component in `workbench.canvas.tsx`, an entry in the
  `surfaces` array, a section in `rules/workbench-canvas.mdc` if agents write
  to it, add a row to the Surfaces table. Do not add unrelated domains to an
  existing surface's tables.
- Existing surface UI or schema: edit that surface's page. Keep the contract.
- Hub UI: edit the hub components at the top of `workbench.canvas.tsx`.
- Agent behaviour inside a product workspace: edit that surface's section in
  `rules/workbench-canvas.mdc`.
- Distribution: edit the sync script, and `README.md` if the command changes.
- One product workspace's content: local data only. Do not change this repo.

Then:

1. Implement in this repo.
2. Update `USER-MANUAL.md` when the change affects usage. See below.
3. Type-check with the TypeScript compiler against the workspace canvases
   `tsconfig.json`. Do not trust `npx tsc`; it resolves to the wrong package.
4. Run the sync script for the workspaces the user names.
5. Tell the user to reopen the canvas with Command Palette: Open Canvas.

## User manual

`USER-MANUAL.md` describes what a user sees and does. Keep it true to the
shipped UI. Update it in the same change when you:

- add, rename, or remove a surface, table, column, button, pill, or input;
- change a keyboard shortcut or an editing behaviour such as `Tab`;
- change how a surface is opened or where its data is stored;
- change what the agent writes or what the user owns.

Do not update it for internal refactors that leave the UI unchanged. Do not
duplicate `README.md` setup steps in the manual; link to them.

## Compatibility checklist

- New tables, columns, or surfaces do not require existing data files to gain
  keys.
- No historical key is removed without a reader for the old name.
- A stored `hubPage` that names no surface opens the Overview tab.
- A stored `hubTask` that names no task opens the first task.
- A fresh workspace opens empty, with no tasks.
